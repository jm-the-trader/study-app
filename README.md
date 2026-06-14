# 🎓 StudyForge

**Learn anything, one card at a time.** A content-driven study app: read bite-sized lessons, then lock the material in with **randomized, spaced-repetition flashcards**. Adding a new subject is as simple as dropping a folder of Markdown + JSON — no app code required, which makes it easy for both humans *and* AI assistants to extend.

> Comes seeded with two complete topics: **PKI & Certificates** and **Nginx**.

---

## Quick start

```bash
cd study-app
npm install
npm run dev          # opens http://localhost:5180
```

Build for production:

```bash
npm run build        # outputs to dist/
npm run preview      # serve the production build locally
```

Requirements: Node 18+ (developed on Node 22).

---

## What's inside

| Feature | Notes |
|---|---|
| 📚 **Topics & lessons** | Markdown lessons with code highlighting, reading-time estimates, prev/next nav, and "read" tracking. |
| 🃏 **Randomized flashcards** | Shuffled every session, with self-grading (**Again / Good / Easy**). |
| 🧠 **Spaced repetition** | A lightweight **Leitner box** system resurfaces hard cards sooner and eases off mastered ones. |
| 🔥 **Streaks & progress** | All stored locally in your browser — nothing leaves your device. |
| 💬 **A kind tutor voice** | Encouraging, never-shaming microcopy throughout. See [`ai/TUTOR_PROMPT.md`](ai/TUTOR_PROMPT.md). |

---

## Project structure

```
study-app/
├── content/                    ← ALL study material lives here
│   ├── CONTENT_GUIDE.md        ← how to author a topic (read this to add content)
│   ├── pki/
│   │   ├── topic.json          ← metadata
│   │   ├── lessons/*.md        ← ordered Markdown lessons (NN-slug.md)
│   │   └── flashcards.json     ← [{ q, a, hint?, tags? }]
│   └── nginx/ …
├── src/
│   ├── content/loadContent.js  ← auto-discovers every topic in /content
│   ├── lib/progress.js         ← Leitner spaced repetition + progress (localStorage)
│   ├── lib/encouragement.js    ← the "nice AI" voice
│   ├── pages/                  ← Home, Topic, Lesson, Flashcards
│   └── App.jsx, main.jsx
├── AGENTS.md                   ← instructions for AI assistants (start here if you're an AI)
├── CLAUDE.md                   ← points Claude Code at AGENTS.md
└── README.md                   ← you are here
```

---

## Adding a new topic (the 60-second version)

1. Create `content/<your-topic>/topic.json`:
   ```json
   { "id": "your-topic", "title": "Your Topic", "emoji": "🚀", "blurb": "One-line description.", "order": 3 }
   ```
2. Add lessons as `content/<your-topic>/lessons/01-intro.md`, `02-….md`, … (the number sets the order; the first `# H1` becomes the title).
3. Add `content/<your-topic>/flashcards.json` — an array of `{ "q": "...", "a": "..." }`.
4. Restart `npm run dev`. Your topic appears automatically.

Full authoring contract and quality bar: **[`content/CONTENT_GUIDE.md`](content/CONTENT_GUIDE.md)**.

---

## AI-ready

This repo is designed to be extended by AI coding assistants. If you're an AI (or pointing one here), read **[`AGENTS.md`](AGENTS.md)** first — it explains the content contract, the tutor tone to preserve, and the guardrails for writing accurate educational material.

---

## Tech

React 18 · Vite 5 · Tailwind CSS 3 · react-markdown + rehype-highlight · react-router. No backend, no database, no telemetry — your progress stays in `localStorage`.
