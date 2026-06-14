# Reverse Proxy & Load Balancing

This is the role Nginx is most famous for: standing in front of your application and forwarding requests to it. Get this right and you unlock TLS termination, load balancing, caching, and a clean separation between "the front door" and "the app."

## Forward proxy vs. reverse proxy

Don't confuse the two:

- A **forward proxy** sits in front of *clients* and reaches out to the internet on their behalf (e.g. a corporate web filter). It hides the client.
- A **reverse proxy** sits in front of *servers* and accepts requests on their behalf (Nginx). It hides the backend.

> 🔑 Mnemonic: a **reverse** proxy faces the *opposite* direction — it represents the **server** side to the world. Clients think they're talking to Nginx; Nginx quietly forwards to your app.

```
 client ──► NGINX (:443, public) ──► app server (:3000, private)
            "I'll take that request          "...and hand it to
             and pretend I'm the site"          the real app"
```

## Why put a reverse proxy in front of your app?

Your Node/Python/Java app *can* listen on port 443 directly — but you almost never want it to. Nginx in front gives you:

- **TLS termination** — Nginx handles HTTPS; your app speaks plain HTTP internally (simpler, faster).
- **Load balancing** — spread traffic across many app instances.
- **A stable public surface** — restart/redeploy the app without dropping client connections.
- **Caching, compression, rate limiting** — offloaded from the app.
- **Security** — the app isn't directly exposed; Nginx can filter, limit, and buffer.
- **Serving static files** directly, so the app only handles dynamic work.

## A basic reverse proxy

```nginx
server {
    listen 80;
    server_name example.com;

    location / {
        proxy_pass http://127.0.0.1:3000;

        # Pass through the real client/request info (see below)
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Why those headers matter (a top source of bugs)

When Nginx forwards a request, the backend now sees the connection coming from *Nginx*, not the real client. Without help, your app thinks every visitor is `127.0.0.1` over plain `http`. The headers fix this:

| Header | Tells the backend… |
|---|---|
| `Host` | the original hostname the user requested |
| `X-Real-IP` | the real client IP |
| `X-Forwarded-For` | the chain of client → proxies |
| `X-Forwarded-Proto` | whether the *original* request was `https` |

> ⚠️ `X-Forwarded-Proto` is critical: if your app does HTTPS redirects or builds absolute URLs, omitting it causes **infinite redirect loops** or `http://` links on an `https://` site. (Your framework must also be configured to *trust* these proxy headers.)

### `proxy_pass` and the trailing-slash trap

A subtle but bite-y rule:

```nginx
location /api/ {
    proxy_pass http://backend/;     # WITH trailing slash → /api/users → /users
}
location /api/ {
    proxy_pass http://backend;      # NO trailing slash  → /api/users → /api/users
}
```

> 💡 If `proxy_pass` ends with a **`/`** (or any path), Nginx **replaces** the matched `location` prefix. With **no** path, it **passes the URI through unchanged**. Mismatched expectations here cause mysterious 404s from the backend.

### WebSockets need an upgrade

Plain proxying drops WebSocket connections. To support them:

```nginx
location /ws/ {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade    $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_read_timeout 3600s;        # long-lived connections
}
```

## Load balancing across multiple backends

Define a pool with `upstream`, then point `proxy_pass` at it by name:

```nginx
upstream app_pool {
    server 127.0.0.1:3000;
    server 127.0.0.1:3001;
    server 127.0.0.1:3002;
}

server {
    listen 80;
    location / {
        proxy_pass http://app_pool;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

### Balancing algorithms

```nginx
upstream app_pool {
    # round-robin is the DEFAULT (no directive needed) — rotate evenly

    least_conn;            # send to the backend with the fewest active conns
    # ip_hash;             # pin each client IP to the same backend (sticky)

    server 10.0.0.1:3000 weight=3;   # gets 3x the traffic of a weight=1
    server 10.0.0.2:3000;
    server 10.0.0.3:3000 backup;     # only used if others are down
    server 10.0.0.4:3000 down;       # temporarily removed from rotation
}
```

- **round-robin** (default) — even rotation; great when backends are stateless.
- **least_conn** — favors the least-busy backend; good for uneven request durations.
- **ip_hash** — sticky sessions by client IP; use when the app keeps in-memory session state. (Better long-term: make the app stateless so any backend can serve any request.)
- **weight / backup / down** — tune capacity and failover.

### Passive health checks

Open-source Nginx watches for failures and ejects bad backends automatically:

```nginx
server 10.0.0.1:3000 max_fails=3 fail_timeout=30s;
# 3 failures within 30s → mark this backend unavailable for 30s
```

(Active health checks — proactively probing backends — are a feature of Nginx Plus or alternatives like HAProxy.)

## Useful proxy timeouts and buffering

```nginx
proxy_connect_timeout 5s;     # giving up trying to reach the backend
proxy_send_timeout    60s;
proxy_read_timeout    60s;    # waiting for the backend's response
proxy_buffering on;           # buffer the backend response (default; good for slow clients)
```

## Check yourself

1. In one sentence, how does a reverse proxy differ from a forward proxy?
2. Your app sits behind Nginx and gets stuck in an HTTPS redirect loop. Which forwarded header is probably missing or untrusted?
3. When would you choose `ip_hash` over the default round-robin — and what's the better long-term fix?

## Key takeaways

- A **reverse proxy** represents your **server** to the world; Nginx forwards to a private backend, giving you TLS termination, load balancing, caching, and isolation.
- Forward the real request context with `Host`, `X-Real-IP`, `X-Forwarded-For`, and **`X-Forwarded-Proto`** — the last prevents redirect loops.
- Mind the **`proxy_pass` trailing-slash rule** and add the **WebSocket upgrade** headers when needed.
- Use an **`upstream`** pool with `round-robin` / `least_conn` / `ip_hash`, plus `weight`, `backup`, and `max_fails` for capacity and failover.
