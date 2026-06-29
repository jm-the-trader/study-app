# CNI: the pluggable network layer

> **The one-sentence version:** CNI is the standard plug socket that lets Kubernetes say "give this new pod a network" without caring *who* answers — and that one bit of decoupling is why an entire ecosystem of network plugins exists.

## Why it matters

In the last lesson we said Kubernetes defines the network *contract* but doesn't implement it. **CNI — the Container Network Interface — is the seam where that hand-off happens.** Understanding it tells you exactly which component to blame when a pod comes up with no IP, and it explains why OpenShift can offer a *choice* of network engines (OpenShift SDN, OVN-Kubernetes) in the first place.

## What CNI actually is

CNI is a **CNCF specification** plus a set of libraries and reference plugins. It is deliberately tiny. At its heart it defines:

- A **contract**: a plugin is just an executable that, given some JSON config on stdin and an operation, sets up or tears down networking for *one* container's network namespace.
- A small set of **operations**: `ADD` (wire this pod up — create interfaces, assign an IP, add routes), `DEL` (tear it down), `CHECK`, and `VERSION`.

That's essentially it. The genius is in what it *doesn't* mandate: it says nothing about *how* you move packets. Overlay, BGP routing, eBPF — all fair game, as long as you honor the `ADD`/`DEL` contract.

> 🔑 The key insight: CNI turns "pod networking" into a **replaceable part**. Kubernetes holds a standard socket; any plugin that fits can be plugged in. That's the whole reason the plugin ecosystem (Calico, Cilium, Flannel, OpenShift SDN, OVN-Kubernetes…) could flourish.

## Who calls the plugin, and when

The flow when a pod is scheduled onto a node:

1. The **kubelet** decides a pod needs to run and asks the container runtime to create the pod's **sandbox** (the shared network namespace all containers in the pod use).
2. The runtime — in OpenShift that's **CRI-O** — invokes the configured **CNI plugin** with `ADD`.
3. The plugin does the real work: creates a **veth pair** (a virtual cable), puts one end in the pod's namespace as `eth0`, leaves the other on the node, assigns an IP from the cluster network (its **IPAM** — IP Address Management — picks the address), and installs routes.
4. The plugin returns the assigned IP to the runtime, which reports it back to the kubelet. That's the IP you see in `oc get pod -o wide`.

When the pod dies, the same plugin is called with `DEL` and unwinds all of it, returning the IP to the pool.

```bash
# On a node, the CNI plugin binaries and their config live here:
ls /opt/cni/bin/             # the plugin executables
ls /etc/cni/net.d/           # the active CNI configuration

# From the cluster side, the chosen plugin shows up as the networkType:
oc get network.config/cluster -o jsonpath='{.spec.networkType}{"\n"}'
# -> OVNKubernetes   (or, on older clusters, OpenShiftSDN)
```

> ⚠️ "Pod stuck in `ContainerCreating` with `failed to set up sandbox … network`" is almost always a CNI problem — the plugin couldn't assign an IP or program the network. That's your signal to look at the network plugin's pods/logs, not at your app.

## Why pluggability is worth caring about

Because the *implementation* is swappable, you can pick a network plugin to match what you actually need:

| If you need… | A plugin can provide… |
|---|---|
| Strong, scalable network policy | ACL-based enforcement (OVN-Kubernetes, Calico, Cilium) |
| Encryption of pod traffic in flight | IPsec or WireGuard data-plane encryption |
| IPv6 / dual-stack | plugins that support dual-stack (OVN-Kubernetes does; OpenShift SDN does not) |
| Highest throughput / lowest CPU | eBPF or hardware-offload data planes |

Different teams, different trade-offs — same Kubernetes API on top.

## How OpenShift manages all this for you

You rarely touch CNI config files by hand on OpenShift. Instead, a dedicated operator does it:

- The **Cluster Network Operator (CNO)** installs, configures, and continuously reconciles the cluster's networking components based on the `Network` custom resources.
- The field that selects the engine is **`spec.networkType`** in `network.config.openshift.io` — `OVNKubernetes` or `OpenShiftSDN`.
- It's chosen at **install time**. You don't flip it casually at runtime; switching engines is a deliberate **migration** (covered later), because it rewires every pod in the cluster.

> 💡 Think of the CNO as the manager that makes the *declarative* OpenShift promise extend all the way down to networking: you declare `networkType`, and the operator makes the nodes match — deploying the right DaemonSets, writing `/etc/cni/net.d`, and healing drift.

## Check yourself

- A pod is stuck in `ContainerCreating` with a sandbox network error. Which layer do you investigate first — your Deployment, or the network plugin? Why?
- CNI deliberately says nothing about *how* packets move between nodes. Why is that omission a feature, not a gap?
- What does the Cluster Network Operator do that you'd otherwise have to do by editing files on every node?

## Key takeaways

- **CNI** is a small CNCF standard: a network plugin is an executable the runtime calls with `ADD`/`DEL` to wire up or tear down a pod's network namespace and assign its IP.
- On OpenShift the kubelet → **CRI-O** → **CNI plugin** chain runs on every pod create; IPAM hands out the pod IP, and a `DEL` returns it on delete.
- Because the implementation is **pluggable**, you can choose an engine by its capabilities (policy, encryption, dual-stack, performance) without changing the Kubernetes API above it.
- OpenShift's **Cluster Network Operator** picks and manages the engine via **`networkType`**; you set it at install and *migrate* to change it.
