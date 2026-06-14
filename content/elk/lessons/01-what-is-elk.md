# What Is the ELK / Elastic Stack?

> **The one-sentence version:** ELK is a set of tools that **collect**, **store + search**, and **visualize** machine data (especially logs) at scale — turning a firehose of log lines from hundreds of services into something you can actually query and dashboard.

## From the Observability topic to a concrete stack

In the Observability topic you learned the *pillars* — and that **logs** must be **aggregated centrally** because pod/container logs are ephemeral and scattered. ELK is the most popular open-source way to do that aggregation, search, and visualization. (It's also widely used beyond logs: metrics, security/SIEM, and general full-text search.)

## The acronym (and why it's now "Elastic Stack")

**ELK** = three components, bottom to top:

- **E — Elasticsearch** — the heart: a distributed **search and analytics engine** that stores your data and makes it instantly searchable.
- **L — Logstash** — a server-side **data processing pipeline**: ingest from many sources, **transform/parse**, and ship onward.
- **K — Kibana** — the **web UI**: search (Discover), build visualizations and dashboards, manage the cluster, alert.

Then **Beats** were added — lightweight **shippers** installed on the edge (e.g. **Filebeat** for logs, **Metricbeat** for metrics) — so the acronym ELK no longer fit. Elastic renamed the whole thing the **Elastic Stack**. People still say "ELK" colloquially.

```
   sources                ingest/ship              store + search        visualize
 ┌─────────┐   Beats /   ┌───────────┐  index  ┌───────────────┐  query ┌─────────┐
 │ app logs │──Filebeat──►│ Logstash  │────────►│ Elasticsearch │◄───────│ Kibana  │
 │ metrics  │  (or direct │ (parse,   │         │ (the engine)  │        │ (UI)    │
 │ events   │   to ES)    │  enrich)  │         └───────────────┘        └─────────┘
 └─────────┘             └───────────┘
```

> 🔑 **Read the data flow left to right: collect → process → store/search → visualize.** Each tool owns one stage. You don't always need all of them — Beats can ship straight to Elasticsearch, and Elasticsearch's own **ingest pipelines** can do light parsing without Logstash. Use the pieces you need.

## EFK — the Kubernetes-flavored variant

In container/Kubernetes environments you'll often see **EFK**, where **Fluentd** (or the lighter **Fluent Bit**) replaces Logstash as the collector. Fluent Bit is tiny and runs as a DaemonSet on every node (recall DaemonSets from the Kubernetes topic), tailing container stdout and shipping to Elasticsearch. Same idea, different collector — pick the shipper that fits your footprint.

## Why teams reach for it

- **Centralization** — one place to search logs from your *entire* fleet, instead of SSHing into boxes.
- **Speed at scale** — Elasticsearch returns full-text searches over terabytes in milliseconds (next lesson explains how).
- **Powerful analytics** — aggregations turn logs into metrics and trends, not just text.
- **Flexible visualization & alerting** — Kibana dashboards and rules on top of everything.
- **Beyond logs** — the same engine powers app search, security analytics (Elastic SIEM), and APM.

## A note on licensing and forks

In 2021 Elastic changed Elasticsearch's license, prompting AWS to create **OpenSearch** (with **OpenSearch Dashboards**) — an open-source fork that's a near drop-in alternative. The concepts in this topic — inverted index, shards, Query DSL, ingest, dashboards — **apply to both Elasticsearch and OpenSearch.** (Elasticsearch later also re-added an open-source license option.) Choose based on licensing, managed-service, and feature needs.

## Check yourself

1. Name each ELK component and the single stage of the pipeline it owns.
2. Why did "ELK" become the "Elastic Stack," and what is EFK?
3. When might you *not* need Logstash in the pipeline?

## Key takeaways

- ELK / the **Elastic Stack** does **collect → process → store/search → visualize** for machine data, especially centralized **logs**.
- **Elasticsearch** (search engine) + **Logstash** (processing pipeline) + **Kibana** (UI), plus **Beats** (lightweight shippers); **EFK** swaps in Fluentd/Fluent Bit for containers.
- You can mix and match — Beats can ship directly to Elasticsearch, and ingest pipelines can parse without Logstash.
- **OpenSearch** is an open-source fork; the same concepts apply to both.
