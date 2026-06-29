# Observability and the `oc` Troubleshooting Toolkit

> **The one-sentence version:** OpenShift ships Prometheus-based monitoring and aggregated logging out of the box, and your day-to-day debugging lives in a handful of `oc` verbs that walk a problem from "what's the symptom" down to "what's actually wrong."

This is the most interview-relevant lesson in the topic, because "a Pod is broken — walk me through what you'd do" is the question, in some form, in every platform-engineering interview.

## Why it matters

A cluster will tell you what's wrong if you know which questions to ask it. Reaching for `oc adm must-gather` before you've read the Pod's events, or restarting a Pod before you've read its logs, wastes time and erases evidence. A calm, ordered method beats frantic poking.

## What's built in

- **Monitoring** — a managed **Prometheus** stack (with **Thanos** for long-term/HA queries and **Alertmanager** for alert routing) scrapes the cluster and your workloads. Optional **user-workload monitoring** scrapes *your* app metrics. Dashboards live in the console (Grafana-style views).
- **Logging** — the **OpenShift Logging** Operator aggregates Pod logs. Newer stacks use **Loki** with a **Vector** collector (the older default was Elasticsearch + Fluentd — the **EFK** stack; see the **ELK** topic).
- **Health probes** — `liveness` (restart if wedged), `readiness` (gate traffic), and `startup` (protect slow boots) are how the platform knows a Pod's state. Getting these right is what makes rollouts and self-healing work — a liveness probe that checks a database will restart-storm your Pods during a DB blip, so keep liveness cheap and local.

## The debugging ladder

Work top-down. Each rung narrows the problem.

```bash
# 1. WHAT is wrong? Status + the events timeline (events explain scheduling,
#    image pulls, probe failures, OOM kills — read these FIRST).
oc get pods
oc describe pod <pod>          # the Events: section at the bottom is gold

# 2. WHAT does the app say? Logs, including the previous crashed container.
oc logs <pod>
oc logs <pod> --previous      # logs from the container before it crashed
oc logs -f deploy/<name>      # follow a Deployment's logs live

# 3. GET INSIDE. Shell into a running container, or debug a copy.
oc rsh <pod>                  # interactive shell in the container
oc debug deploy/<name>       # a debug Pod from the same image (even if the app won't start)
oc debug node/<node>         # a root shell on the node itself (host filesystem under /host)

# 4. RESOURCE pressure? Live CPU/memory use.
oc adm top pods
oc adm top nodes

# 5. PLATFORM-level? Component and cluster health.
oc get clusteroperators
oc get events -A --sort-by=.lastTimestamp

# 6. ESCALATION bundle. Everything Red Hat support needs, in one archive.
oc adm must-gather
```

> 🔑 **Symptoms → events → logs → exec → resources → platform.** Don't skip to the bottom. 80% of "broken Pod" tickets are explained by `oc describe pod` (the Events section) plus `oc logs --previous` — before you ever open a shell.

## Reading the common failure states

| Pod state | Usual cause | First check |
|---|---|---|
| `ImagePullBackOff` | Bad image name, missing pull secret, registry unreachable | `oc describe pod` events |
| `CrashLoopBackOff` | App exits immediately — bad config, missing dep, **or permission denied (UID!)** | `oc logs --previous` |
| `CreateContainerConfigError` | A referenced ConfigMap/Secret key doesn't exist | `oc describe pod` events |
| `Pending` | No node has the requested CPU/memory, or a PVC won't bind | `oc describe pod`, `oc get pvc` |
| `OOMKilled` | Container exceeded its memory **limit** | `oc adm top pod`, raise the limit or fix the leak |

> ⚠️ A `CrashLoopBackOff` with "permission denied" on OpenShift is the **arbitrary-UID** lesson coming back to bite you — not a cluster bug. Check the image runs as a non-root, group-0 user before assuming anything platform-level.

## Keeping apps healthy: quotas, limits, and budgets

- **Requests/limits** set per container drive scheduling and the **QoS class** (Guaranteed > Burstable > BestEffort), which decides who gets **OOMKilled** first under pressure.
- **ResourceQuota** (per namespace) and **LimitRange** (per Pod/container defaults) stop one team from starving the cluster.
- A **PodDisruptionBudget** keeps a minimum number of replicas up during *voluntary* disruptions (node drains, upgrades), so a rolling node update doesn't take your whole app down.
- The **HorizontalPodAutoscaler** scales replicas on CPU/memory or custom metrics.

## Check yourself

1. Give the ordered sequence of `oc` commands you'd run on a Pod stuck in `CrashLoopBackOff`, and say what each one tells you.
2. Why is putting a database check in a *liveness* probe dangerous, and where does that check belong instead?
3. A node is about to be drained for an upgrade. Which object ensures your app keeps serving through it?

## Key takeaways

- OpenShift bundles **Prometheus/Thanos/Alertmanager** monitoring and **Loki/Vector** (or legacy EFK) logging — you don't assemble observability yourself.
- Debug **top-down**: `get` → `describe` (read **Events**) → `logs --previous` → `rsh`/`debug` → `adm top` → `clusteroperators` → `must-gather`.
- Learn the failure states: `ImagePullBackOff`, `CrashLoopBackOff` (often the **UID** issue), `Pending`, `OOMKilled`, `CreateContainerConfigError`.
- Keep apps healthy with **requests/limits + QoS**, **ResourceQuota/LimitRange**, **PodDisruptionBudget**, and the **HPA**; keep **liveness probes cheap and local**.
