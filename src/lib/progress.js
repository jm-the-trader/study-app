// Progress + lightweight spaced repetition (Leitner boxes).
//
// Persistence model: the SQLite-backed API (/api/state) is the durable source of
// truth, so progress survives across browsers and machines. localStorage is a
// fast, synchronous local cache + offline fallback. On startup call hydrate() to
// pull the latest from the server; every change writes localStorage immediately
// and pushes the full snapshot back to the server (debounced).

const KEY = 'studyforge.progress.v1'
const API = '/api/state'

// Leitner boxes 1..5. Lower box = seen sooner / more often. A correct answer
// promotes a card up a box; a miss sends it back to box 1 (re-learn).
const BOX_INTERVALS_DAYS = { 1: 0, 2: 1, 3: 3, 4: 7, 5: 16 }

const EMPTY = () => ({ lessonsRead: {}, cards: {}, streak: { count: 0, last: null } })

function readLocal() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return EMPTY()
    const parsed = JSON.parse(raw)
    return {
      lessonsRead: parsed.lessonsRead || {},
      cards: parsed.cards || {},
      streak: parsed.streak || { count: 0, last: null },
    }
  } catch {
    return EMPTY()
  }
}

// In-memory cache keeps reads synchronous (components read it during render).
let cache = readLocal()

// ---- Subscriptions: let the UI re-render after async hydrate / changes ----
const subscribers = new Set()
function notify() {
  for (const cb of subscribers) cb()
}
export function subscribeProgress(cb) {
  subscribers.add(cb)
  return () => subscribers.delete(cb)
}

function load() {
  return cache
}

// Debounced push of the whole snapshot to the durable store.
let pushTimer = null
function pushToServer() {
  if (pushTimer) clearTimeout(pushTimer)
  pushTimer = setTimeout(() => {
    fetch(API, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cache),
    }).catch(() => {
      /* offline or API down — localStorage still holds it; we'll resync later */
    })
  }, 400)
}

function save(state) {
  cache = state
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    /* storage full or unavailable — fail quietly, progress is best-effort */
  }
  pushToServer()
  notify()
}

// Pull durable state from the server on startup and adopt it as the truth.
// Falls back silently to the localStorage cache if the API is unreachable.
export async function hydrate() {
  try {
    const res = await fetch(API)
    if (!res.ok) return
    const server = await res.json()
    cache = {
      lessonsRead: server.lessonsRead || {},
      cards: server.cards || {},
      streak: server.streak || { count: 0, last: null },
    }
    try {
      localStorage.setItem(KEY, JSON.stringify(cache))
    } catch {
      /* ignore cache write failure */
    }
    notify()
  } catch {
    /* API unreachable — keep using the local cache */
  }
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function daysBetween(a, b) {
  return Math.floor((new Date(b) - new Date(a)) / 86400000)
}

// ---- Lessons ----

export function markLessonRead(topicId, slug) {
  const state = load()
  state.lessonsRead[`${topicId}:${slug}`] = todayStr()
  bumpStreak(state)
  save(state)
}

export function isLessonRead(topicId, slug) {
  return Boolean(load().lessonsRead[`${topicId}:${slug}`])
}

export function topicLessonProgress(topic) {
  const state = load()
  const read = topic.lessons.filter((l) => state.lessonsRead[`${topic.id}:${l.slug}`]).length
  return { read, total: topic.lessons.length }
}

// ---- Flashcards (Leitner) ----

function cardState(state, cardId) {
  return state.cards[cardId] || { box: 1, due: todayStr(), seen: 0, correct: 0 }
}

export function isCardDue(cardId) {
  const c = cardState(load(), cardId)
  return daysBetween(c.due, todayStr()) >= 0
}

// Grade a card: 'again' (missed) resets to box 1; 'good'/'easy' promote it.
export function gradeCard(cardId, grade) {
  const state = load()
  const c = cardState(state, cardId)
  c.seen += 1
  if (grade === 'again') {
    c.box = 1
  } else {
    c.correct += 1
    const step = grade === 'easy' ? 2 : 1
    c.box = Math.min(5, c.box + step)
  }
  const interval = BOX_INTERVALS_DAYS[c.box] ?? 0
  const due = new Date()
  due.setDate(due.getDate() + interval)
  c.due = due.toISOString().slice(0, 10)
  state.cards[cardId] = c
  bumpStreak(state)
  save(state)
  return c
}

export function getCardStats(cards) {
  const state = load()
  let due = 0
  let mastered = 0 // box 4+ counts as "sticking"
  for (const card of cards) {
    const c = cardState(state, card.id)
    if (daysBetween(c.due, todayStr()) >= 0) due += 1
    if (c.box >= 4) mastered += 1
  }
  return { due, mastered, total: cards.length }
}

// Order a deck for a session: due-and-lowest-box first, then a stable shuffle of
// the rest. Box weighting means struggling cards resurface more often.
export function orderForSession(cards, { onlyDue = false, shuffle = true } = {}) {
  const state = load()
  let pool = cards.map((card) => ({ card, meta: cardState(state, card.id) }))
  if (onlyDue) {
    pool = pool.filter((p) => daysBetween(p.meta.due, todayStr()) >= 0)
  }
  if (shuffle) {
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[pool[i], pool[j]] = [pool[j], pool[i]]
    }
  }
  // Lower boxes (less learned) bubble to the front, but shuffle breaks ties.
  pool.sort((a, b) => a.meta.box - b.meta.box)
  return pool.map((p) => p.card)
}

// ---- Streak ----

function bumpStreak(state) {
  const today = todayStr()
  const { last, count } = state.streak
  if (last === today) return
  if (last && daysBetween(last, today) === 1) {
    state.streak = { count: count + 1, last: today }
  } else {
    state.streak = { count: 1, last: today }
  }
}

export function getStreak() {
  const { count, last } = load().streak
  if (!last) return 0
  // Streak is only "live" if studied today or yesterday.
  return daysBetween(last, todayStr()) <= 1 ? count : 0
}

export function resetAllProgress() {
  cache = EMPTY()
  localStorage.removeItem(KEY)
  fetch('/api/reset', { method: 'POST' }).catch(() => {})
  notify()
}
