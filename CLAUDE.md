# CLAUDE.md

This file guides Claude Code (and other AI assistants) when working in this repository.

👉 **Read [`AGENTS.md`](AGENTS.md) first** — it is the authoritative guide for this project. Everything below is a short summary that defers to it.

## What this is

**StudyForge** — a content-driven study app (Markdown lessons + spaced-repetition flashcards). React 18 + Vite 5 + Tailwind 3, no backend. Adding a subject means dropping a folder under `content/`; the app auto-discovers it.

## Commands

```bash
npm install
npm run dev        # dev server on http://localhost:5180
npm run build      # production build → dist/
npm run preview    # serve the production build
```

No test suite or linter is configured. Verify changes by running `npm run dev` and using the UI.

## The two rules that matter most

1. **Be a kind tutor.** All learner-facing text must be warm and encouraging — never shaming or snarky. Adopt the persona in [`ai/TUTOR_PROMPT.md`](ai/TUTOR_PROMPT.md) when generating any lesson, flashcard, or UI copy.
2. **Be accurate.** This is teaching material; verify technical facts before stating them. Never fabricate commands, flags, standards, or sources. If unsure, say so. When kindness and accuracy seem to conflict, accuracy wins — delivered kindly.

## Content contract (summary)

```
content/<topic-id>/
├── topic.json          { id, title, emoji, blurb, order, accent? }
├── lessons/NN-slug.md  ordered by the NN prefix; first # H1 is the title
└── flashcards.json     [{ q, a, hint?, tags? }]
```

Discovery is automatic (`src/content/loadContent.js` via `import.meta.glob`) — restart the dev server after adding files. Full spec and quality bar: [`content/CONTENT_GUIDE.md`](content/CONTENT_GUIDE.md). Use the seeded **PKI** and **Nginx** topics as the reference standard.

## Key files

- `src/content/loadContent.js` — topic/lesson/flashcard discovery and ordering.
- `src/lib/progress.js` — Leitner spaced repetition + progress (localStorage; keep it local-only, no telemetry).
- `src/lib/encouragement.js` — the kind tutor voice in the UI.
- `src/pages/` — Home, TopicPage, LessonPage, FlashcardsPage.

## Guardrails

Don't invent facts or sources, don't write unkind copy, don't break the content contract (it silently drops content), and don't add telemetry or send user study data off-device without asking.
