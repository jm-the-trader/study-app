# Advanced: DQL Depth, OpenPipeline, Governance & Automation

> **The one-sentence version:** The advanced Dynatrace skill set is querying Grail fluently with DQL, shaping data on the way in with OpenPipeline, governing *who sees what* with management zones and IAM, and turning Davis's findings into *automated action*.

You know OneAgent, Smartscape/Davis, the data model, and day-to-day operation. This lesson is about wielding the platform at depth.

## DQL beyond `fetch`

The **Dynatrace Query Language** is pipe-based: each command transforms the stream from the previous one. Real analysis chains stages:

```
fetch logs
| filter matchesPhrase(content, "OutOfMemory") and dt.entity.host == "HOST-1A2B"
| parse content, "LD 'pid=' INT:pid"
| summarize count(), by:{bin(timestamp, 1h), k8s.namespace.name}
| sort count() desc
```

Patterns worth internalizing: **`filter`** early to cut volume, **`parse`** (with the DPL pattern grammar) to extract fields from raw text at query time, **`summarize`** for aggregation with `by:` grouping, **`makeTimeseries`** to turn records into chartable series, and **`lookup`/`join`** to enrich with entity data. Because Grail stores logs, events, traces, and metrics together, one DQL query can correlate across them.

## OpenPipeline: shape data on ingest

Historically you queried whatever was stored. **OpenPipeline** lets you process data *as it arrives*: parse and enrich fields, mask sensitive values (PII redaction), route records to different Grail buckets, drop noise, and derive metrics or events from logs — all before storage.

> 💡 Doing extraction and redaction at ingest (rather than at query time) makes queries cheaper and faster, and keeps sensitive data out of storage entirely. Route high-value data to a long-retention bucket and noisy debug logs to a short one — retention is set per **Grail bucket**.

## Governance: management zones and IAM

In a large tenant, not everyone should see everything.

- **Management zones** carve the monitored estate into logical views (by team, app, environment) based on entity rules. They scope dashboards, alerts, and access without splitting data physically.
- **IAM policies** (the newer permission model) grant fine-grained access — including **DQL-level** policies that restrict which buckets/records a user can query. Combine zones (what entities) with IAM (what actions/data).

## Tuning Davis, not just trusting it

Davis is causal AI, but it works best when you guide it:

- It **auto-baselines** metrics (learning normal seasonal patterns) and raises a **Problem** on a *causal cluster* of anomalies — not one alert per symptom. Tune detection sensitivity and define **maintenance windows** so planned work doesn't page anyone.
- Mark dependencies and set **service-level** detection thresholds where the auto-baseline is too loose or tight. The goal is high signal: one Problem per real incident, with the root cause already identified.

## From insight to action: automation

The mature end state is closing the loop:

- **Monitoring as Code** — manage configuration declaratively with **Monaco** (Monitoring-as-Code) or the **Terraform provider**, so dashboards/SLOs/alerts live in Git and deploy via CI/CD (ties to the Terraform and CI/CD topics).
- **Workflows (AutomationEngine)** — trigger actions on a Davis Problem: enrich it, post to Slack/ServiceNow, run a remediation, or gate a deployment.
- **Site Reliability Guardian** — automated release validation: a deployment pipeline asks the Guardian "are the SLOs healthy?" and it returns a pass/fail objective verdict (a progressive-delivery gate, see CI/CD).

## Cost awareness

Grail and many capabilities are consumption-priced (historically **DDUs**, now capability-based licensing). The levers: ingest less (OpenPipeline filtering), retain shorter where you can (bucket retention), and avoid unbounded high-cardinality custom metrics. Query cost scales with scanned data — `filter` early.

## Check yourself

1. Why filter early in a DQL query, and what does `parse` let you do that storage alone doesn't?
2. What does OpenPipeline let you do that query-time processing can't — and name two benefits of redacting at ingest.
3. How do management zones and IAM policies divide responsibility for "what you can see" vs "what you can do"?
4. Describe one way Dynatrace can *act* on a Davis Problem rather than just display it.

## Key takeaways

- **DQL** is a pipe-based language; chain `fetch → filter → parse → summarize → makeTimeseries`, filtering early and correlating across logs/traces/metrics in **Grail**.
- **OpenPipeline** processes data at ingest — parse, enrich, **mask PII**, route to buckets, derive metrics — making queries cheaper and keeping sensitive data out of storage.
- Govern access with **management zones** (which entities) plus **IAM/DQL policies** (which actions and data).
- **Davis** auto-baselines and clusters anomalies into causal **Problems**; tune sensitivity and use **maintenance windows** for high signal.
- Close the loop with **Monitoring as Code** (Monaco/Terraform), **Workflows** (AutomationEngine), and the **Site Reliability Guardian** as a release gate — and manage **consumption-based cost** by ingesting/retaining less.
