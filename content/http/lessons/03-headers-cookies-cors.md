# Headers, Cookies, and CORS

> **The one-sentence version:** Headers are the metadata that make HTTP work — they negotiate content, carry auth, control caching, and (via cookies) rebuild the state that HTTP itself doesn't keep.

If the method and status code are the *what* and *how-it-went*, headers are the *how* — and most real-world HTTP behavior (auth, caching, CORS, the "real client IP" problem) is a headers story.

## Why it matters

Mysterious bugs — "the API works in curl but not the browser," "my cache won't bust," "the app sees the proxy's IP instead of the user's" — are almost always headers behaving exactly as specified once you know which header is in play.

## Headers worth knowing

**Request headers**

| Header | What it does |
|---|---|
| `Host` | Which site/vhost you want (required in HTTP/1.1) |
| `Accept` | Media types the client can handle (`application/json`) — drives content negotiation |
| `Authorization` | Credentials, e.g. `Bearer <token>` or `Basic <base64>` |
| `Content-Type` | The media type of the **request body** you're sending |
| `User-Agent` | Client identification |
| `Cookie` | Cookies the client is returning to the server |

**Response headers**

| Header | What it does |
|---|---|
| `Content-Type` | Media type of the response body (`text/html; charset=utf-8`) |
| `Content-Length` | Body size in bytes |
| `Location` | Where to go (with a 3xx redirect or 201 Created) |
| `Set-Cookie` | Tells the client to store a cookie |
| `Cache-Control` / `ETag` | Caching rules (next lessons) |
| `Access-Control-Allow-Origin` | CORS permission (below) |

> 💡 **Content-Type vs Accept:** `Accept` is the client saying "I'd like JSON"; `Content-Type` is either side stating "what I'm sending you *is* JSON." Mixing them up causes "415 Unsupported Media Type" and silent parsing failures. On a `POST`, set `Content-Type: application/json` or many servers won't parse your body.

## Cookies: faking state

Because HTTP is stateless (lesson 1), the server issues a **cookie** and the browser sends it back on every subsequent request to the same site:

```http
# Response, once (e.g. after login):
Set-Cookie: session=abc123; HttpOnly; Secure; SameSite=Lax; Max-Age=3600

# Request, automatically, every time after:
Cookie: session=abc123
```

The attributes are security-critical:

- **`HttpOnly`** — JavaScript can't read it (mitigates XSS token theft).
- **`Secure`** — only sent over HTTPS.
- **`SameSite`** — `Lax`/`Strict`/`None` controls whether the cookie rides along on cross-site requests (mitigates CSRF). `None` requires `Secure`.

> 🔑 A session cookie is just an opaque ID; the real session data lives server-side (or the token itself is signed, as with JWTs). Either way, the cookie is what re-establishes "who you are" on each stateless request.

## CORS: why "works in curl, fails in the browser"

The **same-origin policy** is a browser security rule: a page from `https://app.example.com` may not, by default, read responses from a *different* origin like `https://api.other.com`. (Origin = scheme + host + port.) curl and your backend ignore this — it's a **browser** restriction — which is why a call can work everywhere except the browser.

**CORS** (Cross-Origin Resource Sharing) is how a server *opts in* to being called cross-origin, using response headers:

```http
Access-Control-Allow-Origin: https://app.example.com
Access-Control-Allow-Methods: GET, POST
Access-Control-Allow-Headers: Authorization, Content-Type
```

For anything beyond a "simple" request, the browser first sends a **preflight** `OPTIONS` request asking permission; only if the server's CORS headers approve does it send the real request.

> ⚠️ CORS errors are fixed on the **server** (send the right `Access-Control-Allow-*` headers), not in the browser or the frontend. If you see "blocked by CORS policy" in the console, the API needs to allow your origin — disabling browser security is not the fix.

## The X-Forwarded-* headers (the real-client-IP problem)

When a request passes through a proxy/load balancer/router, the backend's socket sees the *proxy's* IP, not the user's. Proxies preserve the original details in headers:

- `X-Forwarded-For` — the original client IP (and the chain of proxies).
- `X-Forwarded-Proto` — the original scheme (`https`), so an app behind a TLS-terminating router knows the user came in over HTTPS.
- `X-Forwarded-Host` — the original `Host`.

> 💡 If your app logs every client as `10.x` (the router's IP) or builds `http://` redirect URLs while users are on HTTPS, you're ignoring `X-Forwarded-For`/`X-Forwarded-Proto`. This matters directly behind an OpenShift Route or an Nginx reverse proxy — both set these, and your app must trust and read them.

## Check yourself

1. What's the difference between the `Accept` and `Content-Type` headers?
2. An API call works in curl but the browser reports "blocked by CORS policy." Where is the fix, and why doesn't curl hit it?
3. Your app logs show every visitor coming from one internal IP. Which header fixes this, and who sets it?

## Key takeaways

- Headers carry the metadata that drives HTTP: content negotiation (`Accept`/`Content-Type`), auth (`Authorization`), redirects (`Location`), and caching.
- **Cookies** (`Set-Cookie` → `Cookie`) rebuild state on a stateless protocol; `HttpOnly`/`Secure`/`SameSite` are security-critical attributes.
- **CORS** is a **browser** opt-in enforced via `Access-Control-Allow-*` response headers — fix it on the server; it's why a call can work in curl but not the browser.
- Behind a proxy/router, read **`X-Forwarded-For`/`-Proto`/`-Host`** to recover the real client IP, scheme, and host.
