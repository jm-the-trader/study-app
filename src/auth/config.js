// Client-side access gate configuration.
//
// ⚠️ IMPORTANT — this is a DETERRENT, not real security. GitHub Pages is static
// hosting with no server, so the check runs in the browser and a determined
// person could read the content from the bundle. It's enough to keep casual
// visitors out of a personal study site; do NOT put secrets behind it.
//
// The password is never stored — only the SHA-256 hash of it. To set your own
// password, either:
//   (a) set a GitHub Actions repo VARIABLE named VITE_STUDYFORGE_PASSWORD_HASH
//       to the hash (recommended — keeps it out of source), or
//   (b) replace the fallback hash below.
//
// Compute the hash of your chosen password (macOS/Linux):
//   printf '%s' 'your-password' | shasum -a 256 | cut -d' ' -f1
//
// Default fallback below = sha256("changeme"). CHANGE IT.

export const EXPECTED_HASH = (
  import.meta.env.VITE_STUDYFORGE_PASSWORD_HASH ||
  '057ba03d6c44104863dc7361fe4578965d1887360f90a0895882e58a6248fc86'
)
  .trim()
  .toLowerCase()

// Whether a gate is configured at all. (Always true here; kept for clarity.)
export const GATE_ENABLED = Boolean(EXPECTED_HASH)

// localStorage key that remembers an unlocked device so you don't retype on
// every visit (convenient on a phone). Stores the matched hash, so changing the
// password automatically re-locks previously-unlocked devices.
export const UNLOCK_KEY = 'studyforge.unlock.v1'

// Compute the lowercase hex SHA-256 of a string using the Web Crypto API.
// Requires a secure context (https or localhost) — GitHub Pages is https.
export async function sha256Hex(text) {
  const data = new TextEncoder().encode(text)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}
