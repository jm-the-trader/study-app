# Security Model

StudyForge is a **local, single-user** study app. Its security posture is built around that fact: keep everything on your machine, expose nothing by default, and don't trust the browser.

## Threat model

- The progress API ([`server/index.js`](server/index.js)) stores **low-sensitivity study progress** (which lessons you've read, flashcard boxes, streak) in a local SQLite file. There is **no authentication** — the security boundary is "your own machine," not user accounts.
- The realistic threats we defend against are: (1) another device on your **local network** reaching the API, and (2) a **malicious website** you visit using your browser to read or tamper with the local API.

## Controls in place

| Control | Where | Protects against |
|---|---|---|
| **Loopback-only bind** (`127.0.0.1`) | `app.listen(PORT, HOST)` | Local-network access to the unauthenticated API |
| **CORS allowlist** (no wildcard) | `cors({ origin: ALLOWED_ORIGINS })` | A malicious site reading API responses cross-origin |
| **Origin check on mutations** (PUT/POST → 403 on foreign Origin) | middleware | CSRF-style writes/reset from a visited site |
| **Body validation + clamping** | `PUT /api/state` | Malformed payloads (400) and out-of-range values |
| **Parameterized SQL** (better-sqlite3 prepared statements) | all queries | SQL injection |
| **No DB path in `/api/health`** | health endpoint | Filesystem/username info disclosure |
| **Markdown without raw HTML** (react-markdown, no `rehype-raw`) | `LessonPage` | Stored XSS via lesson content |
| **DB & state gitignored** | `.gitignore` | Committing personal progress / data files |

## Configuration (secure by default)

These environment variables let you relax the defaults **deliberately** — leave them unset for the secure local setup:

| Variable | Default | Notes |
|---|---|---|
| `API_HOST` | `127.0.0.1` | Set to `0.0.0.0` only if you intentionally serve the API on a network interface — **and add your own authentication/reverse proxy first.** |
| `API_PORT` | `5182` | API port. |
| `STUDYFORGE_ALLOWED_ORIGINS` | `http://localhost:5180,http://127.0.0.1:5180` | Comma-separated browser origins allowed to call the API directly (e.g. if you serve the built frontend from a different origin in production). |
| `STUDYFORGE_DB` | `data/studyforge.db` | DB file location. |

## Dependency audit

`npm audit` is **clean (0 vulnerabilities)**. The previous esbuild/Vite dev-server advisory was resolved by upgrading to **Vite 8** (with `@vitejs/plugin-react@6`); a `shell-quote@^1.8.4` override clears the dev-only `concurrently` advisory. Keep this clean by running `npm audit` in CI.

## Known / accepted items

- **No authentication by design:** appropriate for a local single-user tool. If you deploy this for multiple users or on a shared host, add authentication and TLS in front of the API and bind it accordingly.

## Reporting

This is a personal project. If you find a security issue, open an issue (or, for anything sensitive, contact the repository owner directly) rather than filing a public exploit.
