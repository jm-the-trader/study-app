# Branching Strategies & Workflows

Commands are mechanics; a **branching strategy** is the team agreement about *how branches map to your release process*. Picking the right one prevents most "merge hell." This lesson surveys the major strategies and when each fits.

## Why strategy matters

The same Git can support a two-person side project or a thousand-engineer monorepo. The difference is the **convention**: how long branches live, what `main` means, and how code reaches production. The central tension is always:

> 🔑 **Long-lived branches drift apart and produce painful merges; short-lived branches integrate cheaply but demand discipline (and good automation).** Every strategy below is a different answer to that trade-off.

## 1. Trunk-Based Development

Everyone commits to (or merges tiny, short-lived branches into) a single **trunk** (`main`) at least daily. Branches live hours, not weeks. Unfinished work hides behind **feature flags** rather than long branches.

- ✅ Minimal merge pain; continuous integration in the *literal* sense; fast feedback.
- ✅ The model behind elite CI/CD and most high-performing teams (per DORA research).
- ❌ Requires strong automated tests, code review on small PRs, and feature-flag hygiene.
- **Fits:** teams practicing CI/CD, services deployed frequently.

## 2. GitHub Flow

A lightweight, pragmatic default:

1. `main` is always deployable.
2. Branch off `main` for each change (`feature/...`).
3. Open a **Pull Request**; review + CI run on it.
4. Merge to `main`; deploy.

- ✅ Simple, PR-centric, great for web apps with continuous deployment.
- ❌ Has no built-in notion of multiple released versions.
- **Fits:** most SaaS/web teams. A solid starting point if unsure.

## 3. Git Flow

A heavier model with several long-lived branches:

- `main` — production releases (tagged).
- `develop` — integration branch.
- `feature/*` — branch off `develop`.
- `release/*` — stabilize a release.
- `hotfix/*` — urgent fixes off `main`.

- ✅ Structured support for **versioned releases** and parallel maintenance.
- ❌ Heavy; the long-lived `develop` invites big, painful merges. Its own author now suggests simpler flows for continuously-delivered software.
- **Fits:** packaged/versioned software with scheduled releases and multiple supported versions (installed apps, libraries, firmware).

## 4. Release branches (a la carte)

Even on trunk-based/GitHub flow, you can cut a `release/2.4` branch at release time to stabilize and backport fixes, while feature work continues on `main`. This adds versioning support *without* the full Git Flow ceremony.

## Feature flags: decoupling deploy from release

The key technique that makes short-lived branches practical: ship unfinished code **disabled behind a flag**, then turn it on later — independent of deployment.

```js
if (flags.newCheckout) renderNewCheckout()
else renderOldCheckout()
```

> 💡 **Feature flags let you merge to `main` continuously without exposing half-built features.** They decouple *deploy* (code is live) from *release* (feature is visible), enabling trunk-based development, gradual rollouts, A/B tests, and instant kill-switches. The cost is flag lifecycle management — remove stale flags.

## Protecting the mainline

Whatever the strategy, guard the important branch with **branch protection**:

- Require PR review and passing **CI status checks** before merge.
- Disallow force-push to `main`.
- Require branches be **up to date** with `main` before merging (catches integration breakage early).
- Optionally require linear history (enforces squash/rebase merges).

## Choosing

| You are… | Lean toward |
|---|---|
| A web/SaaS team deploying often | **GitHub Flow** → **Trunk-Based** as you mature |
| Practicing real CI/CD with strong tests | **Trunk-Based** + feature flags |
| Shipping versioned/installed software | **Git Flow** or **release branches** |
| Unsure | **GitHub Flow** (simple, hard to misuse) |

## Check yourself

1. What core trade-off do *all* branching strategies attempt to manage?
2. How do feature flags make trunk-based development practical, and what do they decouple?
3. For software with several supported released versions in the field, which strategy fits and why?

## Key takeaways

- A branching **strategy** is a team convention mapping branches to your release process; the eternal trade-off is **long-lived (drift) vs. short-lived (discipline)** branches.
- **GitHub Flow** is a safe default; **Trunk-Based + feature flags** powers high-frequency CI/CD; **Git Flow / release branches** suit versioned, multi-release software.
- **Feature flags** decouple **deploy from release**, enabling continuous merging without exposing unfinished work.
- Enforce the strategy with **branch protection** (required reviews, CI checks, no force-push to `main`).
