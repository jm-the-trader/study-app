import { useMemo, useState, useCallback } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getTopic, ALL_FLASHCARDS } from '../content/loadContent.js'
import { orderForSession, gradeCard, getCardStats } from '../lib/progress.js'
import { encouragement } from '../lib/encouragement.js'

export default function FlashcardsPage() {
  const { topicId } = useParams()
  const topic = topicId ? getTopic(topicId) : null
  const deck = topicId ? topic?.flashcards || [] : ALL_FLASHCARDS
  const title = topic ? topic.title : 'Everything'

  // Session config chosen on the setup screen.
  const [session, setSession] = useState(null) // { cards, index, results, flipped }

  const startSession = useCallback(
    (onlyDue) => {
      const cards = orderForSession(deck, { onlyDue, shuffle: true })
      if (cards.length === 0) return
      setSession({ cards, index: 0, flipped: false, results: { again: 0, good: 0, easy: 0 }, lastMsg: '' })
    },
    [deck],
  )

  if (deck.length === 0) {
    return (
      <Empty>
        No flashcards here yet.{' '}
        <Link to="/" className="text-brand-soft underline">
          Browse topics
        </Link>
      </Empty>
    )
  }

  if (!session) {
    return <SetupScreen title={title} deck={deck} topicId={topicId} onStart={startSession} />
  }

  if (session.index >= session.cards.length) {
    return <SummaryScreen title={title} session={session} onRestart={() => startSession(false)} topicId={topicId} />
  }

  const card = session.cards[session.index]

  const handleGrade = (grade) => {
    gradeCard(card.id, grade)
    setSession((s) => ({
      ...s,
      index: s.index + 1,
      flipped: false,
      results: { ...s.results, [grade]: s.results[grade] + 1 },
      lastMsg: encouragement.afterGrade(grade),
    }))
  }

  const progress = Math.round((session.index / session.cards.length) * 100)

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex items-center justify-between text-sm text-slate-400">
        <Link to={topicId ? `/topic/${topicId}` : '/'} className="hover:text-slate-200">
          ← Exit session
        </Link>
        <span>
          Card {session.index + 1} of {session.cards.length}
        </span>
      </div>

      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${progress}%` }} />
      </div>

      {session.lastMsg && <p className="text-center text-sm text-brand-soft">{session.lastMsg}</p>}

      <Flashcard
        key={card.id}
        card={card}
        flipped={session.flipped}
        onFlip={() => setSession((s) => ({ ...s, flipped: !s.flipped }))}
      />

      {session.flipped ? (
        <div>
          <p className="mb-2 text-center text-sm text-slate-400">How well did you know it? Be honest — it tunes when this card returns.</p>
          <div className="grid grid-cols-3 gap-3">
            <GradeButton onClick={() => handleGrade('again')} className="bg-rose-500/15 text-rose-300 hover:bg-rose-500/25">
              Again
              <span className="block text-[11px] font-normal opacity-70">show soon</span>
            </GradeButton>
            <GradeButton onClick={() => handleGrade('good')} className="bg-brand/15 text-brand-soft hover:bg-brand/25">
              Good
              <span className="block text-[11px] font-normal opacity-70">got it</span>
            </GradeButton>
            <GradeButton onClick={() => handleGrade('easy')} className="bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25">
              Easy
              <span className="block text-[11px] font-normal opacity-70">too simple</span>
            </GradeButton>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setSession((s) => ({ ...s, flipped: true }))}
          className="w-full rounded-xl bg-white/5 py-3 font-medium text-slate-200 hover:bg-white/10"
        >
          Reveal answer
        </button>
      )}
    </div>
  )
}

function Flashcard({ card, flipped, onFlip }) {
  return (
    <div className="card-3d h-72 w-full cursor-pointer select-none" onClick={onFlip}>
      <div className={`card-inner relative h-full w-full ${flipped ? 'is-flipped' : ''}`}>
        {/* Front — question */}
        <div className="card-face absolute inset-0 flex flex-col rounded-2xl border border-white/10 bg-slate-850 p-6">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Question</span>
          <div className="flex flex-1 items-center justify-center text-center">
            <p className="text-lg font-medium text-white">{card.q}</p>
          </div>
          {card.hint && <p className="text-center text-xs text-slate-500">💡 Hint: {card.hint}</p>}
          <p className="text-center text-xs text-slate-600">tap to flip</p>
        </div>
        {/* Back — answer */}
        <div className="card-face card-back absolute inset-0 flex flex-col overflow-auto rounded-2xl border border-brand/30 bg-gradient-to-br from-slate-850 to-slate-950 p-6">
          <span className="text-xs font-semibold uppercase tracking-wide text-brand-soft">Answer</span>
          <div className="flex flex-1 items-center justify-center text-center">
            <p className="whitespace-pre-line text-base text-slate-100">{card.a}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function GradeButton({ children, className, onClick }) {
  return (
    <button onClick={onClick} className={`rounded-xl py-3 text-center font-semibold transition ${className}`}>
      {children}
    </button>
  )
}

function SetupScreen({ title, deck, topicId, onStart }) {
  const stats = useMemo(() => getCardStats(deck), [deck])
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <Link to={topicId ? `/topic/${topicId}` : '/'} className="text-sm text-slate-400 hover:text-slate-200">
        ← Back
      </Link>
      <div className="animate-rise rounded-3xl border border-white/10 bg-slate-850 p-8 text-center">
        <div className="text-5xl">🃏</div>
        <h1 className="mt-3 text-2xl font-bold text-white">Flashcards · {title}</h1>
        <p className="mt-2 text-slate-400">
          Cards are shuffled fresh each session and the ones you find hard come back sooner. Take it at
          your own pace — there's no wrong speed.
        </p>
        <div className="mt-6 grid grid-cols-3 gap-3 text-center">
          <Stat label="Total" value={stats.total} />
          <Stat label="Due now" value={stats.due} accent="#6ea8fe" />
          <Stat label="Mastered" value={stats.mastered} accent="#86efac" />
        </div>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            onClick={() => onStart(true)}
            disabled={stats.due === 0}
            className="rounded-xl bg-brand px-5 py-2.5 font-medium text-ink shadow-lg shadow-brand/20 hover:bg-brand-soft disabled:cursor-not-allowed disabled:opacity-40"
          >
            Study due cards ({stats.due})
          </button>
          <button
            onClick={() => onStart(false)}
            className="rounded-xl bg-white/5 px-5 py-2.5 font-medium text-slate-200 hover:bg-white/10"
          >
            Study all ({stats.total})
          </button>
        </div>
        {stats.due === 0 && (
          <p className="mt-4 text-sm text-emerald-300">
            🎉 Nothing due right now — you're all caught up. Reviewing all is still great practice.
          </p>
        )}
      </div>
    </div>
  )
}

function SummaryScreen({ title, session, onRestart, topicId }) {
  const { again, good, easy } = session.results
  const total = again + good + easy
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="animate-rise rounded-3xl border border-white/10 bg-slate-850 p-8 text-center">
        <div className="text-5xl">✨</div>
        <h1 className="mt-3 text-2xl font-bold text-white">Session complete</h1>
        <p className="mt-2 text-slate-300">{encouragement.sessionDone()}</p>
        <p className="mt-1 text-sm text-slate-500">
          You reviewed {total} card{total === 1 ? '' : 's'} from {title}.
        </p>
        <div className="mt-6 grid grid-cols-3 gap-3">
          <Stat label="Again" value={again} accent="#fda4af" />
          <Stat label="Good" value={good} accent="#9ec1ff" />
          <Stat label="Easy" value={easy} accent="#86efac" />
        </div>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            onClick={onRestart}
            className="rounded-xl bg-brand px-5 py-2.5 font-medium text-ink hover:bg-brand-soft"
          >
            Study again
          </button>
          <Link
            to={topicId ? `/topic/${topicId}` : '/'}
            className="rounded-xl bg-white/5 px-5 py-2.5 font-medium text-slate-200 hover:bg-white/10"
          >
            Done for now
          </Link>
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value, accent }) {
  return (
    <div className="rounded-xl bg-white/5 p-3">
      <div className="text-2xl font-bold" style={{ color: accent || '#fff' }}>
        {value}
      </div>
      <div className="text-xs text-slate-400">{label}</div>
    </div>
  )
}

function Empty({ children }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/15 p-10 text-center text-slate-400">{children}</div>
  )
}
