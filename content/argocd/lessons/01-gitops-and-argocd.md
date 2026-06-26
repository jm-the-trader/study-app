# GitOps and What Argo CD Is

> **The one-sentence version:** Argo CD is a controller that lives *in* your cluster, watches a Git repo of Kubernetes manifests, and continuously makes the cluster match it — so Git becomes the single source of truth for what's running.

Argo CD (the one with the octopus 🐙) is the most widely used GitOps tool, and OpenShift ships it as **OpenShift GitOps**. This topic goes deeper than the OpenShift lessons' overview; start here with *why* GitOps and *what* Argo CD actually does.

## Why it matters

Traditional CD **pushes**: a CI pipeline holds cluster credentials and runs `kubectl apply` from the outside. That works, but the cluster's real state can drift from what's in Git, the pipeline needs powerful cluster access, and "what's actually deployed right now?" has no authoritative answer. GitOps inverts this and fixes all three.

## The four GitOps principles

GitOps (as defined by the OpenGitOps project) rests on four ideas. Desired state is:

1. **Declarative** — you describe the *what*, not a sequence of imperative steps.
2. **Versioned and immutable** — stored in Git, so every change is a commit with history.
3. **Pulled automatically** — an agent *in* the cluster pulls the desired state.
4. **Continuously reconciled** — the agent constantly corrects any drift.

> 🔑 The shift that makes GitOps "click": **Git is the source of truth, and the live cluster is treated as a reconciled copy of it.** Nobody runs `kubectl apply` by hand against prod. You change the cluster by changing Git, and an in-cluster agent converges reality to match — over and over, forever.

## Push CD vs. pull CD

```
   PUSH (traditional CI/CD)              PULL (GitOps / Argo CD)
   ┌──────────┐                          ┌──────────┐  commit
   │   CI     │ holds cluster creds      │   Git    │◄────────── developer
   │ pipeline │                          └────┬─────┘
   └────┬─────┘                               │ Argo CD (inside the
        │ kubectl apply  (outside-in)         │ cluster) PULLS & diffs
        ▼                                      ▼
   ┌──────────┐                          ┌──────────┐
   │ Cluster  │  can drift; no agent     │ Cluster  │  Argo reconciles
   │          │  watching for drift      │ (+Argo)  │  continuously
   └──────────┘                          └──────────┘
```

The pull model's wins:

- **No external credentials.** The agent runs *inside* the cluster and pulls; your CI never needs cluster admin. Smaller blast radius.
- **Drift is detected and (optionally) corrected.** Argo always knows whether live == Git.
- **Git is the audit log and the rollback button.** `git revert` is a rollback; `git log` is "who changed what, when, and why."

## What Argo CD actually is

Argo CD is a set of controllers plus a UI/API that runs in your cluster. Its job loop:

1. Watch one or more **Git repos** (the desired state) and the **live cluster** (the actual state).
2. **Render** the manifests (plain YAML, Helm, or Kustomize — lesson 3) into final Kubernetes objects.
3. **Compare** rendered-desired vs. live, producing a **sync status**: `Synced` or `OutOfSync`.
4. **Sync** (apply the diff) — manually or automatically — and report a **health status** for the resulting resources.

> 💡 Argo CD is **read-mostly and non-destructive by default.** Out of the box it shows you the diff and waits; auto-sync, pruning, and self-heal are opt-in (lesson 6). That's deliberate — you decide how much autonomy to grant it.

It also gives you a live visual map of every application's resources and their health, which doubles as an excellent way to *understand* what a deployment actually creates.

## Argo CD vs. CI tools (they're complementary)

Argo CD is **CD, not CI**. It doesn't build images or run tests — that's a CI system (Tekton, GitHub Actions, Jenkins; see the **CI/CD** topic). The common division of labor:

> **CI builds and pushes the image, then updates a manifest in Git; Argo CD notices the Git change and deploys it.** CI = "make the artifact"; Argo CD = "make the cluster match Git."

## Check yourself

1. State the four GitOps principles in your own words.
2. Give two concrete advantages of pull-based CD over a CI pipeline that runs `kubectl apply`.
3. Where does CI end and Argo CD begin in a typical pipeline?

## Key takeaways

- **GitOps** = desired state that is **declarative, versioned, pulled, and continuously reconciled**; Git is the source of truth and the cluster is a reconciled copy.
- Argo CD uses the **pull model**: an in-cluster agent pulls from Git, so CI needs no cluster credentials, drift is visible, and rollback is `git revert`.
- Argo CD **renders → compares → syncs**, reporting **sync** (`Synced`/`OutOfSync`) and **health** status; auto-sync/prune/self-heal are **opt-in**.
- It's **CD, not CI** — pair it with a build pipeline: CI makes the artifact, Argo CD makes the cluster match Git.
