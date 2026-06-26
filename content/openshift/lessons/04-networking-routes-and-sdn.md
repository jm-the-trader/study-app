# Networking: Routes, the Router, DNS, and NetworkPolicy

> **The one-sentence version:** Inside the cluster, Services + cluster DNS + a CNI (OVN-Kubernetes) move packets between Pods; to the outside world, a **Route** tells the built-in **HAProxy router** how to terminate TLS and forward HTTP to your Service.

This lesson connects four layers you've met elsewhere — **DNS**, **HTTP**, **Nginx-style reverse proxying**, and Kubernetes Services — into the OpenShift networking picture an SRE is expected to reason about.

## The journey of a request

```
                  Route (HTTP rules + TLS)
 user ──HTTPS──► HAProxy router ──► Service (ClusterIP) ──► ready Pods
 (Internet)      *.apps.<cluster>     kube-proxy / OVN        (endpoints)
```

Three hops, three responsibilities. Let's take them inside-out.

## East-west: Services, DNS, and the CNI

Inside the cluster, Pods are ephemeral and their IPs change. A **Service** gives a stable virtual IP (ClusterIP) and a stable **DNS name**:

```
<service>.<namespace>.svc.cluster.local      # full form
<service>.<namespace>                          # short form, same namespace omitted
```

**CoreDNS** answers those names; the CNI plus **kube-proxy** load-balance the ClusterIP across the Service's healthy **endpoints** (the Pods passing their readiness probe). The default CNI in modern OpenShift is **OVN-Kubernetes** (the older OpenShift SDN plugin is being retired). You rarely configure the CNI directly — but you do constrain it with NetworkPolicy.

> 🔑 A Pod never talks to another Pod by IP. It talks to a **Service name**, cluster DNS resolves it to a ClusterIP, and the data plane spreads connections across whichever Pods are currently *ready*. Readiness probes therefore double as a traffic gate — fail readiness and you're silently removed from the Service.

## North-south: Routes and the HAProxy router

The **Ingress Operator** runs a fleet of **HAProxy router** pods. A **Route** is the OpenShift object that programs them: "for host `web.apps.mycluster.com`, forward to Service `web`, and handle TLS like *this*."

```yaml
apiVersion: route.openshift.io/v1
kind: Route
metadata:
  name: web
  annotations:
    haproxy.router.openshift.io/timeout: "30s"          # per-route HTTP timeout
spec:
  host: web.apps.mycluster.example.com
  to: { kind: Service, name: web }
  port: { targetPort: 8080 }
  tls:
    termination: edge                                    # edge | passthrough | reencrypt
    insecureEdgeTerminationPolicy: Redirect              # send http:// → https://
```

Routes get an automatic hostname under the cluster's **`*.apps.<cluster-domain>`** wildcard DNS, so external name resolution is handled for you.

### The three TLS termination modes (know these cold)

| Mode | Where TLS ends | Router ↔ Pod traffic | Use when |
|---|---|---|---|
| **edge** | At the router | Plaintext HTTP | App doesn't do TLS; simplest. Most common. |
| **passthrough** | At the **Pod** | Encrypted; router can't read it | App must terminate TLS itself, or you need mTLS end-to-end |
| **reencrypt** | At the router, then **re-encrypted** to the Pod | Encrypted (new cert) | You want the router's cert externally *and* encryption on the internal hop |

These map exactly onto the HTTP/TLS concepts in the **HTTP** topic — edge termination is the router playing the same TLS-terminating reverse-proxy role Nginx plays. Because the router is L7, it can also do **path-based routing**, **sticky sessions** (a cookie pinning a client to one Pod), **HTTP/2**, and per-route **timeouts** via annotations.

> 💡 A `502`/`503`/`504` from a Route is a *router-to-backend* story: 503 usually means **no ready Pods** (Service has zero endpoints), 504 means the backend **exceeded the route timeout**. When debugging, check the Service's endpoints and your readiness probe before blaming the app.

## Locking it down: NetworkPolicy

By default, every Pod can talk to every other Pod. **NetworkPolicy** changes that to allow-list rules, enforced by OVN-Kubernetes. The standard pattern is **default-deny, then open the paths you need**:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata: { name: default-deny-ingress, namespace: prod }
spec:
  podSelector: {}            # all Pods in the namespace
  policyTypes: [Ingress]     # with no ingress rules below, all inbound is denied
```

Then add a policy allowing, say, only the `frontend` Pods to reach the `backend` on 8080. OpenShift also offers **EgressIP** (give a namespace a fixed source IP for outbound traffic) and **egress firewall** rules to control what Pods may call *out* to — important when a corporate firewall whitelists by source IP.

## Check yourself

1. Trace a browser request to an app Pod through the three hops, naming the object responsible for each.
2. Your app already terminates its own TLS and you need it end-to-end encrypted. Which Route termination mode, and why not `edge`?
3. A Route returns `503`. What's the most likely cause, and which object do you inspect first?

## Key takeaways

- **East-west:** Pods reach each other via **Service DNS** (`svc.namespace.svc.cluster.local`), resolved by **CoreDNS**; **OVN-Kubernetes** + kube-proxy balance across **ready** endpoints, so readiness probes gate traffic.
- **North-south:** a **Route** programs the **HAProxy router** to expose a Service externally under the **`*.apps`** wildcard domain.
- Know the three TLS modes — **edge** (terminate at router), **passthrough** (terminate at Pod), **reencrypt** (terminate then re-encrypt).
- **NetworkPolicy** turns the default allow-all into **default-deny + allow-list**; **EgressIP**/egress firewall control outbound traffic.
