# OpenShift SDN vs OVN-Kubernetes — and why it matters

> **The one-sentence version:** OVN-Kubernetes replaced OpenShift SDN because the platform needed things SDN structurally couldn't give — dual-stack, richer egress control, encryption, hardware offload — and Red Hat made OVN the default and the *only* supported path forward.

## Why it matters

This is the comparison that shows up in design reviews, upgrade planning, and interviews. "Which CNI plugin and why?" isn't trivia — pick or stay on the wrong one and you hit a wall (no IPv6, no offload, an unsupported, removed plugin blocking your upgrade). Getting this right is part of the job.

## The head-to-head

| Dimension | OpenShift SDN | OVN-Kubernetes |
|---|---|---|
| **Status** | Deprecated (4.14), **removed (4.17)** | **Default** for new 4.x installs |
| **Foundation** | Open vSwitch + flow rules | OVN logical network on Open vSwitch |
| **Overlay** | **VXLAN** (UDP 4789) | **Geneve** (UDP 6081) |
| **IPv6 / dual-stack** | ❌ IPv4 only | ✅ Single-stack v6 and dual-stack |
| **NetworkPolicy** | ✅ (default mode) | ✅ via OVN ACLs (+ AdminNetworkPolicy in newer releases) |
| **Egress control** | Limited | ✅ Egress IP, egress firewall, egress router |
| **IPsec encryption** | ❌ | ✅ East-west pod traffic |
| **Hardware offload** (SmartNIC/DPU) | ❌ | ✅ |
| **Hybrid (Windows + Linux)** | ❌ | ✅ |
| **Project isolation** | Install-time *multitenant* mode (VNIDs) | Uniform policy via ACLs (no separate build) |

> 🔑 Read the table as a story, not a spec sheet: nearly every "❌ → ✅" is a capability modern clusters now *require*. That accumulation — not any single feature — is why the platform moved.

## The timeline you should be able to recite

- **Default since OpenShift 4.11** — OVN-Kubernetes became the default network plugin for new installations.
- **Deprecated in 4.14** — OpenShift SDN was marked deprecated.
- **Removed in 4.17** — OpenShift SDN is no longer available; a cluster still on SDN must migrate to OVN-Kubernetes **before** upgrading beyond 4.16.

> ⚠️ Version boundaries shift between releases — always confirm against the documentation for your exact OpenShift version before planning an upgrade. The direction, though, is settled: SDN is gone, OVN is the path.

## "Why it matters" — the four reasons that actually bite

**1. Upgrades are blocked by it.** Because SDN is removed in 4.17, an un-migrated cluster simply *cannot* move to current releases. This turns a "nice to modernize" into a hard prerequisite for staying supported and patched.

**2. Features you'll be asked for live only on OVN.** Dual-stack/IPv6 for public-sector or telco requirements; **egress IP** so traffic to an external firewall comes from a predictable address; **egress firewall** to restrict what namespaces can call out to; **IPsec** for encryption-in-transit compliance. None of these are bolt-ons you can add to SDN.

**3. Performance and cost.** **Hardware offload** to SmartNICs/DPUs moves packet processing off host CPUs — meaningful at scale, and only available on OVN-Kubernetes.

**4. Operational consistency.** OVN folds connectivity, NetworkPolicy (ACLs), and Service load balancing into **one** model with a clear control plane (NB DB → northd → SB DB → ovn-controller). One mental model to debug instead of several.

## Migrating from SDN to OVN-Kubernetes

You don't reinstall — you **migrate** the existing cluster, changing the `networkType` and letting the Cluster Network Operator rewire the data plane:

- The classic path is an **offline (limited-downtime) migration**: the CNO reconfigures networking and nodes reboot in a controlled rollout.
- Newer releases add a **limited live migration** that reduces disruption. Support and exact steps depend on your version, platform, and which features (egress IP, multicast, etc.) you use.

```bash
# Which engine is this cluster on right now?
oc get network.config/cluster -o jsonpath='{.spec.networkType}{"\n"}'

# Migration is driven by patching the network config and is orchestrated by the
# Cluster Network Operator — always follow the migration guide for YOUR version;
# do not hand-edit this on a production cluster without the runbook.
```

> 💡 Plan a migration around your *egress* footprint: egress IPs, egress firewall rules, and multicast are where behavior differs most, so inventory them first. Validate in a non-prod cluster before touching production.

## Check yourself

- Give three concrete capabilities that would *force* a team onto OVN-Kubernetes rather than OpenShift SDN.
- Your cluster is on OpenShift SDN and you need to upgrade to a 4.17+ release. What must happen first, and why is it non-negotiable?
- "We'll just stay on SDN, it works fine." What's the strongest counter-argument, even for a cluster that doesn't need IPv6 today?

## Key takeaways

- OVN-Kubernetes is the **default and the only forward-supported** plugin; OpenShift SDN is **deprecated (4.14) and removed (4.17)**.
- The migration is driven by features SDN **structurally lacks**: dual-stack/IPv6, egress IP/firewall, IPsec, hardware offload, hybrid networking.
- It's not optional housekeeping — SDN's removal **blocks upgrades**, so migrating is a prerequisite for staying on a supported, patched platform.
- Moving engines is an **in-place migration** managed by the Cluster Network Operator (offline, or limited live migration in newer releases) — plan it around egress/multicast and test in non-prod first.
