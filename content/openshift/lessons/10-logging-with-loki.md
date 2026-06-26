# Logging with Loki

> **The one-sentence version:** OpenShift's logging stack collects every container's stdout with a lightweight agent, ships it to **Loki** — a store that indexes cheap *labels* instead of full text — and lets you query it with **LogQL** from the console.

Pods are ephemeral and write logs to stdout that vanish when they're replaced. Aggregated logging is how you keep and search those logs cluster-wide. Modern OpenShift Logging is built on **Loki**, and knowing why it's designed the way it is makes you far more effective at querying it.

## Why it matters

When an incident hits, "show me every error from the payments service in the last 15 minutes, across all its Pods on all nodes" must be one query — not SSH-ing to nodes that no longer exist. And the *cost* of logging at scale is real, which is exactly the problem Loki was built to solve.

## The pipeline

Three stages, each a distinct component:

```
  every Pod's stdout/stderr
        │
   ┌────▼─────┐  COLLECT: a lightweight agent on every node
   │  Vector  │            (a DaemonSet) tails container logs,
   │ (agent)  │            adds labels: namespace, pod, container
   └────┬─────┘
        │  ClusterLogForwarder routes by log type
   ┌────▼─────┐  STORE: indexes LABELS only, not full text;
   │ LokiStack │           chunks of raw log go to cheap object
   │  (Loki)  │            storage (S3/ODF) — that's the cost win
   └────┬─────┘
        │
   ┌────▼─────┐  QUERY: console "Observe → Logs", LogQL
   │ Console  │            (Grafana can also point at Loki)
   └──────────┘
```

- **Collector — Vector:** a DaemonSet Pod on every node tails each container's stdout and attaches metadata as **labels** (namespace, pod, container, node). (Vector replaced the older Fluentd collector.)
- **Store — LokiStack:** deployed by the **Loki Operator**. The `LokiStack` CR picks a **t-shirt size** (e.g. `1x.extra-small` → `1x.medium`) that provisions Loki's microservices, backed by **object storage** for the bulk log data.
- **Query — the console:** the **Logging** view (Observe → Logs) runs LogQL; dashboards can also live in Grafana.

A **ClusterLogForwarder** CR decides what goes where, and can also forward to *external* sinks (Splunk, Kafka, a SIEM) in parallel.

## The big idea: index labels, not text

This is the one concept to take away.

> 🔑 **Loki indexes *labels*, not the full log text.** Traditional log stores (Elasticsearch) index every word so any term is instantly searchable — powerful, but the index is huge and expensive. Loki instead indexes only a small set of labels (namespace/pod/container) and keeps the raw log lines as compressed chunks in cheap object storage. You narrow by label first (fast, small index), then it greps the matching chunks. Far cheaper to run; the trade-off is that searches not anchored by a label scan more data.

This is why a good LogQL query *always starts with labels* — it's what makes the query cheap and fast.

## Log types (and why tenancy matters)

OpenShift separates logs into three streams, isolated from each other:

| Type | What | Who should read it |
|---|---|---|
| **application** | Your workload Pods' logs | Developers |
| **infrastructure** | Logs from `openshift-*`/`kube-*` and the nodes | Cluster admins |
| **audit** | API server audit events (who did what) | Security / compliance |

Loki stores them as separate **tenants**, so RBAC can let a developer read `application` logs without seeing cluster `audit` logs.

## Querying with LogQL

LogQL feels like PromQL for logs: select a **stream** by labels `{...}`, then filter the lines.

```logql
# All logs from the payments app
{ kubernetes_namespace_name="payments" }

# Just the errors (line filter: |= contains, |~ regex, != excludes)
{ kubernetes_namespace_name="payments" } |= "ERROR"

# Parse JSON logs and filter on a field
{ kubernetes_namespace_name="payments" } | json | status_code >= 500

# A metric from logs: error rate per second over 5m (great for alerts)
sum(rate({ kubernetes_namespace_name="payments" } |= "ERROR" [5m]))
```

> 💡 Always lead with the label selector `{namespace=...}` to shrink the data set, *then* add line filters (`|=`, `|~`). A bare text search with no labels makes Loki scan everything — slow and expensive, exactly the workload its design avoids. (`oc logs <pod>` is still fine for one live Pod; Loki is for "across all Pods, over time, after they're gone.")

## Check yourself

1. What is the single architectural choice that makes Loki cheaper to run than a full-text log store, and what's the trade-off?
2. Name the three OpenShift log types and why they're kept as separate tenants.
3. Why should a LogQL query start with a label selector rather than a text filter?

## Key takeaways

- The pipeline is **Vector (collect, label) → LokiStack (store) → console/LogQL (query)**, wired by a **ClusterLogForwarder** that can also fan out to external sinks.
- Loki's defining choice: **index labels, not full text**, with raw chunks in **object storage** — cheap at scale, so queries should **filter by label first**.
- Logs split into **application / infrastructure / audit** tenants so RBAC controls who sees what.
- **LogQL** = label selector `{...}` + line filters (`|=`, `|~`, `| json`) + optional `rate(...)` for log-based metrics and alerts.
