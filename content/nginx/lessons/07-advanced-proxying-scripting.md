# Advanced: L4 Proxying, Subrequests, Microcaching & Scripting

> **The one-sentence version:** Beyond serving sites and basic reverse proxying, Nginx becomes a programmable edge — proxying any TCP/UDP protocol, delegating auth, caching for one-second windows, and running your own logic per request.

You know what Nginx is, config basics, static sites, reverse proxy/load balancing, HTTPS, and performance/caching basics. This lesson covers the directives that turn Nginx into a real API gateway and edge platform.

## The `stream` module: L4 (TCP/UDP) proxying

The `http {}` block is L7. The separate **`stream {}`** block proxies raw **TCP/UDP** — databases, MQTT, SMTP, gRPC over TCP, even TLS passthrough by SNI:

```nginx
stream {
  upstream db { server 10.0.0.10:5432; server 10.0.0.11:5432; }
  server { listen 5432; proxy_pass db; }
}
```

Use it when you need load balancing/HA in front of a non-HTTP service. (For HTTP, stay in `http {}` so you keep header-aware features.)

## Upstream keepalive and dynamic resolution

Two production essentials people miss:

- **Upstream keepalive** — without it, Nginx opens a *new* TCP (and TLS) connection to the backend for every request. Add a `keepalive` count and switch to HTTP/1.1 with an empty `Connection` header to pool connections — a large latency and CPU win.

```nginx
upstream api { server api.internal:8080; keepalive 32; }
server { location / {
  proxy_pass http://api;
  proxy_http_version 1.1;
  proxy_set_header Connection "";
} }
```

- **Dynamic DNS resolution** — by default Nginx resolves `proxy_pass` hostnames *once at startup*. In Kubernetes/cloud where backend IPs change, that goes stale. Set a `resolver` and pass the host via a **variable** so Nginx re-resolves at runtime.

> ⚠️ The "resolve once at startup" behavior is a classic outage cause behind dynamic backends. Using a variable in `proxy_pass` (with a `resolver` directive) forces runtime resolution.

## `auth_request`: delegate authentication

`auth_request` makes Nginx fire an **internal subrequest** to an auth service *before* serving the real request. A 2xx allows it through; 401/403 blocks it. This centralizes authn/authz at the edge — the pattern behind ingress-nginx external auth and many SSO setups:

```nginx
location /private/ {
  auth_request /_authcheck;
  proxy_pass http://app;
}
location = /_authcheck {
  internal;
  proxy_pass http://auth-svc/verify;
  proxy_pass_request_body off;
}
```

## The rewrite/map engine

- **`map`** builds a variable from another value efficiently (hash lookup) — great for routing, feature flags, or conditional headers without `if`.
- **`rewrite ... last/break`** and regex `location` blocks handle URL rewriting; prefer `return 301` for simple redirects (faster, clearer than `rewrite`).
- Nginx's famous advice: **avoid `if` inside `location`** — it's evaluated surprisingly and "if is evil" for anything beyond `return`/`rewrite`. Use `map`, `try_files`, or `location` matching instead.

## Microcaching: cache even dynamic content

You already know `proxy_cache`. **Microcaching** caches *dynamic* responses for a tiny window (e.g. **1 second**). Under load, that means at most one backend hit per second per resource, while everyone else is served from cache — often a 10–100× backend offload with negligible staleness.

```nginx
proxy_cache_valid 200 1s;
proxy_cache_lock on;          # collapse concurrent misses into ONE backend request
proxy_cache_use_stale updating error timeout;   # serve stale while refreshing / on backend errors
```

`proxy_cache_lock` prevents a **cache stampede** (thundering herd) when a hot key expires; `use_stale` keeps you serving during backend hiccups.

## Programmability: njs and the OpenResty route

For logic beyond directives, Nginx supports **njs** (a small JavaScript subset) to script request/response handling, generate dynamic content, or make auth decisions inline. The **OpenResty** distribution embeds **Lua** (LuaJIT) for full programmability — used to build API gateways, WAFs (with rules/ModSecurity), and dynamic routing. Reach for these only when config directives genuinely can't express the logic.

## gRPC and HTTP/2/3

Nginx proxies **gRPC** with `grpc_pass` (HTTP/2 end to end) and terminates **HTTP/2** (and HTTP/3/QUIC in recent builds) for clients while talking HTTP/1.1 or HTTP/2 to backends — letting you adopt new protocols at the edge without touching the app.

## Check yourself

1. When would you use the `stream` block instead of `http`, and what do you give up?
2. Why does upstream keepalive matter, and why can `proxy_pass` to a dynamic backend go stale?
3. Explain how `auth_request` centralizes authentication.
4. What does microcaching with `proxy_cache_lock` achieve under a traffic spike?

## Key takeaways

- The **`stream` module** proxies/load-balances raw **TCP/UDP** (databases, TLS passthrough); `http {}` stays for header-aware L7 features.
- Enable **upstream keepalive** (pool backend connections) and use a **`resolver` + variable** so dynamic backends re-resolve at runtime instead of going stale.
- **`auth_request`** delegates auth via an internal subrequest — the edge SSO/ingress-auth pattern.
- Prefer **`map`/`try_files`** over `if`; use **`return`** for redirects.
- **Microcaching** (1s cache) plus **`proxy_cache_lock`** and **`use_stale`** massively offload backends and survive stampedes; **njs/OpenResty (Lua)** add real scripting, and `grpc_pass`/HTTP2/3 modernize the edge.
