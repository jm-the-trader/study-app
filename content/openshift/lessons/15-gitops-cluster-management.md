# Managing the Cluster Itself with GitOps

> **The one-sentence version:** On OpenShift almost *everything* — not just your apps, but the cluster's own configuration, operators, and even other clusters — is a Kubernetes object, which means you can put the whole platform in Git and let a controller continuously reconcile it.

Lesson 6 introduced GitOps for *deploying apps*. This lesson is the bigger idea a platform engineer is hired for: **operating the cluster as code**. (The dedicated **Argo CD** topic goes deeper on the tooling; here we focus on the OpenShift angle.)

## Why it matters

Click-ops — configuring a cluster by hand in the console — doesn't scale and isn't reproducible. When a cluster dies, or you need a second identical one, or an auditor asks "who changed the OAuth config and when," manual changes have no answer. GitOps makes the cluster's desired state a reviewed, versioned, restorable artifact.

## "Everything is a CR" — the key realization

OpenShift exposes its own configuration as custom resources you can `oc get`, edit, and therefore commit to Git:

| You want to configure… | The object (a CR you can put in Git) |
|---|---|
| Who can log in | `OAuth`, `Group`, `RoleBinding` |
| Cluster-wide proxy / certs | `Proxy`, `APIServer` config |
| Which Operators are installed | OLM `Subscription` (from the catalog) |
| Node tuning | `MachineConfig`, `MachineSet` |
| Ingress / router behavior | `IngressController` |
| Quotas and guardrails | `ResourceQuota`, `LimitRange`, SCC bindings |

If it's a CR, GitOps can manage it. That turns "configure the cluster" into "commit YAML and let it reconcile."

## The reconciliation loop

**OpenShift GitOps** (the supported Argo CD) runs an agent that closes the loop between Git and the live cluster:

```
   ┌────────────┐   1. you commit a change (reviewed PR)
   │    Git     │◄──────────────────────────────────────┐
   │ (desired)  │                                        │
   └─────┬──────┘                                        │
         │ 2. Argo CD pulls & compares                   │
         ▼                                               │
   ┌────────────┐   3. diff: Synced or OutOfSync?        │
   │  Argo CD   │                                        │ 5. all change
   │ controller │   4. apply → make cluster match Git    │   is a git commit
   └─────┬──────┘                                        │   (audit + revert)
         ▼                                               │
   ┌────────────┐   6. someone hand-edits live? ─────────┘
   │  Cluster   │      self-heal reverts it back to Git
   │  (actual)  │
   └────────────┘
```

> 🔑 **Git is the source of truth; the cluster is a read-replica of it.** The controller continuously compares the two and, with *self-heal* on, undoes any drift — including a well-meaning 2 a.m. console edit. Your rollback button becomes `git revert`, and your audit log becomes `git log`. This is the difference between a cluster you *configured once* and one you can *rebuild on demand*.

## App-of-apps: bootstrapping a whole cluster

You don't want to register dozens of configs by hand. The **app-of-apps** pattern uses one root Argo CD `Application` that points at a Git folder of *other* Applications — operators, cluster config, platform services, and your workloads. Apply the root once and the cluster pulls in everything else itself. A fresh cluster goes from bare to fully configured by pointing Argo CD at one repo.

## Fleet management: many clusters

When you run *many* clusters, **Red Hat Advanced Cluster Management (RHACM)** adds a **hub-and-spoke** model on top:

```
                 ┌──────────── RHACM hub ────────────┐
                 │  Policies (governance)             │
                 │  Placement (which clusters)        │
                 │  GitOps / Subscriptions            │
                 └───┬───────────┬───────────┬────────┘
                     ▼           ▼           ▼
                 cluster A    cluster B    cluster C   (managed "spokes")
            apply the SAME policy & apps across the whole fleet
```

RHACM **Policies** express "every cluster must have X" (an SCC, a log-forwarder, a required operator) and report/remediate compliance across the fleet — GitOps scaled from one cluster to dozens.

> 💡 The progression to remember: **one app in Git → whole cluster in Git (app-of-apps) → whole *fleet* in Git (RHACM policies)**. Same principle (declare desired state, reconcile continuously) at three scales.

## Check yourself

1. Why does "everything is a CR" make cluster-wide GitOps possible? Give two examples of cluster config you'd commit to Git.
2. Someone fixes an incident by editing a resource live in the console. With GitOps self-heal on, what happens — and why is that good?
3. What does the app-of-apps pattern let you do that registering each Application by hand does not?

## Key takeaways

- OpenShift exposes its own configuration as **custom resources**, so the whole platform — auth, operators, node config, ingress, quotas — can live in **Git**.
- **OpenShift GitOps (Argo CD)** continuously reconciles cluster ⇆ Git; **self-heal** reverts manual drift, making `git revert` your rollback and `git log` your audit trail.
- **App-of-apps** bootstraps an entire cluster from one root Application pointing at a repo of Applications.
- **RHACM** scales the same idea to a **fleet** via a hub-and-spoke model with **Policies** that enforce and report compliance across many clusters.
