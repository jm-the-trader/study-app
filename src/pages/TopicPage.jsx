import { Link, useParams } from 'react-router-dom'
import { getTopic } from '../content/loadContent.js'
import { isLessonRead, getCardStats } from '../lib/progress.js'

export default function TopicPage() {
  const { topicId } = useParams()
  const topic = getTopic(topicId)

  if (!topic) {
    return (
      <div className="rounded-2xl border border-white/10 bg-slate-850 p-8 text-center text-slate-400">
        That topic doesn't exist (yet).{' '}
        <Link to="/" className="text-brand-soft underline">
          Back to topics
        </Link>
      </div>
    )
  }

  const cards = getCardStats(topic.flashcards)

  return (
    <div className="space-y-6">
      <Link to="/" className="text-sm text-slate-400 hover:text-slate-200">
        ← All topics
      </Link>

      <header className="flex flex-wrap items-start gap-4 rounded-2xl border border-white/10 bg-slate-850 p-6">
        <span
          className="grid h-14 w-14 place-items-center rounded-2xl text-3xl"
          style={{ background: `${topic.accent}22` }}
        >
          {topic.emoji}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-white">{topic.title}</h1>
          <p className="mt-1 text-slate-400">{topic.blurb}</p>
        </div>
        {topic.flashcards.length > 0 && (
          <Link
            to={`/flashcards/${topic.id}`}
            className="self-center rounded-xl bg-brand px-4 py-2 font-medium text-ink hover:bg-brand-soft"
          >
            🃏 {cards.due} due · study
          </Link>
        )}
      </header>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
          Lessons ({topic.lessons.length})
        </h2>
        <ol className="space-y-2">
          {topic.lessons.map((lesson, i) => {
            const read = isLessonRead(topic.id, lesson.slug)
            return (
              <li key={lesson.slug}>
                <Link
                  to={`/topic/${topic.id}/lesson/${lesson.slug}`}
                  className="flex items-center gap-4 rounded-xl border border-white/10 bg-slate-850 px-4 py-3 transition hover:border-white/20 hover:bg-slate-850/70"
                >
                  <span
                    className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-semibold ${
                      read ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/5 text-slate-400'
                    }`}
                  >
                    {read ? '✓' : i + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium text-white">{lesson.title}</span>
                    <span className="text-xs text-slate-500">{lesson.minutes} min read</span>
                  </span>
                  <span className="text-slate-500">→</span>
                </Link>
              </li>
            )
          })}
        </ol>
      </section>
    </div>
  )
}
