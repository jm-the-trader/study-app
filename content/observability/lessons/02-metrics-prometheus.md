# Metrics & Prometheus

**Metrics** are the always-on heartbeat of observability: cheap, numeric, and perfect for dashboards and alerts. **Prometheus** is the de facto open-source metrics system (a CNCF project, and the engine inside Kubernetes monitoring). This lesson covers both.

## What a metric is

A **metric** is a numeric measurement tracked over time — a **time series**. Each data point is `(timestamp, value)`, and the series is identified by a **name** plus **labels** (key/value dimensions):

```
http_requests_total{method="GET", status="200", service="api"}  →  14823
http_requests_total{method="GET", status="500", service="api"}  →  37
```

> 🔑 **Labels turn one metric into many dimensions you can slice and aggregate.** `http_requests_total` with labels lets you ask "errors per service," "rate by endpoint," "p99 by region" — all from one instrumented counter. Labels are what make metrics powerful.

> ⚠️ **Beware high-cardinality labels.** Each unique label combination is a separate time series. Putting user IDs, request IDs, or emails in labels can explode into millions of series and melt your metrics store. Keep label values **bounded** (method, status, route *template* — not the raw URL).

## The four metric types

- **Counter** — only ever goes up (or resets to 0 on restart): total requests, errors, bytes sent. You don't read the raw value; you read its **rate**.
- **Gauge** — goes up *and* down: current memory, queue depth, temperature, in-flight requests.
- **Histogram** — samples observations into **buckets** (e.g. request durations), enabling **percentiles/quantiles** (p50, p95, p99) computed at query time.
- **Summary** — like a histogram but computes quantiles client-side (less flexible to aggregate; histograms are usually preferred).

## Prometheus' defining trait: the pull model

Most systems **push** metrics to a server. Prometheus **pulls** (**scrapes**): each target exposes a `/metrics` HTTP endpoint, and Prometheus periodically fetches it.

```
Prometheus ──scrape /metrics every 15s──► your app  (exposes counters/gauges)
           ──scrape──► node_exporter (host CPU/mem/disk)
           ──scrape──► kube-state-metrics (k8s object state)
```

> 💡 **Pull has real advantages:** Prometheus controls scrape timing; a target that's down is itself a signal (the scrape fails); there's no app-side buffering; and **service discovery** (especially in Kubernetes) lets Prometheus automatically find new pods to scrape as they appear. Apps just expose `/metrics`; Prometheus finds and pulls them.

For things that can't be scraped (short-lived batch jobs), a **Pushgateway** bridges the gap, and the **OTLP/remote-write** path lets you push when needed — but scraping is the norm.

## Exposing and storing

- Apps expose `/metrics` via a Prometheus **client library** (Go, Python, Java, Node…).
- **Exporters** translate third-party systems into metrics: `node_exporter` (host), `blackbox_exporter` (probes), database exporters, etc.
- Prometheus stores series in its own efficient **time-series database (TSDB)** locally; for long-term/HA storage you front it with **Thanos**, **Cortex**, or **Mimir**.

## PromQL: querying metrics

**PromQL** is Prometheus' query language. The single most important idiom is **`rate()` over a counter**:

```promql
# per-second request rate over the last 5 minutes
rate(http_requests_total[5m])

# error rate (5xx) as a fraction of all requests, by service
sum by (service) (rate(http_requests_total{status=~"5.."}[5m]))
  /
sum by (service) (rate(http_requests_total[5m]))

# current memory per pod (a gauge)
container_memory_usage_bytes{namespace="prod"}

# p99 request latency from a histogram
histogram_quantile(0.99, sum by (le) (rate(http_request_duration_seconds_bucket[5m])))
```

> 🔑 **You almost never graph a counter directly — you graph its `rate()`.** A counter's raw value is a meaningless ever-growing number; `rate(counter[5m])` gives the per-second rate (and correctly handles restarts/resets). `sum by (label)` then aggregates across series. Master `rate` + `sum by` and you can express most dashboards and alerts.

## Check yourself

1. What do labels add to a metric, and why are high-cardinality labels (like user ID) dangerous?
2. What's the difference between a counter and a gauge, and how do you usefully read a counter?
3. Why does Prometheus *pull* metrics, and what advantage does that give in Kubernetes?

## Key takeaways

- A **metric** is a labeled **time series**; **labels** give you dimensions to slice/aggregate — but keep cardinality **bounded**.
- Four types: **counter** (up-only, read via rate), **gauge** (up/down), **histogram** (buckets → percentiles), summary.
- Prometheus **pulls/scrapes** `/metrics` endpoints (great with service discovery); apps expose metrics via client libs, and **exporters** cover third-party systems.
- In **PromQL**, you graph `rate(counter[5m])` (not the raw counter) and aggregate with `sum by (label)`; `histogram_quantile` gives percentiles.
