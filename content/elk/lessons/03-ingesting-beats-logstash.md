# Ingesting Data: Beats & Logstash

Data has to *get into* Elasticsearch, parsed into useful fields. This lesson covers the two main ingestion tools — lightweight **Beats** at the edge and the heavier **Logstash** pipeline — plus how raw log lines become structured documents.

## Beats: lightweight shippers at the source

**Beats** are small, single-purpose agents you install where the data is. They collect and ship with minimal resource use:

- **Filebeat** — tails log files (and container logs); the workhorse for logs.
- **Metricbeat** — system/service metrics.
- **Winlogbeat**, **Packetbeat**, **Auditbeat**, **Heartbeat** — Windows events, network packets, audit data, uptime checks.

```yaml
# filebeat.yml — tail logs and send to Elasticsearch (or Logstash)
filebeat.inputs:
  - type: filestream
    paths: [/var/log/app/*.log]
output.elasticsearch:
  hosts: ["http://es:9200"]
# output.logstash: { hosts: ["logstash:5044"] }   # ...or hand off to Logstash
```

> 🔑 **Beats are the edge collectors; they're deliberately dumb and cheap.** They can ship **directly to Elasticsearch** for simple cases, or **to Logstash** when you need heavier transformation. In Kubernetes, **Fluent Bit** plays this edge role as a DaemonSet (EFK).

## Logstash: the processing pipeline

**Logstash** is a centralized pipeline with three stages: **input → filter → output**.

```ruby
input {
  beats { port => 5044 }            # receive from Filebeat
}
filter {
  grok {                            # parse unstructured text into fields
    match => { "message" => "%{TIMESTAMP_ISO8601:ts} %{LOGLEVEL:level} %{GREEDYDATA:msg}" }
  }
  date { match => ["ts", "ISO8601"] }   # set the document's @timestamp
  mutate { remove_field => ["host.id"] }
}
output {
  elasticsearch { hosts => ["http://es:9200"] index => "app-logs-%{+YYYY.MM.dd}" }
}
```

- **input** — where data comes from (Beats, Kafka, files, syslog…).
- **filter** — where the work happens: parse, enrich, drop, rename, geo-locate.
- **output** — where it goes (usually Elasticsearch).

## Turning text into fields: grok

The central problem of log ingestion: a log line is often **unstructured text**, but you want **fields** you can filter and aggregate (recall structured logging from the Observability topic). **Grok** parses text using named patterns:

```
194.0.0.1 - - [13/Jun/2026:14:02:11] "GET /api HTTP/1.1" 500 1234
```

A grok pattern extracts `client_ip`, `method`, `path`, `status`, `bytes` into real fields. Now you can query `status:500` and aggregate by `path` — impossible on the raw string.

> 💡 **If your app can emit JSON logs, do that** and skip most grok — Logstash/Elasticsearch parse JSON directly into fields. Grok is for the (large) world of pre-existing text logs you can't change. Either way, the goal is the same: **structured fields, not blobs of text.**

## Ingest pipelines: parsing inside Elasticsearch

Elasticsearch has its own **ingest pipelines** — processors (including a grok processor) that transform documents **at index time**, no Logstash needed. For light parsing, Beats → ingest pipeline is simpler and cheaper than running Logstash.

> 🔑 **Decision guide:** **direct Beats → Elasticsearch** (simplest) → add an **ingest pipeline** for light parsing → reach for **Logstash** when you need heavy transformation, enrichment from external sources, buffering, fan-out to multiple destinations, or protocol bridging (e.g. Kafka).

## ECS: a common field schema

Elastic defines the **Elastic Common Schema (ECS)** — standard field names (`@timestamp`, `host.name`, `log.level`, `source.ip`, `service.name`…). Mapping your data to ECS means dashboards, alerts, and correlation work consistently across sources. Adopt it early; retrofitting field names later is painful.

## Reliability concerns

- **Backpressure & buffering** — if Elasticsearch is slow, where do events queue? Beats have a memory queue; Logstash a persistent queue; production setups often put **Kafka** in front as a durable buffer.
- **At-least-once delivery** — pipelines can retry, so design for possible **duplicates** (idempotent doc IDs help).

## Check yourself

1. What's the role of Beats vs. Logstash, and when can you skip Logstash entirely?
2. What does grok do, and what's the easier alternative when you control the application?
3. Why adopt ECS field names rather than inventing your own?

## Key takeaways

- **Beats** (e.g. Filebeat) are lightweight edge shippers; they can go **straight to Elasticsearch** or hand off to **Logstash**. Fluent Bit fills this role in Kubernetes.
- **Logstash** is an **input → filter → output** pipeline; **grok** parses unstructured text into fields (but **JSON logs** avoid most grok).
- For light parsing, **ingest pipelines** inside Elasticsearch avoid running Logstash; escalate to Logstash for heavy transform/enrich/buffer/fan-out.
- Standardize on **ECS** field names, and plan for **backpressure/buffering** (often Kafka) and **at-least-once** duplicates.
