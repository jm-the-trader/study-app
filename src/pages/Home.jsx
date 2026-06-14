import { Link } from 'react-router-dom'
import { TOPICS, ALL_FLASHCARDS } from '../content/loadContent.js'
import { topicLessonProgress, getCardStats } from '../lib/progress.js'
import { encouragement } from '../lib/encouragement.js'

function ProgressBar({ value, total, accent }) {
  const pct = total ? Math.round((value / total) * 100) : 0
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: accent }} />
    </div>
  )
}

function TopicCard({ topic }) {
  const lessons = topicLessonProgress(topic)
  const cards = getCardStats(topic.flashcards)
  return (
    <Link
      to={`/topic/${topic.id}`}
      className="group flex flex-col rounded-2xl border border-white/10 bg-slate-850 p-5 transition hover:-translate-y-0.5 hover:border-white/20 hover:bg-slate-850/80"
    >
      <div className="flex items-start gap-3">
        <span
          className="grid h-12 w-12 shrink-0 place-items-center rounded-xl text-2xl"
          style={{ background: `${topic.accent}22` }}
        >
          {topic.emoji}
        </span>
        <div className="min-w-0">
          <h3 className="font-semibold text-white group-hover:text-brand-soft">{topic.title}</h3>
          <p className="mt-0.5 line-clamp-2 text-sm text-slate-400">{topic.blurb}</p>
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>
            {lessons.read}/{lessons.total} lessons
          </span>
          <span>{cards.total} cards</span>
        </div>
        <ProgressBar value={lessons.read} total={lessons.total} accent={topic.accent} />
      </div>
    </Link>
  )
}

export default function Home() {
  const totalLessons = TOPICS.reduce((n, t) => n + t.lessons.length, 0)
  return (
    <div className="space-y-8">
      <section className="animate-rise rounded-3xl border border-white/10 bg-gradient-to-br from-slate-850 to-slate-950 p-8">
        <p className="text-sm text-brand-soft">{encouragement.welcome()}</p>
        <h1 className="mt-2 text-3xl font-bold text-white sm:text-4xl">What do you want to master today?</h1>
        <p className="mt-3 max-w-2xl text-slate-400">
          Pick a topic to read bite-sized lessons, then lock it in with randomized flashcards that
          resurface exactly when you're about to forget them. No pressure, no streaks you can't keep —
          just steady progress.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            to="/flashcards"
            className="rounded-xl bg-brand px-4 py-2 font-medium text-ink shadow-lg shadow-brand/20 hover:bg-brand-soft"
          >
            🃏 Study all flashcards ({ALL_FLASHCARDS.length})
          </Link>
          <span className="self-center text-sm text-slate-500">
            {TOPICS.length} topics · {totalLessons} lessons
          </span>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Topics</h2>
        {TOPICS.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/15 p-10 text-center text-slate-400">
            No topics yet. Add a folder under <code className="text-accent">/content</code> to get started —
            see <code className="text-accent">content/CONTENT_GUIDE.md</code>.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {TOPICS.map((t) => (
              <TopicCard key={t.id} topic={t} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
