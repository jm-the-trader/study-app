# What Is Dynatrace?

> **The one-sentence version:** Dynatrace is a commercial, all-in-one **observability platform** that aims to *automatically* discover, instrument, and analyze your entire stack — so instead of assembling and wiring up Prometheus + ELK + Jaeger yourself, you deploy one agent and the platform figures most of it out.

> 📌 Dynatrace is a commercial SaaS product that evolves quickly. This topic teaches its **architecture and core concepts** — which are stable — rather than UI details or pricing specifics, which change. Always confirm current specifics in Dynatrace's own docs.

## Where it fits versus what you've learned

In the Observability topic you built up the three pillars and saw the **DIY open-source approach**: Prometheus for metrics, ELK/Loki for logs, Jaeger/Tempo for traces, Grafana to visualize, and *you* instrument, integrate, and operate all of it. Dynatrace is the opposite philosophy: a **single integrated platform** that bundles metrics, traces, logs, real-user monitoring, and more, with heavy **automation and AI** on top.

> 🔑 **DIY stack = maximum control + flexibility, but you build/operate the plumbing and instrument apps yourself. Dynatrace (and other commercial APMs) = far less manual work via automatic instrumentation + AI, at the cost of money and some control/lock-in.** Neither is "right" — it's a classic build-vs-buy trade-off, and many orgs run both.

## The four ideas that define Dynatrace

You'll meet each in depth in later lessons; here's the map of what makes it distinctive:

1. **OneAgent — automatic, full-stack instrumentation.** One agent per host auto-discovers processes and instruments them **at the code level with no manual code changes** — capturing metrics, traces, and more out of the box.
2. **Smartscape — automatic topology.** Dynatrace continuously builds a live dependency map of every **entity** (hosts, processes, services, pods, applications) and how they relate — you don't draw it; it's discovered.
3. **Davis — causal AI.** Instead of you wiring up thresholds for everything, Dynatrace's AI engine detects anomalies and computes **root cause** automatically, surfacing **problems** (not just isolated alerts).
4. **Grail + DQL — a unified data lakehouse.** Logs, metrics, traces, and events land in one store you query with the **Dynatrace Query Language**, keeping context across signals.

## What it covers (the "full stack")

- **Infrastructure** — hosts, containers, Kubernetes/OpenShift, cloud services, network.
- **Applications / APM** — services, distributed traces (PurePath), code-level detail, database calls.
- **Digital experience** — **Real User Monitoring (RUM)** (actual browser/mobile users) and **Synthetic** monitoring (scripted checks).
- **Logs** — ingestion and analytics in Grail, correlated with the rest.
- **Application security** — runtime vulnerability detection (e.g. surfacing vulnerable libraries in running services).
- **Automation/AIOps** — workflows that act on problems.

## Why teams choose it

- **Time-to-value & low instrumentation effort** — deploy OneAgent, get deep telemetry across the fleet quickly, without app code changes.
- **Automatic dependency mapping** — Smartscape answers "what depends on this?" in dynamic, ever-changing environments.
- **AI-driven root cause** — Davis reduces alert noise to a smaller set of *problems* with a probable cause, which matters at scale.
- **One pane of glass** — correlated metrics/traces/logs/RUM in a single platform.

The flip side: it's a **paid platform** (consumption-based licensing), and the automation means a bit less low-level control than a hand-built stack. Understanding *both* approaches makes you a stronger platform engineer.

## Check yourself

1. Contrast the DIY open-source observability approach with Dynatrace's approach — what's the core trade-off?
2. Name the four ideas that make Dynatrace distinctive and, in a phrase, what each does.
3. Beyond metrics/logs/traces, what additional areas does Dynatrace's "full stack" cover?

## Key takeaways

- Dynatrace is a **commercial, integrated, AI-driven observability platform** — the build-vs-**buy** alternative to assembling Prometheus + ELK + Jaeger + Grafana yourself.
- Its four pillars: **OneAgent** (auto full-stack instrumentation), **Smartscape** (auto topology), **Davis** (causal AI root cause → **problems**), and **Grail + DQL** (unified data + query).
- It spans **infra, APM, digital experience (RUM/synthetic), logs, and app security** in one platform.
- The trade-off vs. DIY: **less manual work, more automation/AI — at the cost of money and some control/lock-in.**
