# Pods, ReplicaSets & Deployments

These are the objects you'll work with most. They stack: a **Deployment** manages **ReplicaSets**, which manage **Pods**, which wrap your **containers**. Let's build up from the bottom.

## Pods: the smallest deployable unit

A **Pod** is one or more containers that are **always scheduled together** on the same node, sharing a network namespace (same IP, can talk over `localhost`) and able to share volumes.

> 🔑 **You deploy Pods, not containers** — the Pod is Kubernetes' atomic unit. Usually a Pod is *one* app container. A second container appears only as a **sidecar** (a helper alongside the main app — log shipper, proxy, etc.) that must live and die with it.

> ⚠️ **Pods are mortal and disposable.** They get a new IP each time, are never "repaired" in place, and vanish when deleted. **You almost never create a bare Pod** — if its node dies, nothing brings it back. You create a *controller* (a Deployment) that manages Pods for you.

```yaml
apiVersion: v1
kind: Pod
metadata: { name: demo }
spec:
  containers:
    - name: web
      image: nginx:1.27
      ports: [{ containerPort: 80 }]
```

## ReplicaSets: keep N copies alive

A **ReplicaSet** ensures a specified number of identical Pods are running at all times — reconciliation in action: if you want 3 and one dies, it makes another. You rarely create ReplicaSets directly either; **Deployments create them for you**.

## Deployments: the object you actually use

A **Deployment** manages ReplicaSets to give you declarative updates, **rolling upgrades**, and **rollbacks**. This is the standard way to run a stateless app.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata: { name: web }
spec:
  replicas: 3
  selector:
    matchLabels: { app: web }       # which Pods this Deployment owns
  template:                          # the Pod blueprint
    metadata:
      labels: { app: web }           # MUST match the selector
    spec:
      containers:
        - name: web
          image: myregistry/web:1.4.2
          ports: [{ containerPort: 8080 }]
```

```bash
kubectl apply -f web.yaml
kubectl get deploy,rs,pods           # see the Deployment → ReplicaSet → Pods chain
kubectl scale deploy/web --replicas=5
```

### Labels & selectors — the glue of Kubernetes

Objects don't reference each other by name; they're connected by **labels** (key/value tags) and **selectors** (label queries). The Deployment owns the Pods whose labels match its `selector`. Services (next lesson) find Pods the same way.

> 💡 The `selector.matchLabels` **must** match `template.metadata.labels`, or the Deployment won't recognize its own Pods. This mismatch is a classic first-time error.

## Rolling updates (zero-downtime deploys)

Change the image and `apply`. The Deployment creates a **new** ReplicaSet and shifts Pods over **gradually** — bring up some new, take down some old — so the app stays available throughout.

```bash
kubectl set image deploy/web web=myregistry/web:1.5.0   # or just edit YAML + apply
kubectl rollout status deploy/web                       # watch it progress
kubectl rollout history deploy/web
kubectl rollout undo deploy/web                         # ROLL BACK to the previous version
```

You tune the pace with the strategy:

```yaml
spec:
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 1     # at most 1 pod down during the rollout
      maxSurge: 1           # at most 1 extra pod above replicas during rollout
```

> 🔑 A rollout is just reconciliation between **two ReplicaSets**: scale the new up and the old down in steps. Because the old ReplicaSet is kept (scaled to 0), **`rollout undo` is instant** — it scales the old one back up. Keeping deploy history is your safety net.

## DaemonSets, Jobs, StatefulSets (when Deployments aren't right)

- **DaemonSet** — runs one Pod on *every* node (log collectors, node agents, CNI).
- **Job / CronJob** — run a Pod to **completion** (batch task) / on a **schedule** (cron).
- **StatefulSet** — for stateful apps needing **stable identity and storage** (databases): stable Pod names (`db-0`, `db-1`), ordered rollout, and a persistent volume per Pod. (More in the storage lesson.)

| Need | Object |
|---|---|
| Stateless app, N replicas | **Deployment** |
| One Pod per node | **DaemonSet** |
| Run once / on schedule | **Job / CronJob** |
| Stateful app with identity + storage | **StatefulSet** |

## Check yourself

1. Why do you almost never create a bare Pod, and what do you create instead?
2. How does a Deployment know which Pods belong to it?
3. What actually happens during a rolling update, and why is `rollout undo` so fast?

## Key takeaways

- A **Pod** (usually one container, sometimes a sidecar) is the atomic, **disposable** unit; you don't run bare Pods.
- A **Deployment** manages **ReplicaSets** (which keep N Pods alive) and provides declarative **rolling updates** and **rollbacks** — the default for stateless apps.
- **Labels + selectors** wire objects together; the Deployment's selector must match its Pod template's labels.
- Use **DaemonSet** (per-node), **Job/CronJob** (run-to-completion/scheduled), and **StatefulSet** (stateful, stable identity) when a Deployment doesn't fit.
