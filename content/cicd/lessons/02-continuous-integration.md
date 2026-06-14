# Continuous Integration in Depth

CI is the foundation everything else builds on — if your integration and tests aren't fast and trustworthy, "continuous deployment" just ships bugs faster. This lesson is about doing CI *well*.

## What CI actually means

The "integration" in CI is literal: developers **merge their work into the shared mainline frequently** (ideally daily), and an automated system **builds and tests** the result on every change. The point is to surface "your code and my code don't work together" within minutes, while both changes are small.

> 🔑 **CI is a practice, not just a tool.** Running a build server is necessary but not sufficient — CI requires developers to integrate small changes *often* into `main`, behind a green build. This is exactly the **trunk-based development** from the Git topic; long-lived branches defeat the "continuous" in CI by delaying integration.

## The CI pipeline stages

A solid CI run, fastest/cheapest checks first (so it **fails fast**):

1. **Lint / format / static analysis** — style and obvious errors (seconds). Fail here before wasting time on tests.
2. **Build / compile** — does it even build? Produce the artifact.
3. **Unit tests** — fast, isolated tests of individual pieces (the bulk of your tests).
4. **Integration tests** — components together (DB, services) — slower, fewer.
5. **(Sometimes) end-to-end tests** — full system; slowest, fewest.
6. **Security & dependency scans** — SAST, vulnerable dependencies (recall `npm audit` from the security work), secret scanning.

> 💡 This ordering reflects the **test pyramid**: many fast **unit** tests at the base, fewer **integration** tests, very few slow **e2e** tests at the top. Inverting it (mostly slow e2e tests) gives flaky, glacial pipelines. Put cheap, high-signal checks first so failures surface in seconds, not after a 20-minute e2e suite.

## What makes CI trustworthy

CI only works if people **trust and act on** the results:

- **Keep the build green.** A red `main` blocks everyone — fixing it is the team's top priority. Don't merge on red.
- **Make it fast.** If CI takes 45 minutes, people batch changes and stop integrating continuously. Aim for minutes via parallelism and caching (below). Fast feedback is the whole point.
- **Eliminate flaky tests.** A test that fails randomly trains people to "just re-run it" — which means they'll ignore *real* failures too. Quarantine and fix flakes aggressively; a flaky suite is worse than a smaller reliable one.
- **Gate merges on CI.** Required status checks (Git topic's branch protection) mean nothing merges to `main` without a green pipeline.

> ⚠️ The deadliest CI anti-pattern is the **ignored pipeline**: slow + flaky → people stop trusting it → failures get rubber-stamped → CI provides false confidence. Speed and reliability aren't nice-to-haves; they're what make CI *mean* something.

## Speed techniques

- **Caching** — cache dependencies (`node_modules`, package downloads, Docker layers) between runs so you don't reinstall the world every time. (Recall Docker layer caching from the Containers topic — same principle.)
- **Parallelism** — run independent jobs (lint, unit, integration) concurrently; split large test suites across runners (sharding).
- **Run only what's needed** — path filters / affected-target detection so a docs change doesn't run the full backend suite (especially in monorepos).
- **Matrix builds** — test across versions/OSes in parallel (e.g. Node 20 and 22) from one definition.

## Artifacts and reproducibility

A CI run should produce a **build artifact** (a binary, a container image, a bundle) **once**, then carry that *same* artifact through later stages and environments — never rebuild per environment.

> 🔑 **Build once, promote the same artifact.** Rebuilding for staging and again for prod means you didn't test what you shipped. Build a versioned, immutable artifact (e.g. an image tagged with the Git SHA — Containers topic) in CI, and promote *that exact artifact* through the pipeline.

## Check yourself

1. Why is CI a *practice* and not just a build server — and which Git workflow does it depend on?
2. What is the test pyramid, and why order pipeline stages cheap-and-fast first?
3. Why are slow and flaky pipelines so dangerous, beyond the obvious annoyance?

## Key takeaways

- **CI = integrate small changes into `main` frequently + auto build/test on every change** (a practice tied to **trunk-based development**), to catch problems while they're small.
- Order stages **fast/cheap first** (lint → build → unit → integration → e2e/scan) following the **test pyramid**, so it **fails fast**.
- CI is only valuable if it's **green, fast, and reliable** — speed (caching, parallelism, path filters) and **no flaky tests** are what make people trust and gate on it.
- **Build the artifact once and promote that same immutable artifact** through environments — never rebuild per stage.
