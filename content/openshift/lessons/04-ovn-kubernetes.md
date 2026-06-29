# OVN-Kubernetes: the default engine

> **The one-sentence version:** OVN-Kubernetes is OpenShift's current default network plugin — it describes your cluster network as *logical* switches and routers using **OVN**, then compiles that down to real Open vSwitch flows on every node.

## Why it matters

OVN-Kubernetes is the default for new OpenShift 4 clusters and the destination of every SDN migration. When something is mysteriously dropping pod traffic, the difference between "I'm stuck" and "I know which database to query" is understanding OVN's control plane. This lesson builds that map.

## The leap: from flow rules to a logical network

OpenShift SDN thought in terms of low-level OVS **flow rules** on each node. OVN-Kubernetes raises the abstraction. **OVN (Open Virtual Network)** — a sub-project of Open vSwitch — lets you declare a **logical network** out of familiar pieces:

- **Logical switches** (a virtual L2 segment, e.g. one per node for its pods),
- **Logical routers** (route between switches; there's a cluster distributed router),
- **ACLs** (access-control rules — this is how `NetworkPolicy` is enforced),
- plus **load balancers, NAT, and DHCP**, all as logical objects.

> 🔑 The key shift: you describe *what* the network should look like (these switches, these routers, these ACLs), and OVN figures out the per-node OpenFlow rules to make it real. It's the same declarative spirit as the rest of Kubernetes, applied to the network itself.

## The control plane: two databases and two daemons

This is the part worth memorizing, because every OVN troubleshooting path runs through it:

| Component | Role |
|---|---|
| **Northbound DB (nbdb)** | The **desired logical** network — switches, routers, ACLs. The "what I want." |
| **ovn-northd** | A translator daemon: reads the NB DB and compiles it into **logical flows**. |
| **Southbound DB (sbdb)** | The compiled **logical flows** + which physical node (chassis) is where. |
| **ovn-controller** | Runs on **every node**; reads the SB DB and programs concrete **OpenFlow** rules into that node's local OVS. |

So the pipeline is a compiler:

```
K8s objects (Pods, Services, NetworkPolicies)
        │   (ovnkube control plane watches the API and writes intent)
        ▼
   Northbound DB   ──ovn-northd──▶   Southbound DB
   (logical intent)                  (logical flows)
                                          │  (ovn-controller on each node)
                                          ▼
                                  OpenFlow rules in local OVS  ──▶  packets move
```

The OpenShift-specific glue is **ovnkube**: an **ovnkube control-plane** component watches the Kubernetes API and writes your Pods/Services/NetworkPolicies into the NB DB as logical objects, and an **ovnkube-node** (with `ovn-controller`) runs on every node to realize them. You'll see these as pods in the `openshift-ovn-kubernetes` namespace.

```bash
# The OVN-Kubernetes components live here:
oc get pods -n openshift-ovn-kubernetes
# ovnkube-node-xxxxx run on every node; the control-plane pods manage the DBs.
```

> 💡 Debugging heuristic: if the *desired* state is wrong, suspect the NB DB / ovnkube control-plane (did your NetworkPolicy translate into an ACL?). If desired looks right but a *single node* misbehaves, suspect that node's `ovn-controller` / local OVS.

## Crossing nodes: Geneve, not VXLAN

OVN-Kubernetes uses a different overlay envelope than SDN: **Geneve** (Generic Network Virtualization Encapsulation), on UDP port **6081**, instead of VXLAN.

Why Geneve? VXLAN's header is fixed — a 24-bit network ID and not much else. **Geneve adds extensible TLV (type-length-value) option fields**, so the overlay can carry extra metadata along with each packet (for example, identifiers OVN uses internally). It's the more flexible, future-proof envelope — which is exactly why the OVN ecosystem standardized on it.

> 🔑 If you remember one fact for the SDN-vs-OVN comparison: **SDN → VXLAN, OVN-Kubernetes → Geneve.** Same overlay idea, more extensible envelope.

## Services without a separate kube-proxy

In a typical kube-proxy cluster, Service virtual IPs are implemented with iptables or IPVS rules. OVN-Kubernetes instead implements Services using **OVN load balancers** directly in the data plane. The practical effect: **east-west Service load balancing is handled by OVN itself**, so there's no separate iptables-based kube-proxy doing that work. One engine owns pod connectivity, policy, *and* service load balancing.

## Check yourself

- Put the four control-plane pieces in order for a new NetworkPolicy to take effect: NB DB, ovn-northd, SB DB, ovn-controller. Where does each fit?
- A NetworkPolicy isn't being enforced on *one* node, but works everywhere else. Which component would you look at first, and why?
- What does Geneve give OVN that VXLAN's fixed header doesn't — and what's the port number you'd look for in a packet capture?

## Key takeaways

- OVN-Kubernetes is the **default** OpenShift network plugin; it models the cluster as a **logical network** (switches, routers, ACLs, load balancers) using **OVN** on top of Open vSwitch.
- Its control plane is a compiler: **NB DB (desired)** → **ovn-northd** → **SB DB (logical flows)** → **ovn-controller** (per node) → **OpenFlow in OVS**. OpenShift's **ovnkube** components translate Kubernetes objects into NB-DB intent.
- It uses the **Geneve** overlay (UDP 6081), whose **extensible TLV options** make it more flexible than SDN's **VXLAN**.
- It implements **Services with OVN load balancers**, folding service load balancing into the same engine instead of a separate kube-proxy.
