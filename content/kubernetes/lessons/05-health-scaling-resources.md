# Health, Scaling & Resources

This lesson covers how Kubernetes knows your app is healthy, how it scales to load, and how resource requests/limits decide scheduling and stability. Get these right and the cluster runs your app the way you intend; get them wrong and you get mysterious restarts, evictions, and traffic to dead Pods.

## Probes: how Kubernetes judges health

By default Kubernetes only knows whether your *process* is running — not whether your *app* actually works. **Probes** let you teach it. There are three, with distinct jobs:

| Probe | Question | If it fails… |
|---|---|---|
| **liveness** | "Is the app alive, or wedged?" | **restart** the container |
| **readiness** | "Is it ready to serve traffic *right now*?" | **remove from Service** endpoints (no traffic) — but don't restart |
| **startup** | "Has a slow-starting app finished booting?" | hold off liveness/readiness until it passes |

```yaml
livenessProbe:
  httpGet: { path: /healthz, port: 8080 }
  initialDelaySeconds: 10
  periodSeconds: 10
readinessProbe:
  httpGet: { path: /ready, port: 8080 }
  periodSeconds: 5
```

> 🔑 **Liveness restarts; readiness gates traffic.** They're different on purpose. A Pod that's temporarily busy (warming a cache, awaiting a dependency) should fail **readiness** (stop receiving traffic) but **not** liveness (don't kill it). Confusing the two causes either restart loops or requests sent to Pods that can't serve them.

> ⚠️ Common bug: a too-aggressive **liveness** probe (short timeout, low threshold) restarts a healthy-but-slow app in a loop. Use a **startup** probe for slow boots, and keep liveness conservative.

## Resource requests and limits

You tell Kubernetes what each container needs. Two numbers, very different meanings:

```yaml
resources:
  requests: { cpu: "250m", memory: "256Mi" }   # guaranteed reservation
  limits:   { cpu: "500m", memory: "512Mi" }    # hard ceiling
```

- **requests** — what the container is **guaranteed**. The **scheduler** uses requests to place Pods: it only puts a Pod on a node with enough *unreserved* request capacity. (CPU is `m` = millicores: `1000m` = 1 core.)
- **limits** — the **maximum** the container may use. These become **cgroup** limits on the node (Linux topic!). **Memory over limit → OOMKilled. CPU over limit → throttled** (not killed).

> ⚠️ **Set requests, or scheduling is a guess and noisy neighbors starve each other.** No requests = the scheduler can't reason about capacity. No memory limit = one leaky Pod can take down a node. Both are foundational hygiene.

### Quality of Service (QoS) — who gets evicted first

Kubernetes classifies Pods by their requests/limits, which decides eviction order under node memory pressure:

- **Guaranteed** — requests == limits for all resources. Last to be evicted.
- **Burstable** — requests < limits. Evicted after BestEffort.
- **BestEffort** — no requests/limits set. **First evicted.**

> 💡 For important workloads, set **requests == limits** (Guaranteed QoS) so they're the last to be evicted when a node runs low.

## Horizontal Pod Autoscaling (HPA)

The **HorizontalPodAutoscaler** adds/removes **Pod replicas** automatically based on observed metrics (CPU, memory, or custom):

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata: { name: web }
spec:
  scaleTargetRef: { apiVersion: apps/v1, kind: Deployment, name: web }
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target: { type: Utilization, averageUtilization: 70 }
```

This keeps average CPU near 70% by scaling between 2 and 10 replicas.

> 🔑 HPA scaling on CPU **only works if you set CPU `requests`** — utilization is measured *against the request*. No request, no percentage, no autoscaling. (This ties health, resources, and scaling together.)

Related autoscalers: **VPA** (adjusts requests/limits — *vertical*) and **Cluster Autoscaler / Karpenter** (adds/removes *nodes* when Pods can't be scheduled).

## Scheduling controls (brief)

You can influence placement: **nodeSelector**/**affinity** (run here/near/away from X), **taints & tolerations** (reserve nodes for certain workloads), **topology spread** (spread replicas across zones for HA), and **PodDisruptionBudgets** (limit how many replicas may be down during voluntary disruptions like node drains).

## Check yourself

1. What's the difference between a liveness and a readiness probe, and what happens when each fails?
2. What do `requests` vs `limits` control, and what happens when a container exceeds its **memory** limit vs its **CPU** limit?
3. Why won't a CPU-based HPA work if you haven't set CPU requests?

## Key takeaways

- **Probes** teach Kubernetes real health: **liveness → restart**, **readiness → gate traffic**, **startup → protect slow boots**; don't conflate liveness and readiness.
- **requests** drive **scheduling** (guaranteed reservation); **limits** are cgroup ceilings — **memory over limit = OOMKilled, CPU over limit = throttled**. Always set them.
- **QoS** (Guaranteed > Burstable > BestEffort) sets eviction order; use `requests == limits` for critical Pods.
- **HPA** scales replicas on metrics (needs CPU requests for CPU-based scaling); VPA scales requests, Cluster Autoscaler/Karpenter scales nodes.
