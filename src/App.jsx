import { useEffect, useReducer } from 'react'
import { Routes, Route, Link, useLocation } from 'react-router-dom'
import Home from './pages/Home.jsx'
import TopicPage from './pages/TopicPage.jsx'
import LessonPage from './pages/LessonPage.jsx'
import FlashcardsPage from './pages/FlashcardsPage.jsx'
import { getStreak, hydrate, subscribeProgress } from './lib/progress.js'

function Header() {
  const streak = getStreak()
  const { pathname } = useLocation()
  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-ink/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-3">
        <Link to="/" className="flex items-center gap-2.5 group">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand to-brand-deep text-lg shadow-lg shadow-brand/20">
            🎓
          </span>
          <div className="leading-tight">
            <div className="font-bold text-white group-hover:text-brand-soft transition">StudyForge</div>
            <div className="text-[11px] text-slate-400">Learn anything, one card at a time</div>
          </div>
        </Link>
        <nav className="ml-auto flex items-center gap-1 text-sm">
          <Link
            to="/"
            className={`rounded-lg px-3 py-1.5 transition hover:bg-white/5 ${
              pathname === '/' ? 'text-white' : 'text-slate-400'
            }`}
          >
            Topics
          </Link>
          <Link
            to="/flashcards"
            className={`rounded-lg px-3 py-1.5 transition hover:bg-white/5 ${
              pathname.startsWith('/flashcards') ? 'text-white' : 'text-slate-400'
            }`}
          >
            Flashcards
          </Link>
          {streak > 0 && (
            <span
              title="Daily study streak"
              className="ml-2 flex items-center gap-1 rounded-full bg-accent/15 px-2.5 py-1 text-xs font-semibold text-accent"
            >
              🔥 {streak}
            </span>
          )}
        </nav>
      </div>
    </header>
  )
}

export default function App() {
  // Re-render the whole tree whenever progress changes (incl. async hydrate),
  // since pages read the synchronous progress cache during render.
  const [, forceRender] = useReducer((n) => n + 1, 0)
  useEffect(() => {
    const unsub = subscribeProgress(forceRender)
    hydrate() // pull durable state from the SQLite-backed API on startup
    return unsub
  }, [])

  return (
    <div className="min-h-full">
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/topic/:topicId" element={<TopicPage />} />
          <Route path="/topic/:topicId/lesson/:slug" element={<LessonPage />} />
          <Route path="/flashcards" element={<FlashcardsPage />} />
          <Route path="/flashcards/:topicId" element={<FlashcardsPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <footer className="mx-auto max-w-5xl px-4 py-10 text-center text-xs text-slate-500">
        StudyForge · your progress stays private in this browser ·{' '}
        <Link to="/" className="hover:text-slate-300">
          home
        </Link>
      </footer>
    </div>
  )
}

function NotFound() {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-850 p-10 text-center">
      <p className="text-2xl">🧭</p>
      <h1 className="mt-2 text-xl font-semibold text-white">This page wandered off</h1>
      <p className="mt-1 text-slate-400">No problem — let's get you back on track.</p>
      <Link
        to="/"
        className="mt-5 inline-block rounded-lg bg-brand px-4 py-2 font-medium text-ink hover:bg-brand-soft"
      >
        Back to topics
      </Link>
    </div>
  )
}
