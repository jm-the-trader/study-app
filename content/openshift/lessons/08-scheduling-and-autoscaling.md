# Advanced Scheduling and Autoscaling

> **The one-sentence version:** Scheduling decides *which node* a Pod lands on, and autoscaling decides *how many* Pods and nodes you have — and on a real cluster you shape both deliberately instead of leaving them to defaults.

The basics (a Deployment with `replicas: 3`) get you running. This lesson is the Day-2 control you're expected to know for a platform role: steering Pods onto the right nodes and letting the cluster grow and shrink itself.

## Why it matters

Defaults spread Pods "well enough" until they don't: all three replicas land on one node that then dies, a GPU job schedules onto a CPU node, or traffic doubles and nothing scales. Scheduling controls and the four autoscalers are how you turn "it happened to work" into "it's designed to."

## Steering Pods onto nodes

The scheduler places each Pod on a feasible node by default. Five tools override that:

| Tool | Direction | What it expresses |
|---|---|---|
| **nodeSelector** | Pod → node | Hard "only on nodes with this label" (simple) |
| **Node affinity** | Pod → node | Like nodeSelector but with `required` vs `preferred` and richer operators |
| **Pod (anti-)affinity** | Pod → Pod | "Place near / away from *these other Pods*" |
| **Taints & tolerations** | Node → Pod | A node **repels** Pods unless they tolerate the taint |
| **Topology spread** | Pod → zones | Spread replicas evenly across zones/nodes |

The mental model that keeps these straight:

```
 Taint/Toleration: the NODE pushes Pods away
   node: "tainted gpu=true:NoSchedule"  ──✗──  ordinary Pod (no toleration)
   node: "tainted gpu=true:NoSchedule"  ──✓──  Pod that tolerates gpu=true

 Affinity/Selector: the POD chooses nodes
   Pod: "nodeSelector: disktype=ssd"    ──►   only SSD-labelled nodes

 Anti-affinity + topology spread: keep replicas APART
   replica-a ─► zone-1     replica-b ─► zone-2     replica-c ─► zone-3
   (one zone failing can't take all three down)
```

> 🔑 **Taints repel, affinity attracts — they're opposite directions.** A taint is the *node* saying "stay off unless you have a reason to be here" (used to reserve GPU/infra nodes); affinity/`nodeSelector` is the *Pod* saying "I want to be on nodes like this." You often pair them: taint the GPU nodes *and* give GPU Pods a matching toleration plus a `nodeSelector`, so only GPU work lands there and nothing else does.

> 💡 Use **pod anti-affinity** or **topology spread constraints** to keep a Deployment's replicas on different nodes/zones. Otherwise the scheduler may stack them together and a single node failure takes your whole app down — the classic "we had 3 replicas and still went down" incident.

## The four autoscalers

OpenShift scales at two layers — Pods and nodes — with a different controller for each:

```
        ┌──────────────────────────── workload layer ───────────────┐
  HPA   │  more/fewer POD replicas    (react to CPU/mem/custom metric)│
  VPA   │  right-size each Pod's CPU/memory REQUESTS                   │
        └─────────────────────────────────────────────────────────────┘
        ┌──────────────────────────── node layer ────────────────────┐
 Cluster│  add/remove NODES when Pods can't be scheduled / sit idle    │
 Auto-  │      │ drives                                                │
 scaler │      ▼                                                       │
 Machine│  MachineSets (the Machine API) create/destroy real VMs       │
 Auto-  │                                                              │
 scaler └──────────────────────────────────────────────────────────────┘
```

- **HorizontalPodAutoscaler (HPA)** — adds/removes **replicas** based on CPU, memory, or custom/external metrics. The everyday autoscaler.
- **VerticalPodAutoscaler (VPA)** — recommends or sets each Pod's CPU/memory **requests** so they're neither starved nor wasteful. Great for right-sizing; don't aim it at the same workload as the HPA on the same metric (they fight).
- **Cluster Autoscaler** — when Pods are stuck `Pending` for lack of capacity, it **adds nodes**; when nodes sit underused, it drains and removes them.
- **Machine Autoscaler** — the glue that lets the Cluster Autoscaler grow/shrink a specific **MachineSet** (OpenShift's declarative "pool of identical machines" via the Machine API).

> ⚠️ The HPA scales replicas but can't create nodes; the Cluster Autoscaler creates nodes but can't scale your app. You usually want **both**: HPA adds Pods, and when the cluster runs out of room, the Cluster Autoscaler adds nodes for them to land on. One without the other stalls at the layer it doesn't control.

A related tool, the **descheduler**, periodically evicts Pods that are now sub-optimally placed (e.g. after nodes were added) so the scheduler can re-place them better.

## Check yourself

1. You want certain Pods *only* on GPU nodes and want to keep everything else *off* those nodes. Which two mechanisms do you combine, and in which direction does each work?
2. Your three replicas keep landing on one node. Which scheduling control fixes that?
3. Traffic spikes, the HPA wants 20 replicas, but new Pods sit `Pending`. What's missing, and which autoscaler provides it?

## Key takeaways

- **Taints/tolerations repel** (node-driven); **nodeSelector/affinity attract** (Pod-driven) — combine them to reserve special nodes. Use **anti-affinity / topology spread** so replicas don't share a failure domain.
- Scale at two layers: **HPA** (replica count) and **VPA** (per-Pod requests) for workloads; **Cluster Autoscaler** + **Machine Autoscaler/MachineSets** for nodes.
- HPA and Cluster Autoscaler are **complementary** — Pods need both more replicas *and* somewhere to run them.
- The **descheduler** re-balances placement over time; avoid pointing HPA and VPA at the same metric.
