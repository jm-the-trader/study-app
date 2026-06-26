# OpenShift Architecture: Operators All the Way Down

> **The one-sentence version:** OpenShift is a certified Kubernetes distribution where the *platform itself* — the API server, the router, the registry, monitoring — is installed and continuously reconciled by Operators running RHEL CoreOS nodes you're not meant to hand-edit.

If you've done the **Kubernetes & OpenShift** topic, you already know the building blocks (Pods, Deployments, Services). This topic goes a layer deeper into what makes OpenShift *OpenShift* — the parts an interviewer for an OpenShift role will actually probe. Let's start with the shape of a cluster.

## Why this matters

On a hand-rolled Kubernetes cluster, *you* are responsible for assembling and upgrading the control plane, the network plugin, ingress, the registry, and monitoring. OpenShift's pitch is that all of that is **packaged, integrated, and self-managing**. Understanding *how* it self-manages is the difference between "I've used OpenShift" and "I understand OpenShift."

## The nodes: RHEL CoreOS and immutability

OpenShift control-plane and worker nodes run **Red Hat Enterprise Linux CoreOS (RHCOS)** — a minimal, **immutable** OS image. You don't SSH in and `yum install` things; that would drift the node out of its declared state.

Instead, node configuration is declarative. The **Machine Config Operator (MCO)** takes `MachineConfig` objects (which describe files, systemd units, kernel args) and rolls them out to pools of nodes (`MachineConfigPool`), draining and rebooting nodes one at a time to apply them.

> 🔑 **Nodes are cattle described by config, not pets you log into.** Want a kernel argument on every worker? You don't touch a node — you create a `MachineConfig` and let the MCO converge the fleet. This is the same reconcile-to-desired-state idea as a Deployment, applied to the operating system.

## Control plane vs. worker vs. infra

| Node role | Runs | Notes |
|---|---|---|
| **Control plane** (masters) | API server, etcd, scheduler, controllers | Usually 3 for HA/quorum. |
| **Worker** (compute) | Your application Pods | Scale these for capacity. |
| **Infra** (optional) | Router, registry, monitoring, logging | A labeled subset of workers so platform load doesn't sit on app nodes (and can affect subscription costs). |

The **API server** listens on port **6443** — the single front door every `oc`/`kubectl` call and every controller goes through.

## The big idea: the cluster runs on Operators

An **Operator** is a controller that encodes operational knowledge — install, configure, upgrade, repair — for a piece of software, exposed through Kubernetes-native objects. OpenShift takes this to its conclusion: **the platform is built from Operators.**

There are ~30 **Cluster Operators**, each owning one slice of the platform (the API server, the ingress/router, DNS, the image registry, authentication, monitoring…). A top-level **Cluster Version Operator (CVO)** supervises them and drives upgrades.

```bash
oc get clusteroperators      # health of every platform component, one row each
oc get clusterversion        # what version the cluster is converging toward
```

> 💡 When something platform-level is broken (ingress down, auth failing), `oc get clusteroperators` is your first stop. A Cluster Operator reporting `Available=False` or `Degraded=True` points straight at the culprit. Upgrades are a single declarative action — the CVO walks every operator to the new version in the right order.

This is why an OpenShift upgrade is `oc adm upgrade` and a coffee, not a weekend of manually bumping components: each piece knows how to upgrade itself.

## Projects, the console, and `oc`

- **`oc`** is OpenShift's CLI — a **superset of `kubectl`**. Everything `kubectl` does works, plus OpenShift verbs (`oc new-app`, `oc new-project`, `oc rollout`, `oc adm`, `oc debug`).
- A **Project** is a Kubernetes namespace plus extra metadata and default policies (like the UID range used by Security Context Constraints — next lesson). `oc new-project demo` gives you an isolated, self-service space.
- A polished **web console** ships built in, with separate **Administrator** and **Developer** perspectives — vanilla Kubernetes ships only an API.

```bash
oc login https://api.mycluster.example.com:6443   # authenticate to the API server
oc new-project demo                                # create a Project (namespace + policy)
oc whoami                                          # who am I, and oc whoami --show-console
oc get clusteroperators                            # platform health
```

## Check yourself

1. Why can't you just SSH into an OpenShift node and install a package to make a permanent change? What's the right way?
2. What does the Cluster Version Operator coordinate, and why does that make upgrades simpler?
3. What's the relationship between a Project and a namespace?

## Key takeaways

- OpenShift nodes run **immutable RHEL CoreOS**; you change them declaratively via **MachineConfig**, reconciled by the **Machine Config Operator** — never by hand.
- The platform itself is **built from ~30 Cluster Operators** supervised by the **Cluster Version Operator**; `oc get clusteroperators` is the first place to look when something platform-level breaks.
- Control plane (API server on **6443**, etcd) is separate from workers; optional **infra nodes** isolate platform workloads.
- **`oc`** is a `kubectl` superset, a **Project** is a namespace plus policy, and a real **web console** is built in.
