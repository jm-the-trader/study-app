# HTTP in Practice: Proxies, Load Balancers, and Debugging

> **The one-sentence version:** In production your request almost never hits the app directly — it crosses load balancers and reverse proxies first — so reading HTTP behind that machinery (and debugging it with `curl`) is the skill that ties this whole topic together.

## Why it matters

Every concept so far — methods, status codes, headers, TLS, caching — shows up *through layers of proxies* in real systems. The OpenShift router, an Nginx reverse proxy, and a cloud load balancer all sit between the user and your Pod. Knowing who does what turns a vague "the site is down" into a precise diagnosis.

## L4 vs L7: two kinds of load balancer

| | **L4 (transport)** | **L7 (application)** |
|---|---|---|
| Operates on | TCP/UDP — IPs and ports | HTTP — methods, paths, headers, cookies |
| Can it route by URL path? | ❌ | ✅ (`/api` → service A, `/` → service B) |
| Can it terminate TLS / read headers? | ❌ (unless passthrough) | ✅ |
| Examples | Cloud TCP LB, kube-proxy/ClusterIP | Nginx, HAProxy, **the OpenShift router** |

> 🔑 An **L4** balancer just forwards connections — fast and protocol-agnostic, but blind to HTTP. An **L7** balancer *understands* HTTP, so it can route by path/host, terminate TLS, add headers, retry, and do sticky sessions. The OpenShift **Route** → HAProxy router is L7; a bare Kubernetes **Service** load-balancing a ClusterIP is L4.

## The proxy chain and what each hop changes

```
user ─► CDN/edge ─► L7 router (TLS termination) ─► Service (L4) ─► Pod
        cache        Route / Nginx                  ClusterIP       your app
```

Each hop can rewrite the request. The consequences you'll actually hit:

- **The app sees the proxy's IP, not the user's** — recover the real one from `X-Forwarded-For`; recover the original scheme from `X-Forwarded-Proto` (lesson 3). Get this wrong and you log the wrong IPs or emit `http://` redirects to HTTPS users.
- **Timeouts stack.** Each layer has its own timeout; the *smallest* wins. A 30s app response behind a router with a 10s timeout yields a **504** even though the app eventually succeeded. (On an OpenShift Route, that's the `haproxy.router.openshift.io/timeout` annotation.)
- **Sticky sessions break statelessness.** An L7 LB can pin a client to one backend with a cookie — needed for in-memory sessions, but it undermines even load spreading and clean rollouts. Prefer **stateless** apps (shared session store) so any replica can serve any request (lesson 1).
- **Idempotency governs retries.** A proxy may retry an idempotent `GET`/`PUT` on failure but must not auto-retry a `POST` (lesson 2), or you get duplicate side effects.

## Debugging with curl

`curl` is the universal HTTP probe. The flags that matter:

```bash
curl -v https://shop.example.com/api/health     # -v: show request (>) and response (<) headers
curl -I https://shop.example.com                # -I: HEAD — just the status + headers
curl -L https://shop.example.com                # -L: follow redirects (watch a 301/302 chain)
curl -H "Authorization: Bearer $TOK" .../orders # -H: add a request header
curl -X POST -d '{"a":1}' \
     -H "Content-Type: application/json" .../orders   # send a JSON body

# Time the phases — find WHERE the latency is (DNS? connect? TLS? server?):
curl -w "dns=%{time_namelookup} connect=%{time_connect} tls=%{time_appconnect} ttfb=%{time_starttransfer} total=%{time_total}\n" \
     -o /dev/null -s https://shop.example.com

# Bypass DNS to test a specific backend directly (great for proxy isolation):
curl --resolve shop.example.com:443:10.0.0.7 https://shop.example.com/health
```

> 💡 The `-w` timing breakdown is a debugging superpower: it tells you whether slowness is **DNS** (`time_namelookup`), **TCP connect**, the **TLS** handshake (`time_appconnect`), or the **server** thinking (`time_starttransfer` = time to first byte). You stop guessing which layer is slow.

## A worked diagnosis: intermittent 502s

Symptom: users see occasional `502 Bad Gateway`. Reason about the chain:

1. `502` is a **proxy** code (lesson 2) — the router got an invalid/empty response from the backend, so look at the **backend**, not the request.
2. `oc get endpoints <svc>` / check the LB's backend pool — are Pods dropping out? A Pod that crashes mid-request, or is killed during a rollout without graceful shutdown, returns exactly this.
3. Likely causes: the app closing keep-alive connections the proxy still reuses, a too-short backend timeout, or Pods receiving traffic before they're ready / after they start terminating — which is why **readiness probes** and graceful shutdown matter (OpenShift topic).

That single move — *classify the status code's origin, then inspect that layer* — is the throughline of debugging HTTP in production.

## Check yourself

1. Give one thing an L7 load balancer can do that an L4 one cannot, and name the OpenShift component that is L7.
2. An app succeeds in ~20s but users get a 504. What's happening across the proxy chain, and what would you adjust?
3. A page loads slowly and you suspect TLS, not the server. Which `curl` invocation isolates that, and which field do you read?

## Key takeaways

- Production HTTP flows through **proxies and load balancers**: **L4** forwards by IP/port (blind to HTTP); **L7** (Nginx, HAProxy, the **OpenShift router**) understands HTTP and can route by path, terminate TLS, and retry.
- Each hop changes things: recover the client via **`X-Forwarded-*`**, the **smallest timeout wins** (502/504 origins), and **idempotency** decides what's safe to retry.
- Prefer **stateless** apps so you don't need sticky sessions; pair with **readiness probes + graceful shutdown** to avoid rollout 502s.
- **`curl`** is the universal probe: `-v`/`-I`/`-L`/`-H`, and especially **`-w` timing** to pinpoint whether DNS, connect, TLS, or the server is slow.
