# Operators, OLM, and GitOps

> **The one-sentence version:** An Operator is a controller that runs software the way an expert SRE would; the **Operator Lifecycle Manager** installs and upgrades Operators from catalogs, and **GitOps/Pipelines** make Git the source of truth for what runs and how it got built.

Lesson 1 said the OpenShift platform *is* Operators. This lesson is about using that same pattern for *your* workloads and automating delivery on top of it.

## Why it matters

Day 1 (install something) is easy. Day 2 — upgrades, backups, failover, scaling, certificate rotation — is where ops time goes. Operators encode Day-2 knowledge as software so it happens automatically and identically every time, instead of living in a human's head and a wiki page.

## The Operator pattern

An **Operator** = a **Custom Resource Definition (CRD)** + a **controller**.

- The **CRD** extends the Kubernetes API with a new object type — e.g. a `PostgresCluster` resource with fields like `replicas` and `version`.
- The **controller** watches those objects and drives reality to match: provision the database, configure replication, take backups, run upgrades.

```yaml
apiVersion: postgres.example.com/v1
kind: PostgresCluster
metadata: { name: orders-db }
spec:
  replicas: 3
  version: "16"
  backup: { schedule: "0 2 * * *" }     # the Operator runs nightly backups for you
```

> 🔑 You declare the *outcome* you want ("a 3-replica Postgres 16 with nightly backups"); the Operator's controller does the procedural work to get and keep you there — the same reconcile-to-desired-state loop as a Deployment, but for a whole stateful system. This is the **control loop** idea applied to operational expertise.

You build these with the **Operator SDK** (Go, Ansible, or Helm based).

## OLM: installing and upgrading Operators

The **Operator Lifecycle Manager (OLM)** is how Operators themselves get installed and kept current. Its objects:

| Object | Role |
|---|---|
| **CatalogSource** | A catalog of available Operators (e.g. the curated **OperatorHub** in the console) |
| **Subscription** | "Install this Operator and keep it on this update channel" |
| **InstallPlan** | The concrete set of changes a Subscription approves (manual or automatic) |
| **ClusterServiceVersion (CSV)** | The installed Operator's manifest — its version, permissions, and owned CRDs |
| **OperatorGroup** | Which namespaces the Operator watches |

In the console, **OperatorHub** turns "install a database / monitoring stack / service mesh" into a few clicks; under the hood that creates a Subscription and OLM does the rest, including version upgrades along your chosen channel.

## GitOps: Git as the source of truth

**OpenShift GitOps** is Red Hat's supported **Argo CD**. The model inverts traditional CI/CD push deploys:

- Your desired cluster state (manifests, Helm charts, Kustomize) lives in **Git**.
- Argo CD **continuously compares** the cluster to Git and reports drift; it **syncs** (manually or automatically) to make the cluster match.

> 💡 The payoff is that Git becomes the audit log *and* the rollback button: every change is a reviewed commit, and reverting a bad deploy is `git revert`. Nobody runs `oc apply` by hand against prod, so the cluster can't quietly drift away from what's recorded.

## Pipelines: CI in the cluster

**OpenShift Pipelines** is Red Hat's supported **Tekton** — Kubernetes-native CI/CD where each build step runs as a Pod.

- A **Task** is a sequence of steps (each step a container); a **Pipeline** chains Tasks (clone → build → test → image → deploy).
- It's **serverless** (no always-on CI server to babysit) and runs right where your images and clusters live.

A common end-to-end shape: **Pipelines build and push the image (or S2I does), GitOps deploys it.** Tekton handles "how the artifact is made," Argo CD handles "what's running and how it gets there." (See the **CI/CD** topic for the general principles.)

## Check yourself

1. What are the two pieces of an Operator, and which one extends the Kubernetes API?
2. You click "Install" on a database in OperatorHub. Which OLM objects get created, and what keeps the Operator updated afterward?
3. In a GitOps model, how do you roll back a bad deployment, and why is there no config drift?

## Key takeaways

- An **Operator** = **CRD** (new API type) + **controller** (reconciles it), encoding Day-2 ops as software; build them with the **Operator SDK**.
- **OLM** installs/upgrades Operators via **CatalogSource → Subscription → InstallPlan → CSV**, surfaced as **OperatorHub** in the console.
- **OpenShift GitOps (Argo CD)** makes **Git the source of truth**, continuously reconciling the cluster to it — audit and rollback come for free.
- **OpenShift Pipelines (Tekton)** runs Kubernetes-native CI as Pods; the common split is **Pipelines/S2I build, GitOps deploys**.
