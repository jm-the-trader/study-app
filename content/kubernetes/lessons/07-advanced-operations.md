# Advanced: Cluster Internals, Scheduling & Security

> **The one-sentence version:** Once you can deploy apps, the next layer is *operating the cluster itself* — protecting its database, controlling exactly where Pods land, locking down who can do what, and extending the API to teach Kubernetes new tricks.

This lesson goes past day-one usage into the parts an administrator owns. You don't need all of it to ship an app, but you do need it to run a cluster you can trust.

## etcd: protect the source of truth

Recall that **etcd** holds the entire cluster state and only the apiserver talks to it. A few facts that matter when you operate it:

- **It's a Raft cluster.** etcd replicates via the Raft consensus algorithm and needs a **quorum** (a majority of members) to accept writes. Run an **odd number** of members — typically **3 or 5** — so a clean majority survives one (or two) failures. 3 members tolerate 1 loss; 5 tolerate 2.
- **Back it up, because losing it loses the cluster.** A snapshot is a point-in-time copy of all objects:

```bash
ETCDCTL_API=3 etcdctl snapshot save snap.db \
  --endpoints=https://127.0.0.1:2379 \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/server.crt \
  --key=/etc/kubernetes/pki/etcd/server.key

ETCDCTL_API=3 etcdctl snapshot restore snap.db   # rebuild a member's data dir
```

> ⚠️ etcd has a default storage quota (historically ~2 GiB). When it fills — often from accumulated history — writes stop and the cluster goes read-only. Regular **`etcdctl defrag`** and compaction keep it healthy. On managed clusters (EKS/GKE/AKS) the provider runs and backs up etcd for you; on self-managed clusters it's your job.

## How the scheduler actually decides

`kube-scheduler` places each unscheduled Pod in **two phases**:

1. **Filtering** — eliminate nodes the Pod *can't* run on (not enough free CPU/memory, taints not tolerated, node selectors/affinity unmet, volume zone mismatch). The survivors are *feasible* nodes.
2. **Scoring** — rank the feasible nodes (spread, resource balance, affinity preferences, image locality) and pick the highest. Ties break randomly.

Modern Kubernetes implements this as the **Scheduling Framework**: a set of plugin extension points (Filter, Score, Bind, …) so behavior is pluggable rather than hard-coded.

### Steering placement

| Tool | Lives on | Effect |
|---|---|---|
| **nodeSelector** | Pod | Hard requirement: only nodes with these labels. |
| **Node affinity** | Pod | Richer rules — `required…` (hard) or `preferred…` (soft, weighted). |
| **Pod (anti-)affinity** | Pod | Place near / away from *other Pods*, relative to a `topologyKey` (e.g. spread replicas across zones). |
| **Taints & tolerations** | Taint on node, toleration on Pod | A taint *repels* Pods; only Pods that **tolerate** it may land. Inverse of selection — the node opts out by default. |
| **Topology spread constraints** | Pod | Cap the imbalance (`maxSkew`) of matching Pods across a topology domain. |

> 🔑 **Affinity is the Pod attracting itself to nodes; a taint is the node repelling Pods.** Use taints to *reserve* nodes (e.g. GPU or control-plane nodes); use affinity/selectors to *request* them. Taint effects: `NoSchedule` (block new Pods), `PreferNoSchedule` (soft), `NoExecute` (also evict Pods already running that don't tolerate it).

**PriorityClass + preemption:** a higher-priority pending Pod can *preempt* (evict) lower-priority Pods to free room. **PodDisruptionBudgets (PDB)** then protect availability during *voluntary* disruptions — a `kubectl drain` or autoscaler scale-down must respect `minAvailable`/`maxUnavailable` so it won't take down too many replicas at once.

## RBAC: who can do what

Authorization in Kubernetes is usually **Role-Based Access Control**. Four object types, two pairs:

- **Role** (namespaced) / **ClusterRole** (cluster-wide) — a list of allowed *verbs* (`get`, `list`, `watch`, `create`, `delete`…) on *resources* (`pods`, `secrets`…).
- **RoleBinding** / **ClusterRoleBinding** — grant a Role/ClusterRole to *subjects*: **users**, **groups**, or **ServiceAccounts**.

Pods authenticate to the API as a **ServiceAccount**. The golden rule is **least privilege**: scope to a namespace with a Role + RoleBinding unless cluster-wide access is genuinely required, and never bind the built-in `cluster-admin` to a workload.

```bash
kubectl auth can-i create deployments -n prod --as=system:serviceaccount:prod:ci
```

## NetworkPolicy beyond the basics

A **NetworkPolicy** is a namespaced firewall for Pod traffic, selecting Pods by label and allowing **Ingress** and/or **Egress** to chosen sources/destinations. Two things trip people up:

- **The model is allow-list.** As soon as *any* policy selects a Pod, everything not explicitly allowed for that direction is denied. A policy with an empty `podSelector` and `policyTypes: [Ingress]` becomes a **default-deny-ingress** for the whole namespace.
- **It only works if your CNI enforces it.** Calico and Cilium do; some plugins (e.g. plain flannel) ignore NetworkPolicy entirely — the objects apply but nothing is blocked. Verify before relying on it for isolation.

## Autoscaling, three ways

| Autoscaler | Scales | Trigger |
|---|---|---|
| **HPA** (HorizontalPodAutoscaler) | replica *count* | metrics (CPU/memory via metrics-server, or custom/external metrics) |
| **VPA** (VerticalPodAutoscaler) | a Pod's *requests/limits* | observed usage (often recommends; applying needs a restart) |
| **Cluster Autoscaler** | *nodes* | unschedulable Pods (scale up) / underused nodes (scale down) |

HPA `autoscaling/v2` supports multiple metrics and a `behavior` block with stabilization windows to damp flapping. HPA and VPA conflict on CPU/memory — don't point both at the same resource.

## Extending Kubernetes: CRDs, operators, admission

- A **CustomResourceDefinition (CRD)** teaches the apiserver a new object kind (e.g. `kind: Database`). On its own it just stores YAML.
- An **Operator** = CRD **+** a custom controller that runs the reconciliation loop for it — encoding the operational knowledge to manage a stateful app (provision, back up, fail over) the Kubernetes way.
- **Admission controllers** run *after* authn/authz but *before* the object is persisted. **Mutating** webhooks can modify the object (inject a sidecar, set defaults); **validating** webhooks can reject it (enforce policy, e.g. "no `:latest` images"). This is the hook policy engines like OPA/Gatekeeper and Kyverno use.

## Check yourself

1. Why must etcd run an odd number of members, and what's the first thing you'd do before a risky cluster upgrade?
2. Distinguish a taint from node affinity — which one is the *node* opting out, and which is the *Pod* opting in?
3. You apply a NetworkPolicy but traffic still flows freely. Name two distinct reasons that could happen.
4. When would you reach for a CRD + operator instead of a Deployment and a Helm chart?

## Key takeaways

- **etcd is the cluster's life** — odd-numbered membership for quorum, regular **snapshots** + defrag; managed clusters do this for you.
- The **scheduler filters then scores**; you steer it with **node/pod affinity, taints/tolerations, topology spread**, and protect availability with **PriorityClasses** and **PodDisruptionBudgets**.
- **RBAC** grants verbs-on-resources to users/groups/**ServiceAccounts** via (Cluster)Roles and bindings — scope to least privilege.
- **NetworkPolicy** is allow-list and **only enforced by a capable CNI** (Calico/Cilium).
- Scale with **HPA** (pods), **VPA** (requests), **Cluster Autoscaler** (nodes); extend the API with **CRDs + operators**, and enforce policy with **mutating/validating admission webhooks**.
