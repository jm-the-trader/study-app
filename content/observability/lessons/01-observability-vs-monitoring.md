# Observability vs. Monitoring

> **The one-sentence version:** Monitoring tells you *whether* the system is broken; observability lets you ask *why* — including questions you didn't think to ask in advance.

## Two related-but-different ideas

These terms get used interchangeably, but the distinction is real and useful:

- **Monitoring** — watching **known** signals against **predefined** thresholds. "Is CPU > 90%? Is the site returning 500s?" You decide *in advance* what to watch and alert on. Great for *known failure modes*.
- **Observability** — a *property* of a system: how well you can understand its internal state from its outputs (data), enough to **debug novel problems** you never anticipated. "Why are *only* Canadian users on the new checkout seeing slow responses, but only after 2pm?"

> 🔑 **Monitoring answers known questions; observability lets you ask new ones.** Modern systems (microservices, Kubernetes, autoscaling) fail in ways nobody predicted — so you instrument richly enough to investigate the *unknown unknowns*, not just watch a fixed dashboard.

Monitoring is part of observability, not its opposite. You still want alerts on known conditions; observability is the broader capability that also supports open-ended investigation.

## Why it matters now

A monolith on one server was easy to reason about — SSH in, read the log. A request today might cross a dozen services, three queues, and a database, across pods that come and go. When it's slow, *where*? Without good telemetry you're guessing. Observability is what makes distributed systems debuggable.

## The three pillars

Observability is conventionally built on three complementary data types:

| Pillar | What it is | Best at answering |
|---|---|---|
| **Metrics** | Numeric measurements over time (aggregated) | *Is* something wrong, and the overall trend? (cheap, always-on) |
| **Logs** | Timestamped records of discrete events | *What* exactly happened in this event? (detailed context) |
| **Traces** | The path of one request across services | *Where* in the system did the time/error occur? |

```
   METRICS ──► "error rate jumped at 14:02"        (detect: something's wrong)
   TRACES  ──► "the slow span is the payments call" (localize: where)
   LOGS    ──► "payments: connection pool exhausted" (explain: why)
```

> 💡 The pillars work **together**, and the magic is **correlation**: a metric shows error rate spiking → you pivot to **traces** to find which service/operation → you jump to that operation's **logs** for the exact error. A mature setup links them (a trace ID in your logs and metrics exemplars) so you can hop between them in one click.

## Telemetry: where the data comes from

All three pillars come from **telemetry** your applications and infrastructure emit. You get it by:

- **Instrumentation** — code that emits metrics/logs/spans (libraries, or auto-instrumentation).
- **Agents/collectors** — gather and forward telemetry (node exporters, log shippers, the OpenTelemetry Collector).
- **Backends** — store and query it (Prometheus, Loki/Elasticsearch, Jaeger/Tempo) and visualize it (Grafana).

> 🔑 The emerging standard tying this together is **OpenTelemetry (OTel)** — a vendor-neutral set of APIs, SDKs, and a collector for all three signals. Instrument with OTel once, send to whatever backend you choose, and avoid vendor lock-in. (Details in the tracing lesson.)

## A platform engineer's mindset

- **Instrument from the start** — observability bolted on after an incident is too late.
- **You can't fix what you can't see** — invest in telemetry like you invest in tests.
- **Optimize for unknown questions** — high-cardinality, contextual data beats a wall of pre-canned graphs when something genuinely new breaks.

## Check yourself

1. In one sentence each, how do monitoring and observability differ — and how are they related?
2. Name the three pillars and the question each is best at answering.
3. Why is correlation between the pillars (e.g. a shared trace ID) so valuable during an incident?

## Key takeaways

- **Monitoring** watches known signals/thresholds (known failures); **observability** is the broader ability to investigate **novel** problems from rich telemetry.
- The **three pillars** — **metrics** (is it wrong? trend), **logs** (what happened?), **traces** (where?) — are complementary and most powerful when **correlated**.
- Telemetry flows from **instrumentation → collectors → backends → visualization**; **OpenTelemetry** is the vendor-neutral standard across all three signals.
- Instrument early and for **unknown questions** — you can't debug what you can't see.
