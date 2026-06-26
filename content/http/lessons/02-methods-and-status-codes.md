# Methods and Status Codes

> **The one-sentence version:** The **method** says what you want to do to a resource, and the **status code** says how it went — and knowing the important ones (especially the 4xx vs 5xx split and what 502/503/504 mean behind a proxy) is half of debugging the web.

## Why it matters

REST APIs, health checks, and load balancers all speak in methods and codes. "Is this my bug or the gateway's?" is answered by the status code's *class*. Confusing a `502` (bad backend) with a `400` (bad request) sends you debugging the wrong thing entirely.

## HTTP methods

| Method | Purpose | Has body? | Safe? | Idempotent? |
|---|---|---|---|---|
| **GET** | Retrieve a resource | no | ✅ | ✅ |
| **HEAD** | Like GET but headers only | no | ✅ | ✅ |
| **POST** | Create / submit / trigger | yes | ❌ | ❌ |
| **PUT** | Replace a resource wholesale | yes | ❌ | ✅ |
| **PATCH** | Partially update a resource | yes | ❌ | ❌ |
| **DELETE** | Remove a resource | usually no | ❌ | ✅ |
| **OPTIONS** | Ask what's allowed (used by CORS preflight) | no | ✅ | ✅ |

Two properties worth defining precisely:

- **Safe** — read-only; it shouldn't change server state. `GET`, `HEAD`, `OPTIONS`.
- **Idempotent** — doing it twice has the same effect as doing it once. `GET`, `PUT`, `DELETE` are idempotent; `POST` and `PATCH` generally aren't.

> 🔑 Idempotency is not academic — it's what makes **retries safe**. A proxy or client can safely retry a timed-out `GET` or `PUT`, but retrying a `POST` might create two orders or charge a card twice. This is exactly why payment APIs ask for an *idempotency key* on POSTs, and why load balancers retry idempotent methods but not POST by default.

## Status codes by class

The **first digit** tells you the category — learn the classes, then the specific codes.

| Class | Meaning | The one-liner |
|---|---|---|
| **1xx** | Informational | Rare; e.g. `101 Switching Protocols` (WebSocket/HTTP upgrade) |
| **2xx** | Success | It worked |
| **3xx** | Redirection | Look elsewhere |
| **4xx** | **Client** error | *You* sent something wrong |
| **5xx** | **Server** error | The *server* failed |

> 🔑 **4xx is your fault; 5xx is theirs.** This single distinction routes your debugging: a 4xx means fix the request (bad URL, missing auth, malformed body); a 5xx means the server or a gateway between you and it broke. Don't tweak your JSON to fix a 502.

### The specific codes worth memorizing

**2xx**
- `200 OK` — success with a body.
- `201 Created` — a `POST`/`PUT` created a resource (often returns a `Location` header).
- `204 No Content` — success, no body (common for `DELETE`).

**3xx**
- `301 Moved Permanently` / `308 Permanent Redirect` — permanent. `308` preserves the method/body; `301` historically let clients switch to `GET`.
- `302 Found` / `307 Temporary Redirect` — temporary. `307` preserves the method; `302` historically switched to `GET`.
- `304 Not Modified` — your cached copy is still good (see the caching lesson).

**4xx**
- `400 Bad Request` — malformed request.
- `401 Unauthorized` — not authenticated (you need to log in / send a token). *Misnamed; it's really "unauthenticated."*
- `403 Forbidden` — authenticated but not allowed.
- `404 Not Found` — no such resource.
- `409 Conflict` — state conflict (e.g. edit collision, duplicate).
- `429 Too Many Requests` — rate-limited; usually with a `Retry-After` header.

**5xx**
- `500 Internal Server Error` — the app threw/crashed.
- `502 Bad Gateway` — a proxy got an **invalid response from the backend** (backend crashed or returned garbage).
- `503 Service Unavailable` — **no healthy backend** to send to (overloaded, or zero ready replicas).
- `504 Gateway Timeout` — the backend **didn't respond in time**.

> 💡 `502/503/504` are *proxy* codes — they come from the load balancer, Nginx, or the OpenShift router, not your app. Behind a Route: **503 ≈ no ready Pods** (failing readiness probes), **504 ≈ backend exceeded the route timeout**, **502 ≈ backend returned something the router couldn't parse**. They tell you to look at the backend and its health, not the request.

## Check yourself

1. What's the practical difference between an idempotent and a non-idempotent method, and why does it matter for retries?
2. You get a `403`. Is re-sending your login token likely to help? What about a `401`?
3. A request through a load balancer returns `504`. Whose problem is it, and what would you check?

## Key takeaways

- **Methods** state intent; remember which are **safe** (read-only) and **idempotent** (repeat-safe) — that's what makes retries safe and is why `POST` is special.
- Status-code **classes** drive triage: **4xx = client error (fix the request)**, **5xx = server error (fix the server)**.
- Memorize the workhorses: `200/201/204`, `301/302/304/307/308`, `400/401/403/404/409/429`, `500/502/503/504`.
- **502/503/504 come from a proxy/LB/router**, not your app — behind an OpenShift Route they usually mean a backend health/timeout problem.
