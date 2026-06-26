# Applications, Sync, and Health

> **The one-sentence version:** The **Application** is Argo CD's core object — it binds a *source* (a Git repo + path) to a *destination* (a cluster + namespace), and Argo reports two independent signals about it: **sync** (does live match Git?) and **health** (are the resources actually working?).

## Why it matters

Almost everything you do in Argo CD is create, read, or debug an Application. And the single most common confusion — "it says Synced but my app is broken!" — dissolves the moment you understand that sync and health are *two different questions*.

## The Application object

An `Application` is itself a Kubernetes custom resource (so, fittingly, you can manage it with GitOps too — lesson 4). Its essence is **source → destination**:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: payments
  namespace: openshift-gitops          # where Argo CD runs
spec:
  project: default
  source:
    repoURL: https://github.com/acme/deploy.git
    targetRevision: main               # branch, tag, or commit SHA
    path: apps/payments/overlays/prod  # folder within the repo
  destination:
    server: https://kubernetes.default.svc   # the cluster (in-cluster here)
    namespace: payments
  syncPolicy:
    automated:                         # omit this block for manual sync
      prune: true                      # delete resources removed from Git
      selfHeal: true                   # revert drift back to Git
```

Read it as a sentence: *"Take the manifests at `path` of `repoURL@targetRevision` and keep them applied to `namespace` on `server`."*

## The reconciliation loop

```
   ┌─────────┐  1. read desired           ┌──────────┐
   │   Git   │ ─────────────────────────► │ Argo CD  │
   └─────────┘                            │          │ 2. render manifests
   ┌─────────┐  3. read live              │ (app     │    (Helm/Kustomize/yaml)
   │ Cluster │ ─────────────────────────► │ ctrl)    │ 4. DIFF desired vs live
   └────▲────┘                            └────┬─────┘
        │       5. if OutOfSync & allowed      │
        └──────────  apply the diff  ◄─────────┘
                 (then re-evaluate health, loop forever)
```

Argo polls Git (and can be nudged instantly by a **webhook**) and re-checks on an interval, so the loop runs continuously — not just once at deploy time.

## Two signals: Sync status vs. Health status

This is the heart of the lesson.

| | **Sync status** | **Health status** |
|---|---|---|
| Question | Does the live cluster **match Git**? | Are the resources **actually working**? |
| Values | `Synced`, `OutOfSync` | `Healthy`, `Progressing`, `Degraded`, `Missing`, `Suspended` |
| Example of mismatch | You committed a change Argo hasn't applied yet → `OutOfSync` | Applied a Deployment whose image crashes → `Synced` **but** `Degraded` |

> 🔑 **`Synced` ≠ `Healthy`.** Sync only means "the cluster matches what's in Git." If Git contains a broken manifest — a bad image, a failing probe — Argo will faithfully apply it and report **`Synced` and `Degraded`** at the same time. Sync is about *fidelity to Git*; health is about *whether the running thing is OK*. Debugging starts with reading **both**.

Argo computes health per resource type with sensible rules (a Deployment is `Healthy` when its rollout completes and Pods are ready; `Progressing` while rolling; `Degraded` on failure) and rolls them up to the Application.

## Manual vs. automated sync

- **Manual sync** (no `automated:` block) — Argo shows `OutOfSync` and *waits* for you to click **Sync** (or `argocd app sync`). Good for production gates.
- **Automated sync** — Argo applies changes itself as soon as Git changes. Add `prune` (delete what's removed from Git) and `selfHeal` (revert live drift) for full reconciliation (covered in lesson 6).

```bash
argocd app get payments        # show sync + health + the resource tree
argocd app sync payments       # trigger a sync now (manual mode)
argocd app diff payments       # what would change vs Git, before syncing
```

## Check yourself

1. What are the two halves of an Application's spec, and how would you read a spec aloud as one sentence?
2. An Application shows `Synced` but the app is down. Explain how both can be true and what you'd look at.
3. What's the practical difference between leaving sync manual and enabling automated sync?

## Key takeaways

- The **Application** CR binds a **source** (`repoURL` + `targetRevision` + `path`) to a **destination** (`server` + `namespace`) — "keep these manifests applied here."
- Argo runs a **continuous loop**: render → diff → (optionally) apply → re-check, nudged by webhooks and polling.
- **Sync status** (`Synced`/`OutOfSync`) asks *does live match Git*; **health status** (`Healthy`/`Progressing`/`Degraded`/…) asks *is it working* — **`Synced` ≠ `Healthy`**.
- Sync is **manual by default** (a production gate) or **automated** with optional **prune** and **selfHeal**.
