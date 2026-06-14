# SLOs, Dashboards & Alerting

Collecting telemetry is half the battle; the other half is turning it into **dashboards people read**, **alerts that fire only when they should**, and **objectives that define "good enough."** This lesson ties the pillars into operational practice.

## What to measure: the standard signal frameworks

Don't instrument randomly — use a proven framework so you cover what matters:

- **The Four Golden Signals** (Google SRE), the best default for any service:
  - **Latency** — how long requests take (watch the *tail*: p95/p99, not just the average).
  - **Traffic** — how much demand (requests/sec).
  - **Errors** — rate of failed requests.
  - **Saturation** — how *full* the system is (CPU, memory, queue depth, connections).
- **RED** (for request-driven services): **R**ate, **E**rrors, **D**uration.
- **USE** (for resources): **U**tilization, **S**aturation, **E**rrors.

> 🔑 Start every service with the **golden signals** (or RED). They answer "is it fast, is it working, is it overwhelmed?" — which covers the vast majority of incidents without drowning you in metrics.

## Dashboards that get read

- **Design for a question, not for completeness.** A good dashboard answers "is this service healthy?" at a glance — not 60 panels nobody scans.
- **Lead with the golden signals**, then drill-downs below.
- **Percentiles over averages** — averages hide pain. A 50ms average can mask a 3s p99 that's wrecking 1% of users.
- **Grafana** is the standard visualization layer, querying Prometheus (metrics), Loki (logs), and Tempo/Jaeger (traces) — letting you pivot across pillars in one place.

## SLIs, SLOs, and error budgets

This is how mature teams define and defend reliability:

- **SLI (Service Level Indicator)** — a *measured* number: e.g. "% of requests served < 300ms and without error."
- **SLO (Service Level Objective)** — your *target* for that SLI over a window: e.g. "99.9% of requests succeed within 300ms over 30 days."
- **Error budget** — the inverse of the SLO: 99.9% allows **0.1%** failures. That budget is a *resource* you can spend.

> 🔑 **Error budgets turn reliability into a number you manage, not a vague aspiration.** Plenty of budget left → ship features faster, take risks. Budget exhausted → freeze risky changes and prioritize stability. It also defuses the dev-vs-ops tug-of-war: the budget, not opinions, decides. (And 100% reliability is the wrong target — it's impossibly expensive and unnecessary; the SLO sets "good enough.")

## Alerting: the discipline that protects humans

Bad alerting is *worse* than none — it trains people to ignore pages. The cardinal rules:

> ⚠️ **Alert on symptoms, not causes; and alert on things that need a *human* now.** Page on "error rate breached the SLO" or "latency is hurting users," not on "CPU is 85%" (which may be perfectly fine). A high CPU that isn't affecting users is a *graph to look at*, not a 3am page.

- **Every page must be actionable and urgent.** If there's nothing to do, or it can wait until morning, it's not a page — make it a ticket or a dashboard.
- **Fight alert fatigue.** Noisy, non-actionable alerts get muted, and then the *real* one gets missed too. Ruthlessly delete alerts nobody acts on.
- **Tie alerts to SLOs / burn rate.** Alert when you're **burning the error budget too fast** (e.g. "at this rate you'll exhaust the 30-day budget in 2 hours"). This catches real user impact while ignoring harmless blips. Use **multi-window, multi-burn-rate** alerts: fast burn → page now; slow burn → ticket.
- **Severity tiers** — page (wake someone) vs. ticket (handle in hours) vs. info (FYI).

Mechanically, Prometheus **Alertmanager** evaluates alerting rules and routes/deduplicates/silences notifications to PagerDuty, Slack, email, etc.

## Putting the whole topic together

A healthy incident lifecycle uses everything you've learned:

```
SLO burn-rate alert fires (symptom, actionable)
   → DASHBOARD: golden signals show error spike in 'orders'
   → TRACES: the slow/erroring span is orders → payments
   → LOGS (by trace_id): "payments: connection pool exhausted"
   → fix, verify the metric recovers, restore the error budget
```

That flow — **detect (metrics/SLO) → localize (traces) → explain (logs)** — is observability doing its job.

## Check yourself

1. What are the four golden signals, and why start a new service with them?
2. Define SLI, SLO, and error budget — and how does an error budget guide whether to ship features or freeze?
3. Why alert on symptoms (e.g. SLO burn rate) rather than causes (e.g. high CPU)?

## Key takeaways

- Instrument with a framework — **golden signals** (latency, traffic, errors, saturation), **RED**, or **USE** — and watch **percentiles**, not averages.
- Build **dashboards that answer a question**; use **Grafana** to pivot across metrics, logs, and traces.
- **SLI → SLO → error budget** make reliability a managed number; spend budget on velocity, defend it when low (100% is the wrong target).
- **Alert on actionable symptoms** (SLO **burn rate**), not harmless causes; fight **alert fatigue** — every page must demand human action now.
