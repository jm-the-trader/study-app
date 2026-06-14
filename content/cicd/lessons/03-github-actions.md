# Building Pipelines with GitHub Actions

Time to make it concrete. **GitHub Actions** is one of the most common CI/CD systems, and the same building blocks (triggers, jobs, steps, runners, secrets, artifacts) appear in GitLab CI, CircleCI, Jenkins, etc. Learn the model here and it transfers. (You've already seen one in this very project: the Pages deploy workflow.)

## The mental model

```
Workflow (a .yml file in .github/workflows/)
 └─ triggered by an Event (push, pull_request, schedule, manual…)
     └─ runs one or more Jobs (each on a fresh Runner / VM)
         └─ each Job is a sequence of Steps
             └─ a Step runs a shell command OR a reusable Action
```

> 🔑 **Workflow → jobs → steps**, triggered by **events**, each job on a clean **runner**. Jobs run **in parallel** by default (great for speed); use `needs:` to declare order. Each job starts on a **fresh machine**, so anything one job produces for another must be passed explicitly (artifacts/caches).

## A real CI workflow

```yaml
# .github/workflows/ci.yml
name: CI
on:
  push: { branches: [main] }
  pull_request:                      # run on every PR

jobs:
  test:
    runs-on: ubuntu-latest           # the runner
    steps:
      - uses: actions/checkout@v4    # a reusable Action (checks out the code)
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm                 # built-in dependency caching (speed)
      - run: npm ci                  # a shell-command step
      - run: npm run lint
      - run: npm run build
      - run: npm test
```

- **`on:`** — the events. `pull_request` is the key CI trigger: every PR gets validated before merge.
- **`runs-on:`** — the runner (GitHub-hosted Linux/macOS/Windows, or your own **self-hosted** runners for special hardware/network).
- **`uses:`** — a prebuilt **Action** from the marketplace (huge ecosystem: checkout, language setup, cloud auth, deploy).
- **`run:`** — your own commands.

## Matrix builds (test combinations in parallel)

```yaml
jobs:
  test:
    strategy:
      matrix:
        node: [20, 22]               # runs the job once per value, in parallel
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: ${{ matrix.node }} }
      - run: npm ci && npm test
```

## Secrets and variables

Never hardcode credentials in a workflow. GitHub stores them out of source (recall setting the password-hash **variable** for Pages):

- **Secrets** — encrypted, masked in logs (API tokens, deploy keys): `${{ secrets.NPM_TOKEN }}`.
- **Variables** — non-sensitive config, visible: `${{ vars.SOME_FLAG }}`.

```yaml
      - run: ./deploy.sh
        env:
          API_TOKEN: ${{ secrets.API_TOKEN }}
```

> 💡 Use **secrets** for anything that must stay hidden, **variables** for non-sensitive config — and prefer **OIDC** (next-but-one lesson) over long-lived cloud secrets entirely.

## Passing things between jobs: artifacts & caches

Because each job is a fresh machine:

- **Artifacts** (`upload-artifact` / `download-artifact`) — pass *outputs* between jobs or keep them after the run (build bundles, test reports, the `dist/` you saw uploaded for Pages).
- **Caches** (`actions/cache` or built-in `cache:`) — speed up *inputs* (dependencies, build layers) across runs.

```yaml
  build:
    steps:
      - run: npm run build
      - uses: actions/upload-artifact@v4
        with: { name: dist, path: dist }
  deploy:
    needs: build                      # waits for build
    steps:
      - uses: actions/download-artifact@v4
        with: { name: dist }
      - run: ./publish.sh             # deploys the SAME artifact build produced
```

This is "build once, promote the artifact" (last lesson) in YAML.

## A build-and-push-image job (ties to Containers)

```yaml
  image:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: docker/build-push-action@v6
        with:
          push: true
          tags: ghcr.io/acme/app:${{ github.sha }}   # tag with the commit SHA
```

Tagging the image with `github.sha` makes every build traceable to its commit (Containers/registries lesson).

## Useful context & control

- **`${{ github.* }}`** context: `github.sha`, `github.ref`, `github.event_name`, `github.actor` — branch/commit/event info.
- **Conditionals:** `if: github.ref == 'refs/heads/main'` to run a step only on main (e.g. deploy only from main).
- **Environments:** named deploy targets (`environment: production`) that can require **approvals** and hold environment-scoped secrets (next lesson).
- **Manual trigger:** `workflow_dispatch` (the "Run workflow" button — you used it to redeploy Pages).

## Check yourself

1. Explain the workflow → job → step hierarchy and what triggers a workflow.
2. Jobs run on fresh runners — so how do you pass a build output from one job to a later one?
3. When do you use a secret vs. a variable, and where do they come from?

## Key takeaways

- A **workflow** (YAML in `.github/workflows/`) runs on **events** (push, **pull_request**, schedule, manual) → **jobs** (parallel, fresh runners, ordered via `needs:`) → **steps** (`run:` commands or `uses:` Actions).
- Use **matrix** builds for parallel combinations, **secrets** (hidden) vs **variables** (config) for credentials, and **artifacts/caches** to move outputs/inputs between jobs.
- "**Build once, promote the artifact**" maps to upload/download-artifact across `needs:`-linked jobs; tag images with `github.sha` for traceability.
- The same model (events/jobs/steps/runners/secrets/artifacts) transfers to GitLab CI, Jenkins, etc.
