# Data: PurePath, RUM, Grail & DQL

This lesson covers *what* telemetry Dynatrace collects and *how you query it* — the distributed traces (PurePath), real-user data, the Grail data lakehouse, and the DQL query language.

## PurePath: code-level distributed tracing

**PurePath** is Dynatrace's distributed tracing technology. Conceptually it's the same idea as tracing from the Observability topic — follow one request across services — but captured **automatically by OneAgent** and typically down to **method-level and database statements**.

A PurePath shows, for a single transaction:

- The end-to-end path across every service it touched (the waterfall you know from tracing).
- **Code-level** detail within each service — which methods ran, how long each took.
- **Database calls** with the actual statements and timings.
- Contributing **metrics and context** (CPU, exceptions) along the path.

> 🔑 PurePath = distributed tracing **plus code-level + DB detail, captured without manual instrumentation**. Where DIY tracing tells you "the payments service span was slow," a PurePath can often show *which method or SQL query* inside payments was slow — because OneAgent instruments the code, not just the service boundaries.

Dynatrace also **ingests OpenTelemetry** traces/metrics/logs, so you can combine OTel-instrumented services (from the Observability topic) with OneAgent-captured PurePaths in one view — useful for languages/edges OneAgent doesn't auto-instrument.

## Digital experience: RUM and Synthetic

Beyond backend tracing, Dynatrace measures the **user's** experience:

- **Real User Monitoring (RUM)** — JavaScript (auto-injectable by OneAgent) and mobile agents capture *actual* users' page-load times, errors, Core Web Vitals, and user journeys — and link them to the backend PurePaths they triggered.
- **Synthetic monitoring** — scripted **browser** and **HTTP** checks run from chosen locations (via ActiveGate) to test availability/performance proactively, even when no real users are active (great for SLAs and off-hours).

> 💡 The power is **correlation end to end**: a slow checkout in RUM links to the exact backend PurePath, which links to the slow DB call and the logs — one continuous story from the user's click to the root cause. That cross-pillar correlation (Observability topic) is built-in here rather than stitched together.

## Grail: the unified data lakehouse

**Grail** is Dynatrace's data store — a **lakehouse** that holds logs, events, metrics, and traces together with full context, designed for massive, fast, **schema-on-read** queries.

- **Schema-on-read** — you don't predefine rigid schemas/indexes for logs; structure is applied at query time, so you can ask new questions of old data without reindexing (contrast with the careful mapping/sharding you plan in ELK).
- **Unified context** — keeping signals together (and tied to Smartscape entities) is what enables querying across logs + traces + metrics in one language.

## DQL: the Dynatrace Query Language

**DQL** is how you query Grail — a **pipe-based** language (each `|` transforms the stream), reminiscent of Unix pipes or other modern observability query languages:

```
fetch logs
| filter dt.entity.service == "payments" and loglevel == "ERROR"
| filter timestamp > now() - 1h
| summarize count(), by:{ bin(timestamp, 5m) }
```

```
fetch spans
| filter service.name == "checkout"
| summarize avg(duration), percentile(duration, 95), by:{ service.name }
```

> 🔑 Read DQL left to right as a pipeline: **fetch** a data type → **filter** → **summarize/aggregate** → sort/limit. The same language queries logs, spans, metrics, and events because they all live in Grail — a single query surface across signals, versus learning PromQL *and* the ES Query DSL *and* a trace UI separately.

## Putting the data layer together

```
OneAgent / OTel / ActiveGate  ──►  Grail (logs + metrics + traces + events, with entity context)
                                      ▲
              PurePath traces, RUM/synthetic feed in; query it all with DQL;
              Davis analyzes it; Smartscape gives it topology.
```

## Check yourself

1. What does a PurePath show that a typical DIY trace span does not, and why is Dynatrace able to capture it?
2. How do RUM and Synthetic monitoring differ, and what does linking RUM to PurePath give you?
3. What is "schema-on-read" in Grail, and how does DQL's pipe model let you query different signals the same way?

## Key takeaways

- **PurePath** is automatic distributed tracing with **code-level and database** detail — often pinpointing the slow *method/query*, not just the slow service; Dynatrace also **ingests OpenTelemetry**.
- **RUM** measures real users (and links to backend PurePaths); **Synthetic** runs scripted checks proactively — together giving end-to-end, correlated experience data.
- **Grail** is a **schema-on-read lakehouse** unifying logs/metrics/traces/events with entity context; **DQL** is the **pipe-based** query language across all of them (`fetch | filter | summarize`).
- The win is **one correlated data layer + one query language**, versus stitching PromQL + ES DSL + a trace UI in a DIY stack.
