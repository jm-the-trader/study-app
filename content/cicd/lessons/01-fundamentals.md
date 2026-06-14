# CI/CD Fundamentals

> **The one-sentence version:** CI/CD automates the journey from "I pushed a commit" to "it's safely running in production," so releasing software becomes a routine, low-risk, frequent event instead of a scary manual ritual.

## The problem CI/CD solves

Without automation, shipping software is painful: someone manually merges everyone's work (and discovers it doesn't integrate), runs tests by hand (or skips them), builds artifacts on their laptop ("works on my machine"), and deploys via a checklist at 2 a.m. Releases are rare, big, and risky — and when something breaks, it's hard to know which of the hundred changes did it.

CI/CD replaces that with an **automated pipeline**: every change is automatically built, tested, and (optionally) deployed, the same way every time.

> 🔑 **The core idea: automate every step from commit to production, and run it on every change.** Small changes, integrated continuously and shipped frequently, are dramatically safer than big, rare releases — this is one of the most consistent findings in software delivery research (DORA).

## The three terms (people muddle them)

```
        CI                    CD (Delivery)              CD (Deployment)
 ┌──────────────┐     ┌──────────────────────┐    ┌──────────────────────┐
 │ build + test │ ──► │ + auto-release to a   │ ─► │ + auto-release to    │
 │ every change │     │ deployable state /     │    │ PRODUCTION, no human │
 │              │     │ staging (human OKs prod)│    │ approval step        │
 └──────────────┘     └──────────────────────┘    └──────────────────────┘
```

- **Continuous Integration (CI)** — every commit is automatically **merged, built, and tested**. Goal: catch integration problems and regressions *immediately*, while the change is small and fresh.
- **Continuous Delivery (CD)** — CI **plus** automatically getting every passing change into a **deployable/released state** (e.g. deployed to staging, an artifact ready to ship). Production deploy is a **push-button** decision a human makes.
- **Continuous Deployment (CD)** — goes one step further: every change that passes the pipeline is **automatically released to production**, with **no manual approval**.

> 💡 The two "CD"s differ only by that final step: **Delivery keeps a human in the loop for the prod release; Deployment removes it.** Both require strong automated tests and confidence. Many teams do Continuous *Delivery* (auto to staging, click to prod) and call it "CD."

## What a pipeline looks like

A **pipeline** is the automated sequence a change flows through. A typical one:

```
commit/PR → [ lint ] → [ build ] → [ unit tests ] → [ integration tests ]
          → [ security scan ] → [ package artifact/image ] → [ deploy staging ]
          → [ (approval) ] → [ deploy production ] → [ smoke test / verify ]
```

Each box is a **stage**; a failure stops the pipeline (**fail fast**) so broken changes never reach production. The pipeline is defined as **code** (a YAML file in your repo), versioned and reviewed like everything else.

## Why it matters (the payoffs)

- **Faster feedback** — you learn within minutes if a change broke something, not days later.
- **Smaller, safer releases** — frequent small deploys have tiny blast radius and easy rollback (vs. one giant quarterly release).
- **Repeatability** — the same automated steps every time eliminate "works on my machine" and manual mistakes.
- **A quality gate** — tests, linting, and scans run automatically; bad changes are blocked, not merged on trust.
- **Developer flow** — push and move on; the pipeline does the toil.

## How it ties to the rest of the platform

CI/CD is the connective tissue across topics you've seen:
- It runs your **tests** and **builds container images** (Containers topic), pushing them to a **registry**.
- It deploys to **Kubernetes/OpenShift** (next lessons) and runs **Terraform** plans/applies.
- It enforces **branch protection** and pairs with **trunk-based development + feature flags** (Git topic).
- **GitOps** (Argo CD/Flux) is a CD style where the pipeline updates Git and a controller reconciles the cluster to match.

## Check yourself

1. In one sentence each, distinguish Continuous Integration, Continuous Delivery, and Continuous Deployment.
2. What is the single step that differs between Continuous Delivery and Continuous Deployment?
3. Why are small, frequent releases generally safer than large, rare ones?

## Key takeaways

- **CI/CD automates commit → production** and runs on **every change**, replacing risky manual releases with routine, frequent ones.
- **CI** = auto build + test every change; **Continuous Delivery** = always deployable + human-approved prod release; **Continuous Deployment** = auto release to prod, no approval.
- A **pipeline** is a fail-fast sequence of **stages** defined **as code** in the repo, versioned and reviewed.
- CI/CD is the glue across the platform: it builds **images**, runs **tests/scans**, deploys to **Kubernetes**, and runs **Terraform** — enabling small, safe, fast delivery.
