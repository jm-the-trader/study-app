# Manifests, Environments, and ApplicationSets

> **The one-sentence version:** Argo CD doesn't care *how* your manifests are produced — plain YAML, Helm, or Kustomize all work — and **ApplicationSets** let you template one Application across many environments or clusters instead of writing each by hand.

## Why it matters

Two questions every team hits immediately: "how do we vary config between dev/staging/prod without copy-pasting YAML?" and "how do we avoid hand-writing 40 nearly-identical Applications?" Render tools answer the first; ApplicationSets answer the second.

## How Argo renders manifests

When Argo CD reads a `path` in your repo, it auto-detects the tooling and renders final Kubernetes YAML:

| Source type | Argo detects | Good for |
|---|---|---|
| **Plain directory** | `.yaml` files | Simple, static manifests |
| **Helm** | `Chart.yaml` | Packaged apps with values-driven config |
| **Kustomize** | `kustomization.yaml` | Base + overlays, no templating language |
| **Config Mgmt Plugin** | configured | Anything else (jsonnet, cdk8s, custom) |

The rendered output is what Argo diffs against the cluster. Crucially, rendering is **deterministic from Git** — the same commit always produces the same manifests, which is what makes GitOps reproducible.

## Managing environments

The two dominant patterns for per-environment differences:

**Kustomize overlays** — a shared `base/` plus thin `overlays/` that patch it:

```
deploy/
├── base/                     # the common manifests
│   ├── deployment.yaml
│   └── kustomization.yaml
└── overlays/
    ├── staging/              # patches: 1 replica, staging URLs
    │   └── kustomization.yaml
    └── prod/                 # patches: 5 replicas, prod URLs
        └── kustomization.yaml
```

Each environment is one Application pointing at its overlay `path`. **Helm** achieves the same with a shared chart plus a `values-staging.yaml` / `values-prod.yaml` per environment.

> 💡 Keep environment differences **small and explicit** — ideally just replica counts, resource sizes, hostnames, and which secrets to reference. If staging and prod diverge in a hundred ways, "it worked in staging" stops meaning anything. Overlays/values files make the *entire* delta reviewable in one place.

## ApplicationSet: one template, many Applications

Writing an Application per environment per app gets out of hand fast. An **ApplicationSet** is a controller that **generates** Applications from a template plus a *generator* that supplies the variations:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: payments-all-envs
spec:
  generators:
    - list:                          # one element per environment
        elements:
          - { env: staging, replicas: "1" }
          - { env: prod,    replicas: "5" }
  template:
    metadata: { name: "payments-{{env}}" }
    spec:
      source:
        repoURL: https://github.com/acme/deploy.git
        path: "apps/payments/overlays/{{env}}"
      destination:
        namespace: "payments-{{env}}"
        server: https://kubernetes.default.svc
```

This one object produces `payments-staging` and `payments-prod`. The power is in the **generators**:

```
   Generator  ──►  feeds variables  ──►  Application template  ──►  N Applications
   ──────────
   list       fixed list of values (envs, regions)
   git        a folder/file per app in a repo  → app auto-onboarded by adding a dir
   cluster    one App per cluster Argo manages  → deploy to the whole fleet
   matrix     combine two generators (every app × every cluster)
```

> 🔑 The **git** and **cluster** generators are the multipliers. With a *git* generator, dropping a new folder in the repo automatically creates its Application — self-service onboarding. With a *cluster* generator, registering a new cluster automatically deploys your platform apps to it. That's how teams run hundreds of apps or dozens of clusters without hand-maintaining a wall of Application YAML.

## Check yourself

1. What are the three main ways Argo renders manifests, and what does "deterministic from Git" buy you?
2. How do Kustomize overlays (or Helm values files) keep environment differences manageable?
3. You onboard new microservices weekly and don't want to hand-write an Application each time. Which ApplicationSet generator helps, and how?

## Key takeaways

- Argo renders **plain YAML, Helm, or Kustomize** (or a plugin) deterministically from a Git commit — same commit, same manifests.
- Manage environments with **Kustomize overlays** or **Helm values files**: a shared base plus small, explicit, reviewable per-env deltas.
- An **ApplicationSet** generates many Applications from one template plus a **generator** (`list`, `git`, `cluster`, `matrix`).
- The **git** generator gives self-service app onboarding (add a folder → get an App); the **cluster** generator deploys across a whole fleet.
