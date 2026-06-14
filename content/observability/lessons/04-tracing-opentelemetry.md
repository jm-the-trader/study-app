# Distributed Tracing & OpenTelemetry

Metrics tell you *something* is slow; logs tell you what one service saw. **Distributed tracing** answers the question those can't in a microservice world: *where, across all the services, did this one request spend its time or fail?*

## The problem tracing solves

One user request might flow: `gateway → auth → orders → payments → database`, plus a cache and a queue. It's slow. Which hop? Metrics show aggregate latency per service but not *this* request's journey; logs are scattered across services with no thread connecting them. You need to see the **whole request as one picture**.

> 🔑 **A trace follows a single request across every service it touches**, reconstructing its end-to-end path and timing. It's the pillar built specifically for **distributed** systems — turning "it's slow somewhere" into "the payments→bank call took 800ms of the 850ms total."

## Traces and spans

- A **span** is one unit of work — an operation in one service (an HTTP handler, a DB query, a function). It has a name, a start/end time (**duration**), and **attributes** (key/values like `http.status_code`, `db.statement`).
- A **trace** is a tree of spans for one request: a **root span** (the entry point) with **child spans** nested under it.

```
Trace  (trace_id = a1b2c3)
└─ gateway  /checkout                         [────────────── 850ms ──────────────]
   ├─ auth  verify                            [── 40ms ──]
   ├─ orders create                              [──── 120ms ────]
   └─ payments charge                                 [──────── 690ms ────────]
      └─ bank-api POST /charge                           [────── 800ms? ──────]  ← the culprit
```

Reading the waterfall, the slow span jumps out visually — that's the power of tracing.

## Context propagation: the key mechanism

How do spans in *different* services join the *same* trace? Through **context propagation**: the trace ID (and parent span ID) are passed along with each call, conventionally via HTTP headers (the W3C **`traceparent`** header). Each service reads the incoming context, creates its child span under it, and passes the context onward.

> 🔑 **Propagation is what makes a trace distributed.** If a service fails to forward the trace context, the trace "breaks" — downstream work shows up as a separate, disconnected trace. Consistent propagation across every service (and the queue/async boundaries) is the thing to get right.

This same trace ID is what you put in your **logs** (last lesson) so traces and logs correlate.

## OpenTelemetry (OTel): the standard

**OpenTelemetry** is the vendor-neutral CNCF standard for telemetry — a unified set of **APIs, SDKs, and a Collector** for traces (and increasingly metrics and logs too).

> 🔑 **Instrument once with OpenTelemetry, export anywhere.** OTel decouples *generating* telemetry from *storing* it: your code (or auto-instrumentation) emits OTel data, and you point it at any compatible backend — Jaeger, Tempo, Zipkin, or a commercial APM — without changing app code. This kills vendor lock-in, which is why it's become the default choice.

Two ways to instrument:

- **Auto-instrumentation** — drop-in agents/libraries that trace common frameworks (HTTP servers, gRPC, DB clients) with little/no code change. Great starting point.
- **Manual instrumentation** — create custom spans around your own important operations and add domain attributes.

### The OpenTelemetry Collector

A standalone service that **receives** telemetry, **processes** it (batch, filter, redact, sample), and **exports** it to one or more backends. Running a Collector means apps send to one place, and you control routing/sampling centrally.

```
apps (OTel SDK) → OTel Collector (process, sample) → Jaeger / Tempo / vendor
```

## Sampling: you can't keep everything

High-traffic systems generate enormous trace volume. **Sampling** keeps a representative subset to control cost:

- **Head sampling** — decide at the start (e.g. keep 10% of traces). Simple, but may miss rare errors.
- **Tail sampling** — decide after the trace completes (e.g. keep *all* traces that errored or were slow, plus a sample of normal ones). Smarter, done in the Collector.

> 💡 Tail-based sampling is popular because it keeps the traces you actually care about (errors, slow requests) while discarding routine ones — the best signal-to-cost ratio.

## Backends

Store and visualize traces in **Jaeger**, **Grafana Tempo**, or **Zipkin** (open source), or commercial APMs. Tempo pairs with Grafana so you can jump metrics → traces → logs in one UI.

## Check yourself

1. What does a trace show that per-service metrics and scattered logs cannot?
2. What is context propagation, and what happens to a trace if a service doesn't forward the context?
3. What does OpenTelemetry decouple, and why does that matter for vendor lock-in?

## Key takeaways

- A **trace** = a tree of **spans** following **one request across all services**; the waterfall view localizes *where* latency or errors occur.
- **Context propagation** (e.g. the `traceparent` header) ties spans across services into one trace — break it and the trace fragments.
- **OpenTelemetry** is the vendor-neutral standard: **instrument once, export anywhere** (Jaeger/Tempo/etc.), via SDKs/auto-instrumentation and the **Collector**.
- Use **sampling** (especially tail-based) to keep the valuable traces — errors and slow requests — at manageable cost; share the trace ID with logs for correlation.
