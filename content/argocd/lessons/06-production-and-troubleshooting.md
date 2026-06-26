# Production Patterns and Troubleshooting

> **The one-sentence version:** In production you turn on **self-heal** and **prune** to make reconciliation fully automatic, optionally add **Argo Rollouts** for canary/blue-green deploys, and you debug by reading the two status signals — sync and health — back to their root cause.

## Why it matters

Getting Argo CD running is easy; running it *safely* is the skill. The settings below are the difference between "GitOps that quietly corrects drift and ships gradually" and "GitOps that deletes prod because of a bad path."

## Full auto-reconciliation: self-heal and prune

Lesson 2 introduced `automated` sync. Two flags complete it:

- **selfHeal** — if the live cluster drifts from Git (someone `kubectl edit`s a Deployment), Argo reverts it. The cluster is *forced* to match Git continuously.
- **prune** — if you delete a manifest from Git, Argo deletes the corresponding live resource. Without prune, removed resources linger as orphans.

```yaml
syncPolicy:
  automated: { prune: true, selfHeal: true }
  syncOptions:
    - CreateNamespace=true        # make the target namespace if absent
```

> ⚠️ **Prune is the footgun.** A mistaken change — pointing an Application at the wrong `path`, or an ApplicationSet generator that suddenly returns nothing — can make Argo think every resource was "removed from Git" and **prune them from the cluster**. Mitigations: protect Git with PR review and branch protection, use `PruneLast` and prune-confirmation for risky apps, watch out for empty render outputs, and keep self-heal/prune *off* for the most dangerous cluster-scoped Applications until you trust the pipeline.

## Drift detection as a feature

Even without self-heal, Argo's continuous diff is valuable on its own: it tells you *the moment* live config diverges from Git. That catches manual hotfixes someone forgot to commit, and resources mutated by another controller. "Is prod what we think it is?" becomes a dashboard, not a hope.

## Progressive delivery with Argo Rollouts

A plain Kubernetes Deployment does a rolling update — all-or-nothing-ish, no automated analysis. **Argo Rollouts** (a sibling project) replaces the Deployment with a `Rollout` resource that supports **canary** and **blue-green** strategies with automated checks:

```
  CANARY:  send 5% ──► run analysis (error rate/latency OK?) ──► 25% ──► 50% ──► 100%
                          │ if a metric breaches its threshold
                          ▼
                       auto-rollback to the stable version
```

- **Canary** — shift traffic in steps, running an **AnalysisRun** (querying Prometheus, etc.) between steps; a bad metric triggers automatic rollback.
- **Blue-green** — bring up the new version fully alongside the old, then flip traffic in one switch (with an easy flip back).

> 💡 Argo CD and Argo Rollouts compose cleanly: Argo CD keeps the cluster matching Git, and when that change is a new image, the `Rollout` rolls it out *gradually with analysis* instead of all at once. GitOps decides *what's deployed*; Rollouts decides *how safely it ramps*.

## Troubleshooting: read the two signals

Almost every Argo problem is diagnosed from the **sync** and **health** status (lesson 2). A quick map:

| Symptom | Likely cause | Where to look |
|---|---|---|
| `OutOfSync`, won't converge | Auto-sync off, or sync failing | `argocd app sync`; read the sync result / `argocd app diff` |
| `Synced` but `Degraded` | Git's manifest is bad (crashing image, failing probe) | The workload itself: `oc logs`, `oc describe` (it's an app bug, not Argo) |
| Stuck `Progressing` | Rollout/Pods never become ready | Pod events, readiness probes, resource limits |
| `ComparisonError` / `Unknown` | Bad repo URL, path, revision, or render error | The Application's source fields; repo connectivity |
| Sync hangs at a wave | An earlier **sync wave** never went healthy | The resource in the blocking wave (lesson 4) |
| Hook keeps failing | PreSync/PostSync `Job` errors | The hook Job's logs |

```bash
argocd app get <app>      # sync + health + full resource tree (start here)
argocd app diff <app>     # exactly what differs from Git
argocd app history <app>  # past synced revisions — and the target to roll back to
argocd app rollback <app> <id>   # redeploy a previous good revision
```

> 🔑 The throughline of debugging Argo: **separate "does it match Git?" (sync) from "is it working?" (health), then go to the layer that owns the failing one.** A sync problem is an Argo/Git/render issue; a health problem with `Synced` is an *application* issue you'd debug with `oc` exactly as in the OpenShift troubleshooting lesson.

## Check yourself

1. What do `selfHeal` and `prune` each do, and why is prune the one to be careful with?
2. How do Argo CD and Argo Rollouts divide responsibility in a safe production deploy?
3. An Application is `Synced` but `Degraded`. Is this an Argo problem or an app problem, and where do you debug it?

## Key takeaways

- Production reconciliation = `automated` sync with **selfHeal** (revert drift) and **prune** (delete what's gone from Git); **prune is a footgun** — guard it with PR review, `PruneLast`, and care around empty renders.
- Argo's continuous **drift detection** is valuable even without self-heal — it turns "is prod what we think?" into a live answer.
- **Argo Rollouts** adds **canary/blue-green** with automated analysis and rollback; Argo CD decides *what's deployed*, Rollouts decides *how safely it ramps*.
- Debug by splitting **sync** (Argo/Git/render) from **health** (the app itself); `argocd app get/diff/history/rollback` are the core tools.
