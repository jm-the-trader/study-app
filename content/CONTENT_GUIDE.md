# Content Authoring Guide

This is the contract and quality bar for StudyForge study material. Whether you're a human or an AI assistant, follow it so new content renders correctly *and* teaches well. The seeded **PKI** and **Nginx** topics are the reference standard — when in doubt, imitate them.

> 🎙️ All learner-facing text uses the StudyForge tutor voice: warm, encouraging, never shaming, and **always accurate**. See [`../ai/TUTOR_PROMPT.md`](../ai/TUTOR_PROMPT.md).

---

## 1. Folder layout

A **topic** is one folder under `content/`:

```
content/<topic-id>/
├── topic.json          (required)  metadata
├── lessons/            (required)  ordered Markdown lessons
│   ├── 01-intro.md
│   ├── 02-….md
│   └── …
├── flashcards.json     (optional)  array of cards
└── interview.json      (optional)  array of mock-interview Q&A
```

- `<topic-id>` is the folder name — lowercase, kebab-case (e.g. `linux-networking`). It becomes the URL slug.
- The app **auto-discovers** topics via `import.meta.glob` in `src/content/loadContent.js`. There's no registry to edit.
- ⚠️ **Restart `npm run dev` after adding/removing files** — Vite resolves the globs at startup.

---

## 2. `topic.json`

```json
{
  "id": "linux-networking",
  "title": "Linux Networking",
  "emoji": "🐧",
  "blurb": "One or two sentences shown on the topic card and header.",
  "accent": "#6ea8fe",
  "order": 3
}
```

| Field | Required | Notes |
|---|---|---|
| `id` | yes | Must equal the folder name. |
| `title` | yes | Display name. |
| `emoji` | recommended | One emoji shown on cards. Defaults to 📘. |
| `blurb` | recommended | Short description (keep under ~140 chars). |
| `accent` | optional | Hex color for the topic's progress bar/badge. Defaults to brand blue. |
| `order` | optional | Sort position on the home page (lower = earlier). Defaults to 100. |

Must be valid JSON (no comments, no trailing commas).

---

## 3. Lessons (`lessons/*.md`)

- **Filename = `NN-slug.md`** — the leading number sets the order (`01`, `02`, …). The slug becomes the URL.
- **The first `# H1` is the lesson title** shown in nav. Put exactly one H1 at the top.
- Standard **GitHub-Flavored Markdown** is supported: headings, lists, tables, blockquotes, fenced code blocks (with language for highlighting), links, bold/italic.
- Reading time is estimated automatically (~200 wpm).

### The lesson shape (follow this)

Every lesson should include, roughly in order:

1. **Title (`#`)** and a one-sentence summary or a `> **The one-sentence version:**` blockquote hook.
2. **Why it matters** — motivate before mechanics.
3. **Core content**, built progressively. Use:
   - **Analogies** for hard/abstract ideas (mark with 🔑 for the key insight).
   - **Tables** to compare options.
   - **Runnable code/command examples** in fenced blocks with a language tag.
   - **Callouts**: `> ⚠️` for gotchas, `> 💡` for tips, `> 🔑` for the central idea.
4. **## Check yourself** — 2–3 questions that test understanding (no answers; they prompt reflection).
5. **## Key takeaways** — a short bullet recap.

Cross-link sibling topics where it helps learning (e.g. Nginx's HTTPS lesson references the PKI topic). Use plain prose references; there's no special link syntax needed between topics.

### Length & depth

Aim for **~600–1,200 words per lesson** — substantial enough to teach a real concept, short enough to finish in one sitting. Split big subjects into multiple lessons rather than one giant page. A topic of **4–8 lessons** is a good target.

---

## 4. Flashcards (`flashcards.json`)

An array of card objects:

```json
[
  {
    "q": "What problem does X solve?",
    "a": "A self-contained answer an examiner would accept.",
    "hint": "Optional nudge shown on the question side.",
    "tags": ["fundamentals"]
  }
]
```

| Field | Required | Notes |
|---|---|---|
| `q` | yes | The question (front). One idea per card. |
| `a` | yes | The answer (back). Complete but concise; `\n` renders as a line break. |
| `hint` | optional | Shown under the question to scaffold recall. |
| `tags` | optional | Free-form labels for future filtering. |

### Flashcard quality bar

- **One idea per card.** If the answer has three unrelated parts, make three cards.
- **Test understanding, not trivia.** Prefer "why/how" and "what's the difference" over rote facts.
- **Self-contained questions.** A card shown in isolation (cards are shuffled!) must make sense without its neighbors.
- **Answers should stand on their own** — enough that a learner can self-grade honestly.
- Aim for **~15–30 cards per topic**, covering each lesson's key takeaways.

---

## 5. Interview questions (`interview.json`)

A topic can also ship a **mock-interview segment** — questions you'd be asked out loud, each with a model answer. It renders as a calm, grouped accordion (read the question, answer aloud, reveal the model answer and compare), separate from the graded flashcard deck.

An array of question objects:

```json
[
  {
    "category": "Fundamentals & CNI",
    "q": "Walk me through what happens when a pod gets its IP.",
    "a": "A complete spoken-style answer. **Markdown is supported** — use bold, bullet lists, tables, and fenced ```code``` blocks for richer answers.",
    "tags": ["cni"]
  }
]
```

| Field | Required | Notes |
|---|---|---|
| `q` | yes | The interview question. |
| `a` | yes | The model answer. **Rendered as Markdown** (GFM), so lists/tables/code work. |
| `category` | recommended | Groups questions into sections (e.g. "Troubleshooting"). Defaults to "General". |
| `tags` | optional | Free-form labels shown as chips. |

### Interview quality bar

- **Answer like a strong candidate would speak** — structured, complete, and explaining the *why*, not just the *what*. It's fine (encouraged) to end an answer with what makes it a good answer.
- **Longer and richer than a flashcard.** Flashcards test one recall; interview answers demonstrate reasoning. Use Markdown structure to keep them readable.
- **Group with `category`** so the page reads like an interview outline (Fundamentals → Architecture → Troubleshooting…).
- Aim for **~10–18 questions per topic**, covering the concepts a real interviewer would probe.

---

## 6. Accuracy obligations (read this twice)

This is teaching material, so correctness is paramount:

- **Verify technical claims** — commands, flags, RFC/standard numbers, version-specific behavior, statistics — before stating them as fact.
- **Never fabricate** a source, citation, command flag, or number. If you can't verify it, don't assert it.
- If something is genuinely uncertain or version-dependent, **say so** in the lesson rather than guessing.
- Keep examples **runnable and correct**. A copy-paste command that fails erodes trust.

---

## 7. Pre-publish checklist

- [ ] `topic.json` is valid JSON with `id` matching the folder name.
- [ ] Lessons are named `NN-slug.md`, each with a single top `# H1`.
- [ ] Each lesson has a hook, progressive content, **Check yourself**, and **Key takeaways**.
- [ ] Code blocks are fenced with a language and are correct/runnable.
- [ ] `flashcards.json` is valid JSON; cards are one-idea, self-contained, accurate.
- [ ] `interview.json` (if present) is valid JSON; answers are structured, accurate, and grouped by `category`.
- [ ] Tone matches the kind tutor voice; nothing is shaming or snarky.
- [ ] All facts verified; no fabricated sources or commands.
- [ ] Ran `npm run dev` and confirmed the topic, every lesson, and the cards render.
