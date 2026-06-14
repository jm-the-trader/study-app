# Kibana: Explore, Visualize & Alert

Kibana is the window into your Elastic data — where engineers actually *use* the stack day to day. This lesson covers the core workflows: connecting to data, exploring logs, building dashboards, and alerting.

## Data views (index patterns) — the starting point

Before Kibana can show anything, you tell it which indices to read via a **data view** (formerly **index pattern**) — usually a wildcard like `app-logs-*` that matches your daily indices, plus which field is the time field (`@timestamp`).

> 💡 Time-based data views with a wildcard are why Kibana can seamlessly search across `app-logs-2026.06.12`, `…06.13`, … as if they were one dataset, while each day stays a separate, independently-manageable index (important for the lifecycle lesson).

## Discover: interactive log exploration

**Discover** is where you live during an incident — a searchable, filterable, time-bound view of raw documents:

- Type **KQL** in the search bar (`status: 500 and service: "payments"`).
- Set the **time range** (last 15m, last 24h, custom) — almost every Kibana view is time-scoped.
- Add **field filters** by clicking values; pick which fields show as columns.
- See the **histogram** of matching documents over time at a glance (a spike = something happened then).

> 🔑 Discover is the log-investigation tool: **filter by time + query, eyeball the volume histogram, drill into individual documents.** It's the ELK equivalent of "tail the logs and grep" — but across your whole fleet, structured and instant.

## Visualizations and dashboards

Kibana turns aggregations (last lesson) into visuals. The modern builder is **Lens** (drag-and-drop fields onto a chart); there are also TSVB, maps, and more. Common chart types:

- **Line/area** over a `date_histogram` — error rate, throughput over time.
- **Bar/pie** over a `terms` agg — top endpoints, status-code breakdown.
- **Data table** — top-N with metrics.
- **Metric/gauge** — a single big number (today's error count).
- **Maps** — geo-IP request origins.

A **dashboard** assembles visualizations onto one time-synced page. Best practices echo the Observability topic: **design a dashboard to answer a question** ("is the API healthy?"), lead with the most important signals, prefer percentiles over averages, and don't build a 50-panel wall nobody reads.

## Alerting

Kibana (with the Elastic Stack's alerting features) lets you define **rules** that run on a schedule and trigger **actions** when a condition holds:

- **Rule types:** threshold on a metric/log count (e.g. "> 100 5xx in 5 minutes"), Elasticsearch query rules, anomaly detection (with ML), uptime, security rules.
- **Connectors/actions:** notify Slack, email, PagerDuty, webhooks, ServiceNow, etc.

> ⚠️ The same alerting discipline from the Observability topic applies here: **alert on actionable symptoms, not noise.** A log-count rule that pages on every transient blip causes alert fatigue. Tie thresholds to real user impact and use appropriate severities.

## Other useful Kibana surfaces

- **Stack Management** — data views, index lifecycle policies, mappings, users/roles.
- **Dev Tools → Console** — a built-in REST console to run Query DSL against Elasticsearch (great for learning and debugging — it autocompletes the API).
- **Observability & Security apps** — opinionated UIs for APM, logs, uptime, and SIEM built on the same data.

## A typical incident flow in Kibana

```
1. Dashboard shows a 5xx spike at 14:02         (detect)
2. Click into Discover, KQL: status:5xx service:payments, last 30m   (investigate)
3. Read the histogram + sample documents → "connection pool exhausted"  (explain)
4. (Correlate with traces via trace_id, fix, watch the dashboard recover)
```

That's the metrics/logs correlation from the Observability topic, performed inside Kibana.

## Check yourself

1. What is a data view (index pattern), and why is the wildcard (`app-logs-*`) useful?
2. What do you primarily use **Discover** for, and what does the volume histogram tell you?
3. What alerting principle from the Observability topic must you carry into Kibana rules?

## Key takeaways

- A **data view** (wildcard + time field) tells Kibana which indices to read; **Dev Tools Console** runs raw Query DSL.
- **Discover** is the interactive, time-scoped log-investigation tool (KQL + filters + the volume histogram).
- Build **visualizations** (Lens) from aggregations and assemble **dashboards** that answer a question (signals first, percentiles over averages).
- **Alerting** rules + connectors notify on conditions — but **alert on actionable symptoms**, not noise, to avoid fatigue.
