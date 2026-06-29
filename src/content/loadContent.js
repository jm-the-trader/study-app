// Content loader — discovers every topic under /content at build time.
//
// A topic is just a folder containing:
//   topic.json          metadata { id, title, emoji, blurb, order, accent? }
//   lessons/*.md        Markdown lessons (ordered by their NN- filename prefix)
//   flashcards.json     array of { q, a, hint?, tags? }
//   interview.json      array of { q, a, category?, tags? }  (mock interview Q&A)
//
// To add a subject, drop a new folder in /content — no app code changes needed.
// See content/CONTENT_GUIDE.md for the authoring contract.

const topicMetaFiles = import.meta.glob('../../content/*/topic.json', { eager: true })
const flashcardFiles = import.meta.glob('../../content/*/flashcards.json', { eager: true })
const interviewFiles = import.meta.glob('../../content/*/interview.json', { eager: true })
const lessonFiles = import.meta.glob('../../content/*/lessons/*.md', {
  eager: true,
  query: '?raw',
  import: 'default',
})

// Pull the topic folder name out of a glob path: ../../content/<topic>/...
function topicIdFromPath(path) {
  const match = path.match(/content\/([^/]+)\//)
  return match ? match[1] : null
}

// Lessons are ordered by a leading number in the filename, e.g. 02-keys.md
function lessonOrderFromPath(path) {
  const file = path.split('/').pop() || ''
  const match = file.match(/^(\d+)/)
  return match ? parseInt(match[1], 10) : 999
}

// Derive a readable title from the first H1 in the Markdown, falling back to filename.
function titleFromMarkdown(md, fallback) {
  const h1 = md.match(/^#\s+(.+)$/m)
  if (h1) return h1[1].trim()
  return fallback
}

function lessonSlugFromPath(path) {
  const file = path.split('/').pop() || ''
  return file.replace(/\.md$/, '')
}

// Rough reading-time estimate (≈ 200 wpm), shown to set learner expectations.
function readingMinutes(md) {
  const words = md.trim().split(/\s+/).length
  return Math.max(1, Math.round(words / 200))
}

function buildTopics() {
  const topics = {}

  // 1. Seed topics from their metadata files.
  for (const [path, mod] of Object.entries(topicMetaFiles)) {
    const id = topicIdFromPath(path)
    if (!id) continue
    const meta = mod.default || mod
    topics[id] = {
      id,
      title: meta.title || id,
      emoji: meta.emoji || '📘',
      blurb: meta.blurb || '',
      accent: meta.accent || '#6ea8fe',
      order: typeof meta.order === 'number' ? meta.order : 100,
      lessons: [],
      flashcards: [],
      interview: [],
    }
  }

  // 2. Attach lessons.
  for (const [path, md] of Object.entries(lessonFiles)) {
    const id = topicIdFromPath(path)
    if (!id || !topics[id]) continue
    const slug = lessonSlugFromPath(path)
    topics[id].lessons.push({
      slug,
      order: lessonOrderFromPath(path),
      title: titleFromMarkdown(md, slug),
      minutes: readingMinutes(md),
      markdown: md,
    })
  }

  // 3. Attach flashcards.
  for (const [path, mod] of Object.entries(flashcardFiles)) {
    const id = topicIdFromPath(path)
    if (!id || !topics[id]) continue
    const cards = (mod.default || mod || []).map((c, i) => ({
      id: `${id}:${i}`,
      topicId: id,
      ...c,
    }))
    topics[id].flashcards = cards
  }

  // 4. Attach interview questions (mock-interview Q&A — a read/reveal segment).
  for (const [path, mod] of Object.entries(interviewFiles)) {
    const id = topicIdFromPath(path)
    if (!id || !topics[id]) continue
    const questions = (mod.default || mod || []).map((q, i) => ({
      id: `${id}:iv:${i}`,
      topicId: id,
      category: q.category || 'General',
      ...q,
    }))
    topics[id].interview = questions
  }

  // 5. Sort lessons within each topic, then sort topics for display.
  const list = Object.values(topics)
  for (const t of list) {
    t.lessons.sort((a, b) => a.order - b.order)
  }
  list.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title))
  return list
}

export const TOPICS = buildTopics()

export function getTopic(id) {
  return TOPICS.find((t) => t.id === id) || null
}

export function getLesson(topicId, slug) {
  const topic = getTopic(topicId)
  if (!topic) return null
  const index = topic.lessons.findIndex((l) => l.slug === slug)
  if (index === -1) return null
  return {
    topic,
    lesson: topic.lessons[index],
    prev: topic.lessons[index - 1] || null,
    next: topic.lessons[index + 1] || null,
  }
}

// Every flashcard across every topic — used for "study everything" mode.
export const ALL_FLASHCARDS = TOPICS.flatMap((t) => t.flashcards)

// Every interview question across every topic — used for the all-topics drill.
export const ALL_INTERVIEW = TOPICS.flatMap((t) => t.interview)
