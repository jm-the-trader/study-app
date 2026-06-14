// StudyForge progress API — a tiny Express + SQLite service that durably stores
// your study progress so it survives across browsers and machines.
//
// The browser keeps localStorage as a fast local cache and treats this service
// as the source of truth: on load it hydrates from here, and on every change it
// pushes the full state back. The DB file lives under data/ and is gitignored.
//
// Run standalone: `npm run dev:api` (or `npm start`). The Vite dev server proxies
// /api/* here (see vite.config.js).

import express from 'express'
import cors from 'cors'
import Database from 'better-sqlite3'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { mkdirSync } from 'node:fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = join(__dirname, '..', 'data')
const DB_PATH = process.env.STUDYFORGE_DB || join(DATA_DIR, 'studyforge.db')
const PORT = process.env.API_PORT || 5182

// Security: bind to loopback only by default so the unauthenticated progress API
// is NOT reachable from the local network. Override (e.g. API_HOST=0.0.0.0) only
// if you deliberately serve it on a network interface and add your own auth.
const HOST = process.env.API_HOST || '127.0.0.1'

// Security: only these browser origins may make cross-origin requests. The app
// normally reaches the API through the Vite same-origin proxy (server-side), so
// no wildcard CORS is needed. Configure for other setups via env (comma-sep).
const ALLOWED_ORIGINS = (
  process.env.STUDYFORGE_ALLOWED_ORIGINS ||
  'http://localhost:5180,http://127.0.0.1:5180'
)
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

// ---- Database setup ----
mkdirSync(DATA_DIR, { recursive: true })
const db = new Database(DB_PATH)
db.pragma('journal_mode = WAL') // better concurrency + durability

db.exec(`
  CREATE TABLE IF NOT EXISTS lessons_read (
    key      TEXT PRIMARY KEY,   -- "<topicId>:<slug>"
    read_at  TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS card_state (
    card_id  TEXT PRIMARY KEY,
    box      INTEGER NOT NULL DEFAULT 1,
    due      TEXT    NOT NULL,
    seen     INTEGER NOT NULL DEFAULT 0,
    correct  INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS meta (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`)

// ---- Prepared statements ----
const q = {
  allLessons: db.prepare('SELECT key, read_at FROM lessons_read'),
  allCards: db.prepare('SELECT card_id, box, due, seen, correct FROM card_state'),
  getMeta: db.prepare('SELECT value FROM meta WHERE key = ?'),
  clearLessons: db.prepare('DELETE FROM lessons_read'),
  clearCards: db.prepare('DELETE FROM card_state'),
  clearMeta: db.prepare('DELETE FROM meta'),
  insLesson: db.prepare('INSERT OR REPLACE INTO lessons_read (key, read_at) VALUES (?, ?)'),
  insCard: db.prepare(
    'INSERT OR REPLACE INTO card_state (card_id, box, due, seen, correct) VALUES (?, ?, ?, ?, ?)',
  ),
  insMeta: db.prepare('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)'),
}

function isPlainObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v)
}

// Coerce an untrusted value to a finite integer within bounds (defends against
// junk/NaN/huge values in the client payload). SQL is already parameterized.
function toInt(v, { min = 0, max = Number.MAX_SAFE_INTEGER, fallback = 0 } = {}) {
  const n = Number(v)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, Math.trunc(n)))
}

function readState() {
  const lessonsRead = {}
  for (const row of q.allLessons.all()) lessonsRead[row.key] = row.read_at

  const cards = {}
  for (const row of q.allCards.all()) {
    cards[row.card_id] = { box: row.box, due: row.due, seen: row.seen, correct: row.correct }
  }

  const streakRow = q.getMeta.get('streak')
  const streak = streakRow ? JSON.parse(streakRow.value) : { count: 0, last: null }

  return { lessonsRead, cards, streak }
}

// Replace the whole state in one transaction. The client always sends the full
// snapshot, so a clean replace keeps the DB exactly in sync and avoids drift.
const writeState = db.transaction((state) => {
  q.clearLessons.run()
  q.clearCards.run()
  q.clearMeta.run()

  for (const [key, readAt] of Object.entries(state.lessonsRead || {})) {
    q.insLesson.run(key, String(readAt))
  }
  for (const [cardId, c] of Object.entries(state.cards || {})) {
    const card = isPlainObject(c) ? c : {}
    q.insCard.run(
      cardId,
      toInt(card.box, { min: 1, max: 5, fallback: 1 }),
      String(card.due ?? ''),
      toInt(card.seen, { fallback: 0 }),
      toInt(card.correct, { fallback: 0 }),
    )
  }
  if (isPlainObject(state.streak)) q.insMeta.run('streak', JSON.stringify(state.streak))
})

// ---- HTTP API ----
const app = express()
app.disable('x-powered-by') // don't advertise Express

// Restrict CORS to known origins (no wildcard). Requests without an Origin
// header (the Vite server-side proxy, curl) are allowed; foreign browser
// origins are rejected so a malicious site can't read API responses.
app.use(cors({ origin: ALLOWED_ORIGINS }))

// CSRF defense: reject state-changing requests that carry a foreign Origin.
// This closes the gap CORS alone leaves for "simple" cross-site POSTs (e.g. a
// malicious page POSTing to /api/reset). Same-origin/no-Origin requests pass.
app.use((req, res, next) => {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return next()
  const origin = req.get('origin')
  if (origin && !ALLOWED_ORIGINS.includes(origin)) {
    return res.status(403).json({ error: 'cross-origin request blocked' })
  }
  next()
})

app.use(express.json({ limit: '1mb' }))

// Health check: do NOT leak the absolute DB path (info disclosure).
app.get('/api/health', (_req, res) => res.json({ ok: true }))

app.get('/api/state', (_req, res) => {
  try {
    res.json(readState())
  } catch (err) {
    console.error('GET /api/state failed:', err)
    res.status(500).json({ error: 'failed to read state' })
  }
})

app.put('/api/state', (req, res) => {
  if (!isPlainObject(req.body)) {
    return res.status(400).json({ error: 'body must be a JSON object' })
  }
  try {
    writeState(req.body)
    res.json({ ok: true })
  } catch (err) {
    console.error('PUT /api/state failed:', err)
    res.status(500).json({ error: 'failed to write state' })
  }
})

app.post('/api/reset', (_req, res) => {
  try {
    writeState({ lessonsRead: {}, cards: {}, streak: { count: 0, last: null } })
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: 'failed to reset' })
  }
})

app.listen(PORT, HOST, () => {
  console.log(`StudyForge API on http://${HOST}:${PORT}  (db: ${DB_PATH})`)
})
