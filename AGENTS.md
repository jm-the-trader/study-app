# AGENTS.md — guidance for AI assistants working on StudyForge

Welcome! This file is the entry point for any AI assistant (Claude Code, Cursor, etc.) helping with this project. Read it before making changes. It is intentionally short and concrete.

## What this project is

**StudyForge** is a content-driven study app: Markdown lessons + JSON flashcards with spaced repetition. The whole design goal is that **adding knowledge should not require touching app code** — you add a folder under `content/` and the app discovers it. Most of your work here will be *authoring or improving study content*, occasionally *extending features*.

## The golden rule: be a kind, accurate tutor

StudyForge has a personality — a warm, patient, top-tier educator who never shames a learner for not knowing something. Two obligations follow from this, and they are non-negotiable:

1. **Be kind in everything you write.** Lesson tone, flashcard wording, UI microcopy, error states — all encouraging, never condescending or snarky. The full persona lives in [`ai/TUTOR_PROMPT.md`](ai/TUTOR_PROMPT.md); adopt it whenever you generate learner-facing text. Mistakes are framed as information, not failure.
2. **Be correct, or be honest about uncertainty.** This is *teaching material* — a confident wrong fact is worse here than anywhere else. Verify technical claims (commands, flags, standards, version-specific behavior) before writing them as fact. If you're unsure, say so or leave a clearly-marked `TODO`, rather than inventing. Never fabricate a citation, RFC number, command flag, or statistic.

If those two ever seem to conflict (kind vs. accurate), **accuracy wins** — but deliver it kindly.

## How content works (the contract)

A **topic** is a folder in `content/` containing:

```
content/<topic-id>/
├── topic.json          metadata: { id, title, emoji, blurb, order, accent? }
├── lessons/            ordered Markdown lessons named NN-slug.md (e.g. 03-trust-chains.md)
└── flashcards.json     array of { q, a, hint?, tags? }
```

- Lesson **order** comes from the numeric filename prefix. The lesson **title** is its first `# H1`.
- `loadContent.js` auto-discovers everything via `import.meta.glob` — no registry to update.
- After adding content, the dev server must be restarted (Vite globs are resolved at startup).

The **full authoring spec and quality bar** is in [`content/CONTENT_GUIDE.md`](content/CONTENT_GUIDE.md). Read it before writing a lesson or card. Follow the existing PKI/Nginx topics as the reference standard for depth, structure, and voice.

## Pedagogical standard (what "good" looks like here)

Every lesson should, in roughly this shape:
- Open with a **hook / "why this matters"** and a one-sentence summary.
- Build concepts **progressively**, each leaning on the last; use **analogies** for hard ideas.
- Include **runnable, correct examples** (code/commands) where relevant.
- End with **"Check yourself"** questions and **"Key takeaways."**
- Cross-link related topics when it helps (see how Nginx Lesson 5 references the PKI topic).

Flashcards should test *understanding*, not trivia: one idea per card, a self-contained question, an answer that would satisfy an examiner. Add a `hint` for tricky ones.

## Working on the app code

- Stack: React 18 + Vite 5 + Tailwind 3, react-router, react-markdown + rehype-highlight. No backend.
- Progress/spaced-repetition logic is in `src/lib/progress.js` (Leitner boxes, localStorage). Keep it backend-free and private — **no telemetry, no network calls for user data.**
- Match the existing code style (functional components, Tailwind classes, the warm dark theme tokens in `tailwind.config.js`).
- There is no test suite or linter configured. Verify changes by running `npm run dev` and exercising the UI.

## Guardrails

- ✅ Do: add/improve topics, fix factual errors, polish lessons, add flashcards, improve UX.
- ✅ Do: preserve the kind tutor voice and the privacy-by-default (local-only) model.
- ⚠️ Ask first / be cautious: large dependency additions, introducing a backend, anything that would send user study data off-device.
- ❌ Don't: invent facts, fabricate sources, write shaming/snarky copy, or break the content contract (it'll silently drop content from the UI).

## Quick checklist before you finish

- [ ] New/changed lessons are **factually verified** and follow the lesson shape.
- [ ] Flashcards are one-idea-per-card and accurate.
- [ ] Learner-facing text matches the **kind tutor** voice ([`ai/TUTOR_PROMPT.md`](ai/TUTOR_PROMPT.md)).
- [ ] `topic.json` / `flashcards.json` are valid JSON; lessons use `NN-slug.md` names.
- [ ] You ran `npm run dev` and confirmed the topic/lesson/cards render.
