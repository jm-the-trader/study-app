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
    q.insCard.run(cardId, c.box ?? 1, c.due ?? '', c.seen ?? 0, c.correct ?? 0)
  }
  if (state.streak) q.insMeta.run('streak', JSON.stringify(state.streak))
})

// ---- HTTP API ----
const app = express()
app.use(cors())
app.use(express.json({ limit: '1mb' }))

app.get('/api/health', (_req, res) => res.json({ ok: true, db: DB_PATH }))

app.get('/api/state', (_req, res) => {
  try {
    res.json(readState())
  } catch (err) {
    console.error('GET /api/state failed:', err)
    res.status(500).json({ error: 'failed to read state' })
  }
})

app.put('/api/state', (req, res) => {
  try {
    writeState(req.body || {})
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

app.listen(PORT, () => {
  console.log(`StudyForge API on http://localhost:${PORT}  (db: ${DB_PATH})`)
})
