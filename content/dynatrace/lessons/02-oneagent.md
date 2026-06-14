# OneAgent & Automatic Instrumentation

OneAgent is Dynatrace's signature: install **one agent per host** and it automatically discovers and deeply instruments everything running there — with **no manual code instrumentation**. Understanding how it works (and its companion, ActiveGate) explains why Dynatrace feels "automatic."

## The contrast with manual instrumentation

In the Observability topic, getting traces meant adding OpenTelemetry SDKs/spans to your code, exposing `/metrics`, and shipping logs — *you* instrument. OneAgent flips this:

> 🔑 **You install OneAgent on the host; it auto-discovers running processes and injects instrumentation into them — capturing metrics, distributed traces, and code-level detail without changing application code.** That "deploy once, see everything" experience is Dynatrace's core value proposition and the biggest day-to-day difference from a DIY stack.

## What OneAgent captures

A single OneAgent on a host provides **full-stack** visibility:

- **Host metrics** — CPU, memory, disk, network (like a node exporter, but automatic).
- **Process & service detection** — it recognizes your Java/.NET/Node/Go/PHP/etc. processes and the **services** they expose.
- **Code-level tracing (PurePath)** — distributed traces down to method-level and database statements, stitched across services (next lessons).
- **Real User Monitoring injection** — it can auto-inject the RUM JavaScript into web apps it serves.
- **Logs & metadata** — log access and rich context (which host, container, pod, k8s namespace, cloud tags).

How the deep instrumentation works (conceptually): OneAgent hooks into supported runtimes (e.g. injecting into the JVM/CLR, intercepting at the process level) so it can observe calls **without you adding code**. The exact mechanism varies by technology, but the experience is consistent: discovery and instrumentation happen for you.

## ActiveGate: the companion component

OneAgents don't usually talk straight to the Dynatrace cluster; an **ActiveGate** sits in between as a secure gateway and worker:

- **Routing/proxy** — OneAgents send data to a local ActiveGate, which forwards it to Dynatrace (reducing outbound connections and crossing network boundaries cleanly).
- **Remote/agentless monitoring** — collects from things you *can't* put OneAgent on: cloud APIs (AWS/Azure/GCP), VMware, network devices, databases, Kubernetes API.
- **Synthetic execution** — runs scripted browser/HTTP synthetic monitors from chosen locations.
- **Buffering & compression** for efficiency.

> 💡 Rule of thumb: **OneAgent = deep monitoring of hosts you control (install it there); ActiveGate = the gateway plus agentless/remote monitoring and synthetics.** A typical deployment has many OneAgents reporting through one or a few ActiveGates.

## Deployment models

- **Per-host install** — package on VMs/bare metal (often automated via your config management / golden images).
- **Kubernetes/OpenShift** — the **Dynatrace Operator** deploys OneAgent (commonly as a DaemonSet — recall DaemonSets run one pod per node) plus an in-cluster ActiveGate, and enriches data with k8s metadata. (Covered more in the operating lesson.)
- **Application-only / cloud-native modes** exist for environments where a full host agent isn't appropriate (e.g. certain serverless/PaaS), instrumenting just the app.

## Trade-offs to keep honest

- ✅ **Minimal effort, maximal coverage** — huge for large or fast-changing fleets.
- ✅ **Consistency** — every host instrumented the same way; auto-updates.
- ⚠️ **Agent footprint & trust** — it's a privileged agent doing deep injection; validate performance overhead and security posture, and stage rollouts.
- ⚠️ **Less granular control** than hand-written instrumentation (though you can add **custom metrics/spans** via OpenTelemetry/APIs where you need them — Dynatrace ingests OpenTelemetry too).

## Check yourself

1. What is the fundamental difference between OneAgent and the manual (OpenTelemetry) instrumentation from the Observability topic?
2. What does a single OneAgent on a host capture across the "full stack"?
3. When do you need an ActiveGate rather than (or in addition to) OneAgent?

## Key takeaways

- **OneAgent** installs once per host and **automatically discovers and instruments** processes/services at code level — **no manual instrumentation** — capturing host metrics, services, traces, RUM, and logs.
- **ActiveGate** is the gateway/worker: it routes OneAgent data, performs **agentless/remote** monitoring (cloud APIs, network, k8s) and runs **synthetic** checks.
- Deploy via host install, the **Dynatrace Operator** on Kubernetes/OpenShift (OneAgent as a DaemonSet), or app-only modes.
- The trade-off is **effort-saving automation vs. agent footprint/trust and less low-level control** — you can still add custom OpenTelemetry metrics/spans where needed.
