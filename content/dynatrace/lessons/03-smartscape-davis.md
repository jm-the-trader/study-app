# Smartscape Topology & Davis AI

Two features set Dynatrace apart from a dashboards-and-alerts tool: it **knows your topology automatically** (Smartscape) and it **tells you the root cause automatically** (Davis). Together they aim to answer "what's wrong and why" without you pre-building queries for every scenario.

## Entities: the model underneath

Everything OneAgent discovers becomes a **monitored entity** with a stable identity and relationships: hosts, processes, **services**, databases, **applications** (RUM), Kubernetes nodes/pods/namespaces, cloud resources. Dynatrace tracks how entities **depend on** each other over time.

> 🔑 Because Dynatrace models the world as **entities + relationships** (not just loose metrics), it can reason about *impact* and *causality* — "this service's slowdown affects these 3 applications and is caused by that database." A pile of disconnected metrics can't do that; a topology graph can.

## Smartscape: the automatic dependency map

**Smartscape** is the continuously-updated, real-time map of all entities and their dependencies — built automatically from what OneAgent observes (no manual diagramming). It's typically organized in layers:

- **Vertical stack:** application → service → process → host → datacenter/cloud (the layers a request passes through).
- **Horizontal:** call dependencies between services at the same layer (service A calls service B calls the database).

Why this matters in modern environments: in a microservices/Kubernetes world, dependencies change constantly as pods come and go and you ship new services. A hand-drawn architecture diagram is stale the moment it's saved.

> 💡 Smartscape answers questions that are painful in a DIY stack: **"What depends on this service?"**, **"What's downstream of this database if it fails?"**, **"What changed in the topology right before the incident?"** It's the live, self-updating system map — the basis Davis uses to localize problems.

## Davis: the causal AI engine

**Davis** is Dynatrace's AI that does automatic **anomaly detection** and **root-cause analysis**. Rather than you setting static thresholds on hundreds of metrics, Davis learns normal behavior (baselining) and detects deviations, then uses the **Smartscape topology + timing of events** to determine the likely **root cause**.

> 🔑 **Davis is "causal" AI, not just pattern-matching:** it correlates anomalous events *along the dependency graph* and in time to point at a cause, rather than alerting on every symptom independently. Knowing that service A depends on database B is what lets it say "the 50 alerts you'd otherwise get are one problem, rooted in B."

### Problems (not a flood of alerts)

The output of Davis is a **problem** — a single, consolidated incident that:

- **Groups related events** (all the symptoms across affected entities) into one item, instead of paging you 50 times.
- Identifies the **root-cause entity** and the likely cause.
- Shows the **impact** (which services/applications/users are affected) and a timeline.

> ⚠️ This directly targets **alert fatigue** (the danger from the Observability topic): one well-formed *problem* with a root cause beats dozens of disconnected threshold alerts. But "automatic" isn't "infallible" — review Davis's reasoning, and tune detection (sensitivity, custom events, maintenance windows) so it reflects your reality.

## How it changes the workflow

Compare incident handling:

```
DIY stack:   alert fires → you open dashboards → guess the service → check traces →
             read logs → manually correlate → infer the cause

Dynatrace:   Davis raises ONE problem → shows root-cause entity + impact on Smartscape →
             you verify and fix (drill into PurePath/logs for confirmation)
```

The promise is less manual correlation; the discipline is verifying the AI's conclusion rather than trusting it blindly.

## Check yourself

1. Why does modeling the system as **entities + relationships** enable root-cause analysis that loose metrics can't?
2. What is Smartscape, and name two questions it answers that are hard in a hand-maintained architecture diagram?
3. What is a Davis "problem," and how does it combat alert fatigue compared to threshold alerts?

## Key takeaways

- Dynatrace models everything as **entities with relationships**; **Smartscape** is the automatic, real-time **dependency map** (vertical stack + horizontal service calls).
- **Davis** is **causal AI**: it baselines normal behavior, detects anomalies, and uses the topology + timing to compute **root cause**.
- Davis emits consolidated **problems** (grouped symptoms + root-cause entity + impact) instead of floods of alerts — directly attacking **alert fatigue**.
- Treat the automation as a powerful assistant to **verify and tune**, not an oracle to trust blindly.
