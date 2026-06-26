# The Request/Response Model

> **The one-sentence version:** HTTP is a simple, text-based, stateless protocol where a client sends a **request** and a server returns a **response** — and almost everything else is detail layered on that one exchange.

HTTP underpins web pages, REST APIs, webhooks, health checks, and the traffic flowing through every reverse proxy and Kubernetes Route. Understanding its shape makes all of those legible.

## Why it matters

When a page won't load, an API returns the wrong code, or a Route 502s, you're debugging HTTP. If you can picture the raw request and response, you can read `curl -v`, nginx logs, and browser dev-tools fluently instead of guessing.

## The core loop

```
            request  ───────────────►
 client                                    server
 (browser,    ◄───────────────  response
  curl, app)
```

The client opens a connection (a TCP connection — see the **Networking** topic — usually wrapped in TLS for HTTPS), sends one request, and reads one response. That's it. Web pages feel richer only because a browser makes *many* such exchanges (HTML, then CSS, images, API calls).

## Anatomy of a request

A raw HTTP/1.1 request is just text:

```http
GET /api/orders?status=open HTTP/1.1
Host: shop.example.com
Accept: application/json
Authorization: Bearer eyJhbGci...
User-Agent: curl/8.4.0

```

Four parts:

1. **Request line** — `METHOD path-and-query HTTP-version`. Here: `GET`, the path `/api/orders` with query string `?status=open`, version `HTTP/1.1`.
2. **Headers** — `Name: value` metadata lines (who you are, what you accept, auth…).
3. **Blank line** — marks the end of the headers.
4. **Body** (optional) — data sent *to* the server, e.g. the JSON in a `POST`. A `GET` usually has none.

> 🔑 The `Host` header is not optional in HTTP/1.1 — it's how one server (or one router/proxy) hosting many sites knows *which* site you want. The same IP and port can serve `shop.example.com` and `blog.example.com`; the `Host` header (and TLS **SNI** for HTTPS) disambiguates. This is exactly how an OpenShift **Route** or an Nginx `server_name` picks a backend.

## Anatomy of a response

```http
HTTP/1.1 200 OK
Content-Type: application/json
Content-Length: 57
Cache-Control: no-store

{"orders":[{"id":1,"status":"open"}],"count":1}
```

1. **Status line** — `HTTP-version status-code reason-phrase` (`200 OK`).
2. **Headers** — metadata about the response (content type, length, caching…).
3. **Blank line**, then the **body** — the actual payload (HTML, JSON, an image…).

## URLs: the address of a request

```
https://shop.example.com:443/api/orders?status=open#section
└─┬─┘   └──────┬───────┘ └┬┘ └───┬────┘ └────┬─────┘ └──┬──┘
scheme       host       port    path        query    fragment
```

- **scheme** — `http` or `https` (which sets the default port, 80 or 443).
- **host** — resolved to an IP via **DNS** (see that topic).
- **path/query** — what resource you want and parameters for it.
- **fragment** (`#…`) — handled entirely by the browser; it's **never sent to the server**.

## Statelessness (and how state gets faked)

> ⚠️ HTTP is **stateless**: the server doesn't inherently remember anything between two requests. Each request must carry whatever context it needs.

So "being logged in" is an illusion rebuilt on every request — the client re-presents a **cookie** or an `Authorization` token each time (lesson 3). Statelessness is also *why* you can scale horizontally: if no request depends on which server handled the last one, any replica behind a load balancer can serve any request. (Sticky sessions, which break that property, come up in lesson 6.)

## Seeing it yourself

```bash
curl -v https://example.com        # -v prints the request (>) and response (<) lines
curl -I https://example.com        # -I sends a HEAD: headers only, no body
```

## Check yourself

1. What are the four parts of an HTTP request, and which one is optional?
2. Why is the `Host` header essential when many sites share one IP address?
3. HTTP is stateless — so how does a server "know" you're logged in across requests?

## Key takeaways

- HTTP is a **stateless, text-based request/response** protocol over a TCP (and, for HTTPS, TLS) connection.
- A **request** = request line (method + path + version) + headers + blank line + optional body; a **response** = status line + headers + blank line + body.
- The **`Host` header** (and TLS **SNI**) lets one IP/port serve many sites — the basis of virtual hosting, Nginx `server_name`, and OpenShift Routes.
- **Statelessness** means each request carries its own context (cookies/tokens) and is what makes horizontal scaling behind a load balancer possible.
