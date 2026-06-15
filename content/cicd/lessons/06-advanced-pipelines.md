# Advanced: Pipelines at Scale, Provenance & Progressive Delivery

> **The one-sentence version:** Beyond "tests run on push," mature delivery means *reusable* pipeline code, *trustworthy* runners and artifacts, and rollouts that *prove* a release is healthy before it reaches everyone.

You already know the fundamentals, GitHub Actions, deployment strategies, and pipeline security basics. This lesson is about the practices that separate a hobby pipeline from one a platform team operates for dozens of services.

## Don't repeat yourself: reusable workflows

Copy-pasting the same 80-line workflow into 30 repos means 30 places to fix a bug. GitHub Actions gives you two reuse mechanisms — know which is which:

| Mechanism | What it is | Use for |
|---|---|---|
| **Composite action** | Bundles several *steps* into one action you call with `uses:` | Reusable *step* logic (e.g. "setup + cache + build") |
| **Reusable workflow** | A whole workflow called from another via `workflow_call` | Reusable *jobs/pipelines* (e.g. a standard "build-test-scan" pipeline) |

```yaml
# caller repo — .github/workflows/ci.yml
jobs:
  ci:
    uses: my-org/.github/.github/workflows/standard-ci.yml@v2
    with: { node-version: '20' }
    secrets: inherit
```

> 💡 Pin third-party actions to a **full commit SHA**, not a moving tag like `@v4`. A tag can be re-pointed at malicious code; a SHA can't. This is a supply-chain control, not pedantry.

## Runners: hosted, self-hosted, ephemeral

Hosted runners are convenient but can't reach private networks and meter by the minute. **Self-hosted runners** give you private-network access, custom hardware (GPUs, big caches), and cost control — at the price of patching and isolation.

> ⚠️ A *persistent* self-hosted runner that builds untrusted PRs is dangerous: one job can poison the next (leftover files, cached creds). The fix is **ephemeral runners** — a fresh, single-use VM/pod per job (e.g. Actions Runner Controller on Kubernetes). One job, one clean machine, then destroyed.

## Make builds fast *and* deterministic

- **Concurrency control** cancels superseded runs so you don't waste minutes on stale commits:

```yaml
concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true
```

- **Caching** dependencies and build layers is the biggest speed lever (see the Containers topic for BuildKit cache mounts). Cache keyed on a lockfile hash; restore-keys for partial hits.
- **Dynamic matrices** — generate the test matrix from a JSON output of a prior job so it scales with the codebase instead of being hard-coded.

## Provenance: prove *what* you shipped and *how*

Security basics covered secrets and OIDC. The frontier is **artifact integrity** — answering "was this exact binary built from this exact source by my pipeline, untampered?"

- **SBOM** (Software Bill of Materials) — a manifest of every dependency in the artifact (CycloneDX/SPDX), so you can answer "are we affected by CVE-X?" in seconds.
- **Signing & attestation** — tools like **cosign** (Sigstore) sign images/artifacts and attach signed *attestations* (e.g. the SBOM, the build provenance). Verify the signature at deploy time; reject unsigned artifacts.
- **SLSA** is the framework that grades how tamper-resistant your build is (higher levels require hermetic, provenance-generating builds). Keyless signing via OIDC means no long-lived signing key to leak.

> 🔑 The mental shift: a pipeline doesn't just *produce* an artifact, it *vouches* for it. Downstream, you trust the artifact because you can cryptographically verify the chain from source → build → signature.

## Progressive delivery: let data gate the rollout

Plain canary/blue-green (earlier lesson) is *manual* — a human watches and promotes. **Progressive delivery** automates the judgment:

- Tools like **Argo Rollouts** or **Flagger** shift a small % of traffic to the new version, **automatically query metrics** (error rate, latency, custom SLIs from Prometheus), and **promote or roll back** based on thresholds — no human in the loop for the happy path.
- Pair with **feature flags** to decouple *deploy* (code is live but dark) from *release* (flag turned on), enabling instant rollback without a redeploy.

## Measure the system: DORA metrics

You can't improve what you don't measure. The **four DORA metrics** are the industry standard for delivery performance:

| Metric | Question |
|---|---|
| **Deployment frequency** | How often do you ship? |
| **Lead time for changes** | Commit → production, how long? |
| **Change failure rate** | What % of deploys cause a problem? |
| **Time to restore service** | How fast do you recover from one? |

The first two measure *throughput*; the last two measure *stability*. Healthy teams improve both together — speed without stability is just faster breakage.

## Check yourself

1. When would you use a composite action versus a reusable workflow?
2. Why is an *ephemeral* self-hosted runner safer than a persistent one for building pull requests?
3. What question does an SBOM let you answer quickly, and what does cosign add on top?
4. How does progressive delivery differ from a manually-promoted canary, and what does it need to work?

## Key takeaways

- Reuse pipeline code with **composite actions** (steps) and **reusable workflows** (jobs); **pin actions to SHAs**.
- Prefer **ephemeral self-hosted runners** for untrusted builds; isolate one job per machine.
- Speed up with **concurrency cancellation**, **caching**, and **dynamic matrices** — without sacrificing determinism.
- Establish **artifact provenance**: SBOMs, **cosign** signing/attestations, and the **SLSA** framework — the pipeline vouches for what it ships.
- Automate rollouts with **progressive delivery** (Argo Rollouts/Flagger) gated on metrics, and **decouple deploy from release** with feature flags.
- Track delivery health with the **four DORA metrics** — balancing throughput and stability.
