# Service Mesh and Serverless

> **The one-sentence version:** A **service mesh** moves networking concerns (mTLS, retries, traffic shifting, tracing) out of your code and into sidecar proxies, while **Serverless** (Knative) lets services scale to *zero* and back on demand — two optional but high-value layers OpenShift ships as Operators.

These are "advanced platform" topics: you won't need them on day one, but they come up fast once you're running many services or want event-driven, scale-to-zero workloads.

## OpenShift Service Mesh (Istio)

As the number of services grows, every team re-implements the same networking glue: retries, timeouts, TLS between services, traffic splitting for canaries, per-call metrics. A **service mesh** provides all of that *uniformly*, without touching application code.

**OpenShift Service Mesh** is Red Hat's supported **Istio**, bundled with **Kiali** (mesh visualization) and distributed tracing. The mechanism is the **sidecar**:

```
        WITHOUT a mesh                 WITH a mesh (sidecar injected)
   ┌──────────────────┐          ┌───────────────────────────────┐
   │   Pod            │          │   Pod                          │
   │  ┌────────────┐  │          │  ┌──────────┐   ┌───────────┐  │
   │  │ your app   │──┼──► net   │  │ your app │──►│  Envoy    │──┼──► net
   │  └────────────┘  │          │  └──────────┘   │  sidecar  │  │
   │                  │          │                 └───────────┘  │
   └──────────────────┘          └───────────────────────────────┘
        app does its own              ALL traffic flows through Envoy:
        TLS/retries/metrics           mTLS, retries, routing, metrics — free
```

> 🔑 An **Envoy** proxy is injected next to every Pod and **all traffic flows through it**. Because the mesh controls every proxy centrally, you get **mutual TLS between services, automatic retries/timeouts, fine-grained traffic routing, and consistent metrics/traces — without changing application code.** The cost is real complexity and per-Pod overhead, so adopt a mesh when you actually have the scale to justify it, not by default.

What the mesh unlocks, configured declaratively:

- **mTLS everywhere** — services authenticate each other automatically (zero-trust east-west); pairs with the **PKI** topic.
- **Traffic management** — `VirtualService`/`DestinationRule` shift, say, 5% of traffic to v2 for a **canary**, or mirror traffic for testing.
- **Observability** — golden-signal metrics, a live topology in **Kiali**, and distributed traces, uniformly across services.

## OpenShift Serverless (Knative)

**OpenShift Serverless** is supported **Knative**, in two parts:

- **Knative Serving** — request-driven services that **scale to zero** when idle and scale up (even from 0 → N) on demand. You stop paying for idle Pods.
- **Knative Eventing** — an event mesh (sources, brokers, triggers) for event-driven architectures.

```
   no traffic ─► 0 Pods (costs nothing)
   request in ─► Knative spins up a Pod ─► serves ─► idle ─► back to 0
                 (autoscales on concurrency/RPS, not just CPU)
```

> 💡 The headline difference from a normal Deployment: Knative autoscales on **request concurrency** and can go all the way to **zero**, where an HPA holds a minimum replica count. That's ideal for spiky, intermittent, or event-triggered workloads — APIs that are quiet most of the day, webhook handlers, batch-on-demand — where paying for always-on Pods is waste. The trade-off is **cold starts**: the first request after scaling to zero waits for a Pod to spin up.

## When to reach for each

| Need | Reach for |
|---|---|
| mTLS, canaries, retries, tracing across many services — no code changes | **Service Mesh** |
| Scale-to-zero, request-driven or event-driven workloads | **Serverless (Knative)** |
| Just exposing one HTTP app externally | A plain **Route** (lesson 4) — you don't need either |

> ⚠️ Both are powerful but add moving parts. The right instinct is to start with plain Deployments + Routes and adopt a mesh or Serverless only when a concrete need (zero-trust at scale, scale-to-zero economics) justifies the operational cost.

## Check yourself

1. How does a service mesh give you mTLS and retries "without changing application code"? What's the component that makes it work?
2. What can a Knative service do that a normal Deployment + HPA cannot, and what's the trade-off?
3. You just need to expose a single web app to users. Do you need a mesh? Why or why not?

## Key takeaways

- **OpenShift Service Mesh (Istio + Kiali)** injects an **Envoy sidecar** beside every Pod so all traffic flows through it — delivering **mTLS, traffic shifting/canaries, retries, and uniform observability** with no app code changes, at the cost of complexity.
- **OpenShift Serverless (Knative)** adds **scale-to-zero**, request-concurrency autoscaling (Serving) and event-driven architecture (Eventing); the trade-off is **cold starts**.
- Both are **opt-in** layers — start with Deployments + Routes and adopt them only when scale or economics justify the extra moving parts.
