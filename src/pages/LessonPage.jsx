import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { getLesson } from '../content/loadContent.js'
import { markLessonRead } from '../lib/progress.js'

export default function LessonPage() {
  const { topicId, slug } = useParams()
  const data = getLesson(topicId, slug)

  // Scroll to top whenever we move between lessons.
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [topicId, slug])

  if (!data) {
    return (
      <div className="rounded-2xl border border-white/10 bg-slate-850 p-8 text-center text-slate-400">
        Lesson not found.{' '}
        <Link to="/" className="text-brand-soft underline">
          Back to topics
        </Link>
      </div>
    )
  }

  const { topic, lesson, prev, next } = data

  const handleDone = () => {
    markLessonRead(topic.id, lesson.slug)
  }

  return (
    <article className="space-y-8">
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <Link to="/" className="hover:text-slate-200">
          Topics
        </Link>
        <span>/</span>
        <Link to={`/topic/${topic.id}`} className="hover:text-slate-200">
          {topic.title}
        </Link>
      </div>

      <div className="lesson-prose animate-rise max-w-none">
        <Markdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
          {lesson.markdown}
        </Markdown>
      </div>

      <div className="rounded-2xl border border-white/10 bg-slate-850 p-5 text-center">
        <p className="text-slate-300">Finished reading? Mark it done to track your progress.</p>
        <button
          onClick={handleDone}
          className="mt-3 rounded-xl bg-emerald-500/20 px-5 py-2 font-medium text-emerald-300 hover:bg-emerald-500/30"
        >
          ✓ I've read this
        </button>
      </div>

      <nav className="flex items-stretch justify-between gap-3">
        {prev ? (
          <Link
            to={`/topic/${topic.id}/lesson/${prev.slug}`}
            className="flex-1 rounded-xl border border-white/10 bg-slate-850 p-4 transition hover:border-white/20"
          >
            <div className="text-xs text-slate-500">← Previous</div>
            <div className="mt-0.5 font-medium text-white">{prev.title}</div>
          </Link>
        ) : (
          <span className="flex-1" />
        )}
        {next ? (
          <Link
            to={`/topic/${topic.id}/lesson/${next.slug}`}
            className="flex-1 rounded-xl border border-white/10 bg-slate-850 p-4 text-right transition hover:border-white/20"
          >
            <div className="text-xs text-slate-500">Next →</div>
            <div className="mt-0.5 font-medium text-white">{next.title}</div>
          </Link>
        ) : (
          <Link
            to={`/flashcards/${topic.id}`}
            className="flex-1 rounded-xl border border-brand/40 bg-brand/10 p-4 text-right transition hover:bg-brand/20"
          >
            <div className="text-xs text-brand-soft">You finished the topic! 🎉</div>
            <div className="mt-0.5 font-medium text-white">Lock it in with flashcards →</div>
          </Link>
        )}
      </nav>
    </article>
  )
}
