# 🎓 StudyForge

**Learn anything, one card at a time.** A content-driven study app: read bite-sized lessons, then lock the material in with **randomized, spaced-repetition flashcards**. Adding a new subject is as simple as dropping a folder of Markdown + JSON — no app code required, which makes it easy for both humans *and* AI assistants to extend.

> Comes seeded with ten complete topics — a full **platform-engineering track**: PKI & Certificates · Nginx · Linux & systemd · Git Branching · Containers & Docker · Kubernetes & OpenShift · Terraform & IaC · Observability · ELK / Elastic Stack · Dynatrace.

---

## Quick start

```bash
cd study-app
npm install
npm run dev          # starts the web app (:5180) AND the progress API (:5182)
```

`npm run dev` runs both processes together (via `concurrently`). To run them separately:

```bash
npm run dev:web      # Vite dev server only (:5180)
npm run dev:api      # progress API only (:5182)
```

Build for production:

```bash
npm run build        # outputs to dist/
npm run preview      # serve the production build locally
npm start            # run the progress API (e.g. behind a static host in prod)
```

Requirements: Node 18+ (developed on Node 22). The API uses `better-sqlite3` (a native module compiled on `npm install`).

---

## What's inside

| Feature | Notes |
|---|---|
| 📚 **Topics & lessons** | Markdown lessons with code highlighting, reading-time estimates, prev/next nav, and "read" tracking. |
| 🃏 **Randomized flashcards** | Shuffled every session, with self-grading (**Again / Good / Easy**). |
| 🧠 **Spaced repetition** | A lightweight **Leitner box** system resurfaces hard cards sooner and eases off mastered ones. |
| 🔥 **Streaks & progress** | Persisted to a **local SQLite database** via a tiny API, so progress survives across browsers and machines. localStorage is a fast offline cache; nothing leaves your machine. |
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
│   ├── nginx/  linux/  git/  containers/  kubernetes/
│   └── terraform/  observability/  elk/  dynatrace/
├── server/
│   └── index.js                ← progress API (Express + better-sqlite3)
├── data/                       ← SQLite database lives here (gitignored)
├── src/
│   ├── content/loadContent.js  ← auto-discovers every topic in /content
│   ├── lib/progress.js         ← Leitner spaced repetition; localStorage cache + SQLite sync
│   ├── lib/encouragement.js    ← the "nice AI" voice
│   ├── pages/                  ← Home, Topic, Lesson, Flashcards
│   └── App.jsx, main.jsx
├── AGENTS.md                   ← instructions for AI assistants (start here if you're an AI)
├── CLAUDE.md                   ← points Claude Code at AGENTS.md
└── README.md                   ← you are here
```

### How progress persistence works

The browser keeps a fast `localStorage` cache and treats the SQLite-backed API as the source of truth: on startup it **hydrates** from `GET /api/state`, and every change writes localStorage immediately and pushes the full snapshot to `PUT /api/state` (debounced). The DB file (`data/studyforge.db`) is **gitignored** — your progress is yours and never committed. Vite proxies `/api/*` to the API (port 5182). If the API is down, the app still works from the local cache.

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

**Frontend:** React 18 · Vite 5 · Tailwind CSS 3 · react-markdown + rehype-highlight · react-router.
**Backend:** a tiny Express + better-sqlite3 progress API (no cloud, no telemetry — the SQLite file stays on your machine and is gitignored).
