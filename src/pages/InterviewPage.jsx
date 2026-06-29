import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { getTopic, TOPICS, ALL_INTERVIEW } from '../content/loadContent.js'

// Mock-interview segment: a read-and-reveal drill. Unlike flashcards (a graded
// spaced-repetition session), interview questions are meant to be talked through
// out loud, then checked against a model answer — so this is a calm accordion,
// not a timed deck.
export default function InterviewPage() {
  const { topicId } = useParams()
  const topic = topicId ? getTopic(topicId) : null
  const questions = topicId ? topic?.interview || [] : ALL_INTERVIEW
  const title = topic ? topic.title : 'Everything'

  const [revealed, setRevealed] = useState(() => new Set())

  // For the all-topics view, label each question with its source topic.
  const topicById = useMemo(() => Object.fromEntries(TOPICS.map((t) => [t.id, t])), [])

  // Group questions by their category so the page reads like an interview outline.
  const groups = useMemo(() => {
    const map = new Map()
    for (const q of questions) {
      const key = q.category || 'General'
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(q)
    }
    return [...map.entries()]
  }, [questions])

  const allRevealed = questions.length > 0 && revealed.size === questions.length

  const toggleAll = () =>
    setRevealed(allRevealed ? new Set() : new Set(questions.map((q) => q.id)))

  const toggleOne = (id) =>
    setRevealed((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  if (questions.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/15 p-10 text-center text-slate-400">
        No interview questions here yet.{' '}
        <Link to={topicId ? `/topic/${topicId}` : '/'} className="text-brand-soft underline">
          {topicId ? 'Back to topic' : 'Browse topics'}
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link to={topicId ? `/topic/${topicId}` : '/'} className="text-sm text-slate-400 hover:text-slate-200">
        ← {topicId ? 'Back to topic' : 'Home'}
      </Link>

      <header className="animate-rise rounded-3xl border border-white/10 bg-gradient-to-br from-slate-850 to-slate-950 p-7">
        <div className="text-4xl">🎤</div>
        <h1 className="mt-2 text-2xl font-bold text-white">Interview prep · {title}</h1>
        <p className="mt-2 max-w-2xl text-slate-400">
          Read each question, say your answer out loud as if an interviewer were across the table, then
          reveal the model answer and compare. The goal isn't word-for-word recall — it's being able to
          explain the idea clearly under a little pressure.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-3 text-sm">
          <button
            onClick={toggleAll}
            className="rounded-xl bg-white/5 px-4 py-2 font-medium text-slate-200 hover:bg-white/10"
          >
            {allRevealed ? 'Hide all answers' : 'Reveal all answers'}
          </button>
          <span className="text-slate-500">
            {questions.length} question{questions.length === 1 ? '' : 's'} · {groups.length} section
            {groups.length === 1 ? '' : 's'}
          </span>
        </div>
      </header>

      {groups.map(([category, items]) => (
        <section key={category} className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">{category}</h2>
          <ol className="space-y-3">
            {items.map((q, i) => {
              const isOpen = revealed.has(q.id)
              const src = !topicId ? topicById[q.topicId] : null
              return (
                <li
                  key={q.id}
                  className="overflow-hidden rounded-2xl border border-white/10 bg-slate-850"
                >
                  <button
                    onClick={() => toggleOne(q.id)}
                    aria-expanded={isOpen}
                    className="flex w-full items-start gap-3 px-5 py-4 text-left transition hover:bg-white/5"
                  >
                    <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white/5 text-xs font-semibold text-slate-400">
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium text-white">{q.q}</span>
                      <span className="mt-1 flex flex-wrap items-center gap-1.5">
                        {src && (
                          <span className="rounded-full bg-white/5 px-2 py-0.5 text-[11px] text-slate-400">
                            {src.emoji} {src.title}
                          </span>
                        )}
                        {(q.tags || []).map((t) => (
                          <span
                            key={t}
                            className="rounded-full bg-brand/10 px-2 py-0.5 text-[11px] text-brand-soft"
                          >
                            {t}
                          </span>
                        ))}
                      </span>
                    </span>
                    <span className="mt-0.5 shrink-0 text-xs text-slate-500">
                      {isOpen ? 'Hide ▲' : 'Show ▼'}
                    </span>
                  </button>
                  {isOpen && (
                    <div className="border-t border-white/10 bg-slate-950/40 px-5 py-4">
                      <span className="text-xs font-semibold uppercase tracking-wide text-brand-soft">
                        Model answer
                      </span>
                      <div className="lesson-prose mt-2 max-w-none text-[15px]">
                        <Markdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                          {q.a}
                        </Markdown>
                      </div>
                    </div>
                  )}
                </li>
              )
            })}
          </ol>
        </section>
      ))}
    </div>
  )
}
