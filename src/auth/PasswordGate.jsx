import { useEffect, useState } from 'react'
import { EXPECTED_HASH, GATE_ENABLED, UNLOCK_KEY, sha256Hex } from './config.js'

// Wraps the app in a lightweight client-side password gate (see config.js for
// the "this is a deterrent, not real security" caveat). Renders children only
// once the correct password has been entered (or a previously-unlocked device
// is remembered).
export default function PasswordGate({ children }) {
  const [unlocked, setUnlocked] = useState(false)
  const [ready, setReady] = useState(false)
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(false)

  // On mount, restore an unlocked device (the stored hash must still match —
  // changing the password re-locks old devices automatically).
  useEffect(() => {
    if (!GATE_ENABLED) {
      setUnlocked(true)
    } else {
      try {
        if (localStorage.getItem(UNLOCK_KEY) === EXPECTED_HASH) setUnlocked(true)
      } catch {
        /* storage unavailable — fall through to the prompt */
      }
    }
    setReady(true)
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setChecking(true)
    setError('')
    try {
      const hash = await sha256Hex(value)
      if (hash === EXPECTED_HASH) {
        try {
          localStorage.setItem(UNLOCK_KEY, EXPECTED_HASH)
        } catch {
          /* ignore — still unlock for this session */
        }
        setUnlocked(true)
      } else {
        setError('Incorrect password. Try again.')
        setValue('')
      }
    } catch {
      // crypto.subtle needs a secure context (https/localhost).
      setError('Secure context required (use https or localhost).')
    } finally {
      setChecking(false)
    }
  }

  if (!ready) return null
  if (unlocked) return children

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm animate-rise rounded-3xl border border-white/10 bg-slate-850 p-8 text-center shadow-2xl"
      >
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-brand to-brand-deep text-2xl shadow-lg shadow-brand/20">
          🎓
        </div>
        <h1 className="mt-4 text-xl font-bold text-white">StudyForge</h1>
        <p className="mt-1 text-sm text-slate-400">Enter the password to continue.</p>

        <input
          type="password"
          inputMode="text"
          autoFocus
          autoComplete="current-password"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Password"
          className="mt-6 w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-center text-white outline-none focus:border-brand"
        />

        {error && <p className="mt-3 text-sm text-rose-300">{error}</p>}

        <button
          type="submit"
          disabled={checking || !value}
          className="mt-5 w-full rounded-xl bg-brand px-4 py-3 font-medium text-ink hover:bg-brand-soft disabled:cursor-not-allowed disabled:opacity-40"
        >
          {checking ? 'Checking…' : 'Unlock'}
        </button>

        <p className="mt-4 text-[11px] leading-relaxed text-slate-500">
          This is a light access gate for a personal study site, not strong security.
        </p>
      </form>
    </div>
  )
}

// Clear the remembered unlock (used by the in-app "Lock" action).
export function lockApp() {
  try {
    localStorage.removeItem(UNLOCK_KEY)
  } catch {
    /* ignore */
  }
  window.location.reload()
}
