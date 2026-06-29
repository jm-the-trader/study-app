# The OpenShift pod network model

> **The one-sentence version:** OpenShift promises that *every pod gets its own IP and can talk to every other pod directly, with no NAT in between* — and almost everything else in cluster networking exists to keep that promise.

## Why it matters

When you deploy an app to OpenShift, you don't configure IP addresses, you don't open ports between hosts, and you don't set up routes by hand. You just say "run this pod," and somehow it can reach a database pod three nodes away by its IP. That "somehow" is the part most people skip — and then can't debug when it breaks.

Understanding the model first makes the rest (CNI, OpenShift SDN, OVN-Kubernetes, Services, NetworkPolicy) click into place, because they're all just *implementations* of this one contract.

## The contract every cluster must satisfy

Kubernetes — and therefore OpenShift, which is Kubernetes plus Red Hat's platform layer — defines a deliberately strict network model. Any conforming cluster must guarantee:

1. **Every pod has its own unique, cluster-wide IP address.** Not shared with the node, not shared with other pods.
2. **Pods can reach any other pod on any node directly — without NAT.** The IP a pod sees itself as is the same IP other pods use to reach it.
3. **Agents on a node** (the kubelet, system daemons) **can reach all pods on that node.**

> 🔑 The key idea: the cluster is designed to look like **one big flat network of pods**, as if every pod were a VM on the same LAN. NAT and port-mapping — the things that make container networking on a single Docker host so fiddly — are explicitly *banned* between pods.

## Why this is harder than it sounds

Your nodes are real machines (or VMs) with their own IPs on some physical network. The pods live *inside* those nodes, each in its own Linux **network namespace** — an isolated copy of the network stack with its own interfaces, routes, and firewall rules.

So a packet from `pod-A` on `node-1` to `pod-B` on `node-2` has to:

- leave pod-A's namespace,
- cross node-1's stack and out its physical NIC,
- traverse the physical network *(which knows nothing about pod IPs)*,
- arrive at node-2, and
- be delivered into pod-B's namespace.

The physical network only knows how to route between *node* IPs. It has never heard of your pod IPs. Something has to bridge that gap.

> 💡 The usual trick is an **overlay network**: pod-to-pod packets get wrapped ("encapsulated") inside a normal node-to-node packet, shipped across the physical network, then unwrapped on the far node. The physical network just sees ordinary traffic between nodes. We'll see two encapsulation protocols later — VXLAN (OpenShift SDN) and Geneve (OVN-Kubernetes).

## Three address spaces to keep straight

OpenShift juggles three separate IP ranges, and confusing them is a classic source of bugs:

| Range | What it's for | Example default |
|---|---|---|
| **Cluster (pod) network** | IPs handed out to pods | `10.128.0.0/14` |
| **Service network** | Stable virtual IPs for Services | `172.30.0.0/16` |
| **Machine (node) network** | The real NICs of your nodes | your data-center / cloud subnet |

A pod IP is ephemeral — it dies with the pod. A Service IP is stable but virtual (no machine actually owns it). We'll come back to Services; for now just notice they're *different networks* with *different lifetimes*.

## Where the plugin comes in

Here's the crucial design decision: **Kubernetes itself does not implement any of this.** Core Kubernetes defines the contract above and then delegates the actual wiring to a pluggable component. That component speaks a standard called **CNI** (Container Network Interface), and it's the subject of the next lesson.

This is why two clusters can both be "OpenShift" and yet move packets in completely different ways — one on OpenShift SDN, one on OVN-Kubernetes. Same contract, different engine under the hood.

## Check yourself

- Why is "no NAT between pods" such an important rule? What would break if a pod saw a different source IP than the one others use to reach it?
- A pod IP and a Service IP both look like normal IPv4 addresses. What's fundamentally different about their *lifetime* and what *owns* them?
- The physical network has no knowledge of pod IPs. In one sentence, how does an overlay get a pod-to-pod packet across it anyway?

## Key takeaways

- OpenShift's network model guarantees **one unique IP per pod** and **direct, NAT-free pod-to-pod reachability** across the whole cluster.
- Pods live in isolated **network namespaces** inside nodes; the physical network only routes between *node* IPs, so a network plugin must bridge the two — usually via an **overlay** that encapsulates pod traffic.
- Keep the **pod network**, **service network**, and **machine network** mentally separate — they have different owners and lifetimes.
- Kubernetes defines the contract but **delegates the implementation to a CNI plugin** — which is exactly why OpenShift can ship more than one networking engine.
