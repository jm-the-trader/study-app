# Why Orchestration & How Kubernetes Is Built

> **The one-sentence version:** Kubernetes is a system you tell *what you want* ("run 5 copies of this container, always"), and it continuously works to make reality match — across a fleet of machines, healing failures on its own.

## The problem orchestration solves

You can run a container by hand. Now run **hundreds** across **dozens of machines**, and answer: What happens when a container crashes? When a whole node dies? How do you roll out a new version without downtime, scale on load, give containers stable addresses, inject config and secrets, and schedule work onto machines with room? Doing this manually doesn't scale.

A **container orchestrator** automates all of it. Kubernetes (**K8s**) is the de facto standard.

## The one idea that explains everything: declarative + reconciliation

You don't issue imperative commands ("start a container here"). You **declare desired state** in YAML ("I want 5 replicas of v2"), and Kubernetes' **controllers** run a non-stop **reconciliation loop**:

```
   observe actual state ──► compare to desired state ──► act to close the gap ──┐
        ▲                                                                       │
        └───────────────────────────────────────────────────────────────────┘
```

> 🔑 **Kubernetes is a control system.** Every object has a *desired* spec; controllers constantly drive *actual* toward *desired*. A pod dies → actual (4) < desired (5) → a controller starts one. This single principle — **reconcile to desired state** — is why K8s self-heals, and why you manage it by editing YAML, not running commands.

## The cluster: control plane + worker nodes

A cluster is a set of machines split into two roles:

```
┌──────────────── CONTROL PLANE (the brain) ────────────────┐
│  kube-apiserver   ← the front door; everything talks to it │
│  etcd             ← the database: all cluster state        │
│  kube-scheduler   ← assigns Pods to Nodes                  │
│  controller-mgr   ← runs the reconciliation loops          │
└────────────────────────────┬──────────────────────────────┘
                              │ (API)
        ┌─────────────────────┼─────────────────────┐
   ┌────▼─────┐          ┌────▼─────┐          ┌────▼─────┐
   │  NODE 1  │          │  NODE 2  │          │  NODE 3  │   ← workers (run your Pods)
   │ kubelet  │          │ kubelet  │          │ kubelet  │
   │ kube-proxy│         │ kube-proxy│         │ kube-proxy│
   │ runtime  │          │ runtime  │          │ runtime  │
   └──────────┘          └──────────┘          └──────────┘
```

### Control plane components

- **kube-apiserver** — the single front door. *Everything* (kubectl, controllers, kubelets) talks to the API server; it validates requests and is the only thing that reads/writes etcd.
- **etcd** — a consistent key-value store holding the **entire cluster state** (the source of truth). Lose etcd, lose the cluster — back it up.
- **kube-scheduler** — watches for unscheduled Pods and picks the best Node for each (based on resources, constraints, affinity).
- **kube-controller-manager** — runs the built-in controllers (the reconciliation loops for Deployments, nodes, endpoints, etc.).

### Worker node components

- **kubelet** — the node agent; takes Pod specs from the API server and makes the container runtime run them, reporting health back.
- **kube-proxy** — programs the node's networking so Service virtual IPs route to the right Pods.
- **container runtime** — containerd or CRI-O (the things from the Containers topic) actually run the containers.

## How a request flows (the mental movie)

You run `kubectl apply -f deploy.yaml` for 3 replicas:

1. **kubectl** sends it to the **apiserver**, which validates and writes desired state to **etcd**.
2. The **Deployment controller** notices 0 of 3 desired exist → creates a ReplicaSet → 3 Pod objects (still unscheduled).
3. The **scheduler** assigns each Pod to a Node and records it.
4. Each Node's **kubelet** sees its assigned Pods and tells the **runtime** to pull images and start containers.
5. A Pod crashes later → actual < desired → the controller makes a new one. **You did nothing.**

## kubectl: your interface to the apiserver

```bash
kubectl get nodes                       # cluster machines
kubectl get pods -A                     # pods across all namespaces
kubectl apply -f deploy.yaml            # declare desired state (create/update)
kubectl describe pod <name>             # detailed status + events ← start debugging here
kubectl logs <pod>                      # container logs
kubectl get events --sort-by=.lastTimestamp   # what the cluster has been doing
```

> 💡 Prefer **`kubectl apply -f`** (declarative — your YAML is the source of truth, ideally in Git) over imperative `kubectl create/run` for anything real. Declarative + version control = reproducible infrastructure (the GitOps idea).

## Namespaces

**Namespaces** partition a cluster into virtual sub-clusters (e.g. `team-a`, `staging`, `prod`) for organization, access control (RBAC), and quotas. `kubectl ... -n <ns>` targets one.

## Check yourself

1. Explain "declarative + reconciliation" and why it makes Kubernetes self-healing.
2. Which component is the *only* one that talks to etcd, and what does everything else use to interact with the cluster?
3. Walk the path of a Pod from `kubectl apply` to a running container, naming the component at each step.

## Key takeaways

- Kubernetes automates running **many containers across many machines**: scheduling, healing, scaling, rollout, networking, config.
- Its core principle is **declarative desired state + controllers reconciling actual toward it** — the source of self-healing.
- **Control plane** = apiserver (front door), etcd (state), scheduler (placement), controller-manager (loops); **nodes** run kubelet, kube-proxy, and a container runtime.
- You interact via **kubectl** against the **apiserver**; prefer **`apply -f`** (declarative, Git-friendly), and use **namespaces** to partition the cluster.
