# Advanced: Observability at Scale, Correlation & Smart Alerting

> **The one-sentence version:** The advanced craft is making metrics *scale and survive*, *linking* the three pillars so one click goes metric → trace → log, and alerting on *burn rate* instead of raw thresholds.

You know observability vs monitoring, Prometheus/PromQL, logging, tracing/OpenTelemetry, and SLOs/dashboards/alerting basics. This lesson is about running it for real: long-term storage, the cardinality trap, the OTel Collector, correlation, and alerting that protects humans.

## Prometheus past a single server

A single Prometheus is simple but limited: local disk, no HA, retention measured in weeks. Scale it with:

- **Recording rules** — precompute expensive queries on a schedule so dashboards/alerts read a cheap pre-aggregated series.
- **`remote_write`** to a long-term backend — **Thanos**, **Cortex**, **Mimir**, or **Grafana** Cloud — for months/years of retention, global query, and horizontal scale across many Prometheis.
- **Federation** — a higher-level Prometheus scrapes aggregated series from many lower-level ones (use sparingly; `remote_write` is usually the better scaling answer now).

> 🔑 The mental shift: Prometheus becomes a *collector*, and durable storage + global query move to a dedicated system. Don't scale by giving one Prometheus a bigger disk.

## The cardinality trap

Every unique combination of label values is a **separate time series**. Put a user ID, request ID, or full URL in a label and you create millions of series — exploding memory and cost, often crashing the server. This is the **#1 way people break Prometheus.**

> ⚠️ **Labels are for bounded dimensions** (status code, method, route *template* `/users/:id`) — never for unbounded values (user IDs, emails, raw paths). High-cardinality identifiers belong in **traces/logs**, not metric labels.

## Histograms, correctly

Latency is a histogram, not an average — averages hide the tail. But two rules bite:

- Compute quantiles **after** aggregating across instances: `histogram_quantile(0.99, sum(rate(http_latency_bucket[5m])) by (le))`. Averaging pre-computed p99s is mathematically wrong.
- Your buckets must straddle your SLO. If the nearest boundaries are 100 ms and 500 ms, you can't measure a 200 ms target accurately. **Native histograms** (newer Prometheus) reduce this bucket-picking pain.

## Correlation: stitch the three pillars

The payoff of observability is moving *between* signals without a new search:

- **Exemplars** attach a sample **trace ID** to a metric data point — so a spike on a latency graph links straight to an example slow trace.
- A **trace ID in every log line** (propagated via context, see the tracing lesson) lets you jump trace → all logs for that request.
- Shared resource attributes (service, pod, version) via **OpenTelemetry semantic conventions** make metrics, logs, and traces *join* on the same identity.

> 🔑 The goal: from a dashboard anomaly, one click to the exemplar trace, one click to that request's logs — no re-deriving queries by hand. Correlation is what makes a system *explorable* rather than just *monitored*.

## The OpenTelemetry Collector

The **OTel Collector** is a vendor-neutral pipeline that decouples your apps from your backend: **receivers** (OTLP, Prometheus, …) → **processors** (batch, attributes, filtering, **tail-based sampling**) → **exporters** (to any backend). Run it as an agent (per node) and/or a gateway (central). **Tail sampling** decides *after* seeing a whole trace — keep all errors and slow traces, drop the boring fast ones — which head sampling can't do.

## Alerting that protects humans

Threshold alerts ("CPU > 80%") page on noise. SLO-based **error-budget burn-rate** alerting pages on what users feel:

- Alert when you're **burning the error budget too fast** — e.g. a **multi-window, multi-burn-rate** rule (a fast 1h window for sharp outages *and* a slow 6h window for slow burns), so you catch both without false pages.
- In **Alertmanager**: **group** related alerts into one notification, **route** by severity/team, **inhibit** downstream alerts when a parent fires (don't page for 50 services when the cluster is down), and **silence** during maintenance.

## A fourth pillar: continuous profiling

Metrics/logs/traces tell you *that* and *where* it's slow; **continuous profiling** (pprof, Pyroscope, Parca, eBPF-based) tells you *which line of code* burns the CPU/memory in production — closing the last gap from symptom to root cause.

## Check yourself

1. Why shouldn't you scale Prometheus by enlarging its disk — what do you do instead?
2. What makes label cardinality dangerous, and where should a user ID live instead?
3. How do exemplars and trace IDs in logs make a system explorable?
4. Why is multi-window multi-burn-rate alerting better than a static threshold?

## Key takeaways

- Scale Prometheus with **recording rules** + **`remote_write`** to **Thanos/Cortex/Mimir**; treat Prometheus as a collector, not the long-term store.
- **Cardinality** is the top failure mode — labels are for **bounded** dimensions; unbounded IDs go in traces/logs.
- Aggregate histogram buckets *before* `histogram_quantile`; size buckets around your SLO (or use **native histograms**).
- **Correlate** the pillars with **exemplars**, **trace IDs in logs**, and shared **OTel semantic conventions** for one-click pivots.
- Run the **OTel Collector** (receivers → processors → exporters) with **tail sampling**; alert on **error-budget burn rate** with grouped/routed/inhibited Alertmanager rules; add **continuous profiling** as a fourth pillar.
