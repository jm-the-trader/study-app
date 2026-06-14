# Services, Networking & Ingress

Pods are mortal and get new IPs constantly — so how does anything reliably *reach* them? The answer is the **Service**, plus **Ingress/Routes** for HTTP traffic from outside. This lesson makes Kubernetes networking click.

## The problem: Pods are moving targets

Pods come and go (rollouts, crashes, scaling), each with a fresh, ephemeral IP. You can't hardcode a Pod IP. You need a **stable address** that always points to "the healthy Pods of this app, wherever they are."

> 🔑 **A Service is a stable network identity in front of a set of Pods.** It gets a fixed virtual IP and DNS name, and load-balances to the matching Pods — which it finds, as always, by **label selector**. Pods churn underneath; the Service address never changes.

```yaml
apiVersion: v1
kind: Service
metadata: { name: web }
spec:
  selector: { app: web }          # targets Pods labeled app=web
  ports:
    - port: 80                     # the Service's port
      targetPort: 8080             # the Pods' containerPort
```

Behind the scenes the Service tracks healthy Pod IPs as **Endpoints**; `kube-proxy` programs each node so traffic to the Service VIP is distributed to those Pods.

## Cluster DNS: reach Services by name

Kubernetes runs internal DNS (CoreDNS). Every Service gets a name:

```
web                          # same namespace
web.prod                     # <service>.<namespace>
web.prod.svc.cluster.local   # fully qualified
```

So your `api` Deployment connects to the database simply via the hostname `db` (or `db.prod`). **This is service discovery** — no IPs, no config server, just DNS. (It's the cluster-scale version of Docker's name resolution from the Containers topic.)

## Service types — how far the exposure reaches

```yaml
spec:
  type: ClusterIP        # (default)
```

- **ClusterIP** (default) — reachable **only inside the cluster**. The right choice for internal services (your API talking to your DB). Most Services are this.
- **NodePort** — opens a static port (30000–32767) on **every node's IP**, forwarding to the Service. Crude external access; mostly for dev or as a building block.
- **LoadBalancer** — provisions an external cloud load balancer with a public IP that feeds the Service. The standard way to expose a service externally **on cloud providers** (one LB per service, though).
- **ExternalName** — a DNS CNAME alias to an external host (no proxying).

```
ClusterIP  →  in-cluster only
NodePort   →  <anyNodeIP>:<30000-32767>
LoadBalancer → cloud LB → external IP
```

## Ingress: smart HTTP routing at the edge

Exposing every web service via its own LoadBalancer is expensive and clumsy. **Ingress** gives you **one entry point** that routes HTTP(S) by **hostname and path** to many backend Services — plus TLS termination. It's essentially managed reverse-proxy rules (recall the Nginx topic — the popular **ingress-nginx** controller literally is Nginx).

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata: { name: site }
spec:
  tls:
    - hosts: [shop.example.com]
      secretName: shop-tls            # cert lives in a Secret (PKI topic!)
  rules:
    - host: shop.example.com
      http:
        paths:
          - path: /api
            pathType: Prefix
            backend: { service: { name: api,  port: { number: 80 } } }
          - path: /
            pathType: Prefix
            backend: { service: { name: web,  port: { number: 80 } } }
```

> ⚠️ An Ingress **resource** does nothing on its own — you need an **Ingress controller** (ingress-nginx, Traefik, HAProxy, a cloud controller) running in the cluster to implement the rules. "I created an Ingress but nothing happens" almost always means no controller is installed.

> 💡 The newer **Gateway API** is the evolving successor to Ingress, with a richer, role-oriented model. Ingress is still everywhere; know it first, watch Gateway API.

## Network policy (the firewall)

By default, **all Pods can talk to all Pods**. A **NetworkPolicy** restricts that — e.g. "only the `api` may reach the `db` on port 5432." Use them to segment traffic (least privilege). They require a CNI plugin that enforces them (Calico, Cilium, etc.).

## Putting the layers together

```
internet → Ingress (host/path routing, TLS) → Service (stable VIP, LB) → Pods (mortal)
                                                  ▲ found via label selector
```

External user hits the Ingress; it routes by host/path to a Service; the Service load-balances to healthy Pods; Pods can be replaced freely without anything upstream noticing.

## Check yourself

1. Why can't you just connect to a Pod's IP, and what does a Service provide instead?
2. Which Service type for an internal database, and which to expose a public web app on a cloud provider?
3. You applied an Ingress manifest and nothing routes. What's the most likely missing piece?

## Key takeaways

- **Services** give a **stable VIP + DNS name** in front of label-selected Pods and load-balance to healthy **Endpoints** — Pods churn, the address doesn't.
- **Cluster DNS** means service discovery is just hostnames (`db`, `api.prod`); **ClusterIP** (internal), **NodePort**, and **LoadBalancer** (external on cloud) control reach.
- **Ingress** routes external HTTP(S) by host/path to many Services with TLS — but needs an **Ingress controller** to do anything (Gateway API is its successor).
- **NetworkPolicies** turn the default "everything talks to everything" into least-privilege segmentation.
