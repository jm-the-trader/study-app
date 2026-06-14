# Logging

Logs are the most familiar pillar — and the most often done badly. Done well, they're the detailed record that explains *what exactly happened* in a specific event. This lesson is about logging that's actually useful at scale.

## Structured logging: the single biggest upgrade

A traditional log line is a human sentence:

```
2026-06-13 14:02:11 ERROR Payment failed for user 8842 order 51 after 3 retries
```

A **structured** log is machine-parseable key/value data (usually JSON):

```json
{"ts":"2026-06-13T14:02:11Z","level":"error","msg":"payment failed",
 "user_id":8842,"order_id":51,"retries":3,"service":"payments","trace_id":"a1b2c3"}
```

> 🔑 **Log structured (JSON), not prose.** Free-text logs force brittle regex grepping; structured logs are *queryable* — "all `error` logs from `service=payments` where `retries>2`" becomes a real query, not a grep guess. At scale this is the difference between answering questions in seconds vs. hours.

## Log levels: signal vs. noise

Use levels deliberately so you can filter:

- **ERROR** — something failed and needs attention.
- **WARN** — unexpected but handled; worth noticing.
- **INFO** — normal high-level events (startup, a request completed).
- **DEBUG** — detailed diagnostics, usually off in production.

> ⚠️ Two failure modes: logging *everything* at INFO (drowning real signal in noise and ballooning cost) or logging too little to debug. Make the level **runtime-configurable** (an env var) so you can crank up DEBUG temporarily during an incident without redeploying.

## Log to stdout — let the platform handle the rest

In containerized/systemd environments, **applications should write logs to stdout/stderr** and *not* manage files, rotation, or shipping themselves.

> 🔑 This is the same contract you saw in the Linux topic (journald) and the Containers topic: the app just prints; the platform captures and forwards. In Kubernetes, the container runtime captures stdout and a node agent ships it onward. Apps writing their own log files inside containers is an anti-pattern (the writable layer is ephemeral and the logs are invisible to the platform).

## Aggregation: from many sources to one place

A pod's logs vanish when it dies, and you have hundreds of pods — so you **centralize**. The pipeline:

```
app (stdout) → collector/agent (Fluent Bit, Promtail, Vector)
            → store + index (Loki, Elasticsearch/OpenSearch)
            → query/visualize (Grafana, Kibana)
```

Common stacks: **ELK/EFK** (Elasticsearch + Logstash/Fluentd + Kibana) and **Grafana Loki** (lighter, label-based, indexes metadata rather than full text — pairs naturally with Prometheus + Grafana).

## Correlation: the trace ID is gold

The feature that makes logs exponentially more useful: include a **trace/request ID** on every log line so you can pull *all* logs for a single request across every service it touched.

```json
{"msg":"db query slow","trace_id":"a1b2c3","duration_ms":812}
```

> 💡 With a `trace_id` in your structured logs, an incident flow becomes: metric spikes → open the trace → copy its `trace_id` → fetch every log line with that ID across all services. That's the correlation between pillars from Lesson 1, made concrete. Propagating that ID is exactly what distributed tracing does (next lesson).

## Practical guidance

- **Add context, not secrets.** Include `user_id`, `order_id`, `service`, `trace_id` — **never** passwords, tokens, full PII, or card numbers. Logs are widely accessible and long-lived; treat them as such (and mind regulations like GDPR).
- **Don't log in hot loops** — high-volume logging is a real performance and cost hit; sample if needed.
- **Set retention** — logs are voluminous and expensive; keep what you need (e.g. 30 days hot, archive the rest), enforced by the store.
- **Make messages stable** — keep a consistent `msg` field and put variables in fields, so you can group by message.

## Check yourself

1. Why are structured (JSON) logs dramatically more useful at scale than free-text logs?
2. Where should a containerized app send its logs, and why not write its own files?
3. What single field turns scattered per-service logs into a coherent story for one request?

## Key takeaways

- **Structure your logs** (JSON key/values) so they're **queryable**, not greppable; use **log levels** deliberately and make the level runtime-configurable.
- **Log to stdout/stderr** and let the platform capture/ship them — the same contract as journald and containers.
- **Aggregate** centrally (Fluent Bit/Vector → Loki or ELK → Grafana/Kibana) because pod logs are ephemeral and numerous.
- Include a **trace/request ID** for cross-service correlation; add context but **never secrets/PII**, and set **retention** to control cost.
