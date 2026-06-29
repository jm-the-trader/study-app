# Services, Routes, and NetworkPolicy

> **The one-sentence version:** Services give pods a stable inside address, Routes (and Ingress) expose them to the outside world, and NetworkPolicy decides who's allowed to talk to whom — and the network plugin is what actually enforces all three.

## Why it matters

Lessons 1–5 were about how packets move and which engine moves them. This one is about the objects *you* create every day. They sit directly on top of the plugin: a Service is load-balanced by OVN, a Route is served by the OpenShift router, a NetworkPolicy becomes OVN ACLs. Knowing the layering is what lets you reason about "why can't this reach that?"

## Services: a stable address for moving targets

Pods are mortal and their IPs churn. A **Service** is a stable **virtual IP (ClusterIP)** plus a load-balancing rule that fronts a set of pods selected by labels. Clients talk to the Service; the plugin (OVN load balancers, as we saw) spreads connections across the healthy pods behind it.

| Service type | What it gives you | Reach |
|---|---|---|
| **ClusterIP** (default) | A stable internal VIP | Inside the cluster only |
| **NodePort** | A fixed port on **every** node | External, but raw and port-limited |
| **LoadBalancer** | An external load balancer (cloud/MetalLB) | External, one LB per Service |
| **Headless** (`clusterIP: None`) | DNS returns pod IPs directly, no VIP | For stateful apps that need per-pod addressing |

> 🔑 A Service is *east-west plumbing*. It's how a frontend pod reaches the backend pods reliably despite restarts and rescheduling. It is **not** how you put an app on the public internet — that's the next part.

## Routes vs Ingress: getting traffic in

To expose an HTTP(S) app *outside* the cluster, OpenShift gives you two layered options:

- **Route** — OpenShift's **native** resource (it predates Kubernetes Ingress). A Route maps an external hostname (and optional path) to a Service. It's served by the **OpenShift router**, an **HAProxy**-based ingress controller running on the cluster that watches Routes and reconfigures itself.
- **Ingress** — the standard Kubernetes resource. On OpenShift the **Ingress Operator** implements Ingress objects by **creating Routes under the hood**. So Ingress works, but Routes are the lower-level primitive doing the real work.

Routes also own **where TLS terminates**, which is a frequent point of confusion:

| TLS mode | Where TLS terminates | Router → pod traffic |
|---|---|---|
| **edge** | At the router | Plain HTTP |
| **passthrough** | At the **pod** (router doesn't decrypt) | Encrypted; router routes by SNI |
| **reencrypt** | At the router, then **re-encrypted** to the pod | Encrypted on both legs |

> 💡 Rule of thumb: use **edge** for simple HTTPS, **reencrypt** when the backend must also see TLS (compliance/zero-trust), and **passthrough** when the pod must terminate TLS itself (e.g. mutual TLS or a protocol the router shouldn't touch).

## NetworkPolicy: who may talk to whom

By default, the flat pod network means **any pod can reach any pod**. A **NetworkPolicy** locks that down. It's a *namespaced* object that selects pods by label and then allow-lists ingress and/or egress traffic. The crucial, counter-intuitive rule:

> ⚠️ **A pod is unrestricted until it is selected by at least one policy. The moment any policy selects it for a direction, everything not explicitly allowed in that direction is denied.** So "default allow" flips to "default deny" *per pod, per direction* the instant a policy touches it.

```yaml
# Deny all ingress in a namespace, then layer allow-rules on top.
# This policy selects every pod ({} ) and allows no ingress -> nothing gets in.
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-ingress
  namespace: payments
spec:
  podSelector: {}          # selects all pods in the namespace
  policyTypes:
    - Ingress              # with no ingress rules below, all ingress is denied
```

The plugin enforces this for you — on OVN-Kubernetes each NetworkPolicy compiles into **OVN ACLs** (the SDN engine used OVS flow rules). Newer OVN-Kubernetes also supports **AdminNetworkPolicy**, a *cluster-scoped* policy for platform teams to set guardrails across namespaces.

> 💡 NetworkPolicy controls **pod-to-pod** traffic. To restrict where pods can reach **outside** the cluster (external IPs/domains), OpenShift adds a separate **EgressFirewall** resource — a plugin feature, not core Kubernetes, and one of the egress capabilities that's far stronger on OVN-Kubernetes.

## Check yourself

- A teammate exposed their app with a `ClusterIP` Service and is confused that they can't reach it from their laptop. What did they actually create, and what do they need instead?
- You applied a NetworkPolicy that allows traffic from the `frontend` pods to the `api` pods. Suddenly monitoring can't scrape the `api` pods either. Why — and what changed the instant that policy landed?
- An app must terminate TLS itself for mutual-TLS. Which Route TLS mode do you choose, and what does the router do with the bytes?

## Key takeaways

- A **Service** is a stable **ClusterIP** + label-based load balancing for **east-west** traffic; types (ClusterIP/NodePort/LoadBalancer/Headless) differ in reach.
- **Routes** are OpenShift's native external-exposure primitive served by the **HAProxy router**; **Ingress** on OpenShift is implemented *by creating Routes*. Routes pick the TLS mode: **edge / passthrough / reencrypt**.
- **NetworkPolicy** is namespaced and **default-allow until a pod is selected, then default-deny** for that direction; the plugin enforces it (**OVN ACLs** on OVN-Kubernetes).
- Restricting traffic *leaving* the cluster is a separate **EgressFirewall** plugin feature — one of OVN-Kubernetes's stronger egress capabilities.
