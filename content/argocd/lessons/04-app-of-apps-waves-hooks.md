# App-of-Apps, Sync Waves, and Hooks

> **The one-sentence version:** An Application can deploy *other* Applications (app-of-apps), **sync waves** order *what applies before what*, and **hooks** run jobs at specific points in a sync — together they let you bootstrap and sequence a whole environment from one click.

## Why it matters

Real deployments aren't a flat pile of YAML applied in random order. The database operator must exist before the database; the schema migration must run before the new app version starts; namespaces must exist before things go in them. These three features give you that ordering and composition.

## App-of-apps: one root to rule them all

Since an `Application` is just a Kubernetes object, you can have an Application whose Git path contains... more Applications. That **root** app is the single thing you register; it pulls in all the children.

```
        register ONCE
            │
            ▼
      ┌───────────┐  root Application
      │   root    │  (path: clusters/prod/)
      └─────┬─────┘
            │ contains child Application manifests
   ┌────────┼─────────┬───────────┬──────────┐
   ▼        ▼         ▼           ▼          ▼
 namespaces  operators  cluster-config  monitoring  workloads
 (each is its own Application Argo manages)
```

> 🔑 **App-of-apps turns "set up a cluster" into "apply one Application."** Point the root at a folder of child Applications and Argo onboards them all; a brand-new cluster bootstraps itself from one repo. (An ApplicationSet from lesson 3 is often a cleaner alternative for the *generated* cases — many similar apps — while app-of-apps shines for a *curated*, hand-picked set with ordering between them.)

## Sync waves: ordering within a sync

By default Argo applies a sync's resources together. A **sync wave** imposes order: resources (or whole Applications) with a lower wave number apply and become healthy *before* the next wave starts.

```yaml
metadata:
  annotations:
    argocd.argoproj.io/sync-wave: "1"     # lower runs first; default is 0; negatives allowed
```

```
 wave -1        wave 0            wave 1             wave 2
 ───────        ──────            ──────             ──────
 Namespace  ►   CRDs / Operators  ►  Database  ►     App Deployment
 (exists    │   (API types ready  │  (storage    │  (only starts once
  first)    │    before use)      │   ready)     │   its deps are healthy)
```

> 💡 The classic use: install a CRD/operator in an early wave so the **custom resource** that depends on it doesn't fail with "no matches for kind" in a later wave. Argo waits for each wave to report **healthy** before starting the next — so waves encode real dependency order, not just "apply sequence."

## Hooks: run a job at a point in the sync

A **resource hook** is a Kubernetes resource (usually a `Job`) annotated to run at a phase of the sync rather than being a permanent part of the app:

| Hook phase | Runs… | Typical use |
|---|---|---|
| **PreSync** | before the sync applies | **database schema migration** |
| **Sync** | during the sync | custom apply logic |
| **PostSync** | after all resources are healthy | smoke test, cache warm, notification |
| **SyncFail** | when the sync fails | alert, cleanup/rollback step |

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: db-migrate
  annotations:
    argocd.argoproj.io/hook: PreSync                    # run before the app updates
    argocd.argoproj.io/hook-delete-policy: HookSucceeded # tidy up the Job after success
spec:
  template:
    spec:
      restartPolicy: Never
      containers: [{ name: migrate, image: acme/migrator:1.4, command: ["./migrate"] }]
```

> ⚠️ The **PreSync migration** is the canonical example: you must migrate the database schema *before* the new app version rolls out, or the new code hits an old schema. A PreSync hook guarantees that ordering — and if the migration `Job` fails, the sync stops, so a broken migration doesn't take your app with it.

## Putting it together

A production sync of one service often combines all three: an **app-of-apps** (or ApplicationSet) brings the service in, **sync waves** ensure its namespace and operators exist first, and a **PreSync hook** migrates the database before the Deployment in the final wave rolls out.

## Check yourself

1. When would you choose app-of-apps over an ApplicationSet, and vice versa?
2. You apply a custom resource and get "no matches for kind" because its CRD isn't installed yet. Which feature fixes the ordering, and how?
3. Why is a database migration a `PreSync` hook rather than a normal manifest, and what happens if it fails?

## Key takeaways

- **App-of-apps** is a root Application that deploys child Applications — register one thing, bootstrap a whole environment (great for a curated, ordered set; ApplicationSets suit generated, repetitive sets).
- **Sync waves** (`sync-wave` annotation, low number first) enforce dependency order *within* a sync, waiting for each wave to be **healthy** before the next.
- **Hooks** run resources (usually Jobs) at **PreSync / Sync / PostSync / SyncFail** — the canonical case is a **PreSync DB migration**, whose failure safely halts the sync.
