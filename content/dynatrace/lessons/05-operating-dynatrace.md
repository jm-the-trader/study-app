# Operating Dynatrace in Practice

You know the architecture; this lesson is about *running* Dynatrace day to day — problems and alerting, SLOs, monitoring Kubernetes/OpenShift, managing config as code, and the licensing model that drives cost decisions.

## Problems, alerting & notifications

Recall that Davis produces **problems** (consolidated, root-caused incidents). Operating Dynatrace means routing those well:

- **Notification integrations** — send problems to Slack, email, PagerDuty/Opsgenie, ServiceNow, Microsoft Teams, webhooks.
- **Alerting profiles** — control *which* problems notify *whom*, by severity, entity tags, or management zones — so the database team isn't paged for a frontend issue.
- **Severity & impact** — Dynatrace classifies problems (availability, error, slowdown, resource, custom) and shows user/service impact, so you can prioritize.

> ⚠️ The Observability topic's alerting discipline still applies — **route on actionable, impactful problems**. Davis already reduces noise by grouping symptoms, but *you* still tune detection sensitivity, configure **maintenance windows** (suppress alerts during planned work), and set alerting profiles so notifications stay meaningful.

## SLOs

Dynatrace supports defining **Service Level Objectives** natively — pick or build an **SLI** (e.g. availability, success rate, latency threshold), set a **target** over a window, and track the **error budget** and burn (exactly the SLI/SLO/error-budget model from the Observability topic). SLO status can itself drive alerts and dashboards.

## Monitoring Kubernetes & OpenShift

This is a core use case for platform engineers:

- Deploy via the **Dynatrace Operator** (installed by Helm/manifests). It rolls out **OneAgent** (commonly a DaemonSet — one per node) and an in-cluster **ActiveGate**.
- You get **automatic workload discovery** (deployments, pods, namespaces), node/cluster health, and Kubernetes events — all enriched with k8s metadata and placed on Smartscape.
- **OpenShift** is supported with its specifics in mind (recall the OpenShift topic: SCCs/non-root requirements) — the operator is built to deploy within those constraints.
- Pods and their PurePaths/logs are correlated to the owning workload, so a "problem" can be pinned to a specific Deployment.

## Monitoring as Code (automation)

A maturing Dynatrace practice — and a natural fit after the Git/Terraform topics — is managing Dynatrace **configuration as code** rather than clicking in the UI:

- **Monaco (Monitoring as Code)** — a CLI/format to define dashboards, alerting, SLOs, etc. as version-controlled config you deploy across environments.
- **Terraform provider** — manage Dynatrace configuration with Terraform (same plan/apply/state discipline from the Terraform topic).
- **APIs** — Dynatrace exposes extensive REST APIs for automation and CI/CD integration.

> 💡 Treating monitoring config as code gives you the same wins as IaC: review in PRs, reproduce across tenants/environments, avoid configuration drift, and roll back. It's the observability counterpart to everything in the Terraform topic.

## Licensing & cost awareness

Dynatrace is **consumption-based** (the Dynatrace Platform Subscription model): you're billed by usage dimensions such as **host-hours** of full-stack monitoring, **data ingested/retained** (logs, events, traces), synthetic actions, RUM sessions, and DQL query volume. Exact units and rates change — check current docs/your contract.

> ⚠️ **Cost is an engineering concern here.** Because pricing tracks data volume and monitored hosts, decisions like log ingestion volume, trace/RUM sampling, retention, and which hosts get full-stack monitoring directly affect the bill. Right-size ingestion and retention deliberately — the same "retention is a cost decision" lesson from ELK's ILM, applied to a SaaS meter.

## Deployment models

- **SaaS** — Dynatrace hosts the cluster (most common; you run OneAgents/ActiveGates).
- **Managed** — Dynatrace cluster runs in your own infrastructure (for data-residency/compliance needs).

## Check yourself

1. What is an alerting profile for, and which alerting principles from the Observability topic still apply with Davis?
2. How is Dynatrace deployed on Kubernetes/OpenShift, and what does the operator roll out?
3. Why is Dynatrace cost an *engineering* concern, and which knobs most affect it?

## Key takeaways

- Davis **problems** flow to your tools via **notification integrations** and **alerting profiles** (route by severity/tags); still tune sensitivity and use **maintenance windows** — alerting discipline persists.
- Dynatrace supports native **SLOs / error budgets**, and monitors **Kubernetes/OpenShift** via the **Dynatrace Operator** (OneAgent DaemonSet + ActiveGate) with automatic workload discovery.
- Manage config **as code** with **Monaco**, the **Terraform provider**, and **APIs** — IaC discipline for observability (review, reproduce, no drift).
- Licensing is **consumption-based**, so **ingestion volume, sampling, retention, and monitored hosts are cost decisions** to right-size; deploy as **SaaS** or **Managed**.
