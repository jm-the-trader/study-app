# OpenShift SDN: the legacy engine

> **The one-sentence version:** OpenShift SDN was OpenShift's original built-in network plugin — Open vSwitch plus a VXLAN overlay, with project isolation baked in — and it's worth understanding precisely *because* it's now being retired in favor of OVN-Kubernetes.

## Why it matters

You'll still meet OpenShift SDN on long-lived 4.x clusters, in migration runbooks, and in interview questions that probe whether you understand the trade-offs that pushed Red Hat toward OVN-Kubernetes. Knowing how SDN works — and where it runs out of road — is what makes the "why OVN?" story land.

> ⚠️ **Status, up front:** OpenShift SDN is **deprecated** (since OpenShift 4.14) and was **removed** in OpenShift 4.17 — clusters must migrate to OVN-Kubernetes before upgrading past 4.16. Treat SDN as something to *understand and migrate off*, not to deploy fresh. (Always confirm specifics against the docs for your exact version.)

## The building block: Open vSwitch

OpenShift SDN is built on **Open vSwitch (OVS)** — a programmable, software virtual switch that runs on every node. Think of OVS as a smart switch whose forwarding table you fill in with **flow rules** ("packets matching X → do Y") instead of letting it learn MACs on its own.

On each node, SDN creates an OVS bridge (`br0`) and connects every local pod to it. SDN's controller writes the flow rules that decide what happens to each packet: deliver locally, send to the overlay, drop, etc.

## Crossing nodes: the VXLAN overlay

When a pod talks to a pod on another node, SDN uses a **VXLAN** overlay:

- The original pod-to-pod packet is **encapsulated** inside a UDP packet (VXLAN uses UDP port **4789**) addressed node-to-node.
- It rides the physical network as ordinary node traffic, and the receiving node's OVS **decapsulates** it and delivers it to the target pod.

> 🔑 The mental model: VXLAN is an envelope. Your pod's packet is the letter; OVS stuffs it into a node-addressed envelope so the physical network — which only knows node IPs — can carry it, then the far node opens the envelope. This is the same overlay idea from Lesson 1, with VXLAN as the specific envelope format.

## Three modes — the part people forget

OpenShift SDN ships in **three modes**, chosen at install. The difference is entirely about *isolation*:

| Mode | Isolation | Use it when |
|---|---|---|
| **network-policy** (default) | Enforces Kubernetes `NetworkPolicy` objects | You want standard, fine-grained, opt-in policy |
| **multitenant** | Each project gets a unique **VNID**; traffic only flows within the same VNID | You want hard project-level separation by default |
| **subnet** | None — every pod can reach every pod | Flat, trusting clusters |

In **multitenant** mode, every project is tagged with a **VNID (Virtual Network ID)**. OVS flow rules only allow traffic between pods sharing a VNID, so projects are isolated from each other out of the box. One special case: **VNID 0** (the `default` project) is privileged — it can reach *all* projects and all can reach it, which is how cluster-wide infrastructure stays reachable.

> 💡 This three-mode design is a tell about SDN's age: isolation was a *mode you picked at install*, not a flexible policy you compose at runtime. OVN-Kubernetes instead does policy uniformly through ACLs — no separate "multitenant build."

## What it does well

- **It's simple and battle-tested.** OVS + VXLAN is a well-understood, widely deployed combination.
- **NetworkPolicy works** in the default mode.
- **Multicast** is supported (per-namespace).
- For a single-stack IPv4 cluster that never needed the advanced egress/dual-stack features, it was perfectly serviceable for years.

## Where it runs out of road

This is the list that explains the whole migration:

- **No dual-stack / IPv6.** OpenShift SDN is **IPv4-only**. As IPv6 and dual-stack became requirements, this alone was disqualifying.
- **Weaker egress controls.** Egress features exist but are more limited and less consistent than OVN-Kubernetes's egress IP / egress firewall.
- **No data-plane encryption (IPsec).**
- **No hardware offload** to SmartNICs/DPUs, so the data plane spends host CPU it doesn't have to.
- **No hybrid (Windows + Linux) networking.**
- **It's a dead-end branch.** Red Hat's investment — and the broader upstream direction — moved to OVN-Kubernetes, so SDN stopped gaining features and is now removed.

## Check yourself

- VXLAN wraps a pod packet inside a node-addressed UDP packet. Why is that wrapping necessary at all — what can't the physical network do on its own?
- In multitenant mode, two pods in *different* projects can't talk by default. What mechanism enforces that, and what's special about VNID 0?
- Name two capabilities a modern cluster might need that OpenShift SDN simply can't provide.

## Key takeaways

- OpenShift SDN is the **legacy** plugin: **Open vSwitch** on each node, a **VXLAN** (UDP 4789) overlay between nodes, with forwarding driven by OVS **flow rules**.
- It offers **three install-time modes** — *network-policy* (default), *multitenant* (VNID-based project isolation, with privileged VNID 0), and *subnet* (flat/no isolation).
- It's solid for single-stack IPv4 but **can't do dual-stack/IPv6, IPsec, hardware offload, hybrid networking**, and has weaker egress controls.
- It is **deprecated (4.14) and removed (4.17)** — understand it mainly to migrate off it toward **OVN-Kubernetes**.
