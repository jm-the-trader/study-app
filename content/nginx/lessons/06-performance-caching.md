# Performance, Caching & Hardening

You can serve a site with the basics from earlier lessons. This final lesson is about making it **fast, resilient, and safe** — the directives that separate a hobby config from a production one.

## Caching: the biggest single win

There are two distinct caches to think about.

### 1. Browser caching (you met this in Lesson 3)

Tell clients to reuse assets so they don't re-download them: `expires` + `Cache-Control`. Immutable hashed assets for a year, HTML uncached. That offloads repeat traffic entirely.

### 2. Proxy caching (Nginx caches your backend's responses)

When Nginx is a reverse proxy, it can **store backend responses** and serve them itself — so a slow app endpoint is computed once and served thousands of times from Nginx's cache.

```nginx
# Define a cache zone (in the http context)
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=app_cache:10m
                 max_size=1g inactive=60m;

server {
    location /api/ {
        proxy_pass http://app_pool;
        proxy_cache app_cache;
        proxy_cache_valid 200 302 10m;     # cache OK responses for 10 min
        proxy_cache_valid 404 1m;
        proxy_cache_key "$scheme$request_method$host$request_uri";

        # Survive backend hiccups by serving slightly-stale content
        proxy_cache_use_stale error timeout updating http_500 http_502 http_503;
        add_header X-Cache-Status $upstream_cache_status;   # HIT / MISS / EXPIRED
    }
}
```

> 🔑 `proxy_cache_use_stale` is a resilience superpower: if your backend errors or times out, Nginx serves the last good cached response instead of an error page. Your site stays up *through* a backend outage.

The `X-Cache-Status` header lets you watch hits vs. misses in your browser's network tab while tuning. **Never cache personalized or authenticated responses** unless you key the cache by the user — caching one user's account page and serving it to another is a serious leak. Use `proxy_no_cache` / `proxy_cache_bypass` for cookie'd or `Authorization` requests.

## Serving files faster

```nginx
sendfile     on;     # kernel copies file→socket directly, skipping user space
tcp_nopush   on;     # send headers + file start in one packet (with sendfile)
tcp_nodelay  on;     # don't delay small packets on keep-alive connections
```

These let the OS do the heavy lifting for static files. They're standard in tuned configs.

## Tuning concurrency

```nginx
worker_processes auto;        # one worker per CPU core (Lesson 1)

events {
    worker_connections 4096;  # max connections PER worker
    # multi_accept on;
}

http {
    keepalive_timeout 65;     # reuse client connections for multiple requests

    # Reuse connections to your BACKENDS too — big latency win
    upstream app_pool {
        server 127.0.0.1:3000;
        keepalive 32;         # pool of idle keep-alive conns to the backend
    }
}
```

> 💡 Rough capacity = `worker_processes × worker_connections`. With `auto` workers and 4096 connections each, an 8-core box can hold tens of thousands of simultaneous connections — the C10k promise from Lesson 1, realized.

## Rate limiting & abuse protection

Protect against floods, brute-force, and runaway clients.

```nginx
# Define zones in the http context
limit_req_zone  $binary_remote_addr zone=api:10m rate=10r/s;
limit_conn_zone $binary_remote_addr zone=conns:10m;

server {
    location /api/ {
        limit_req  zone=api burst=20 nodelay;   # 10 req/s steady, allow bursts of 20
        limit_conn conns 10;                    # max 10 concurrent conns per IP
        proxy_pass http://app_pool;
    }

    # Stricter limit on login to slow brute force
    location = /login {
        limit_req zone=api burst=5;
        proxy_pass http://app_pool;
    }
}
```

- `rate=10r/s` is the sustained rate; `burst` absorbs short spikes; `nodelay` serves the burst immediately rather than queuing.
- `limit_conn` caps simultaneous connections per client — useful against slow-loris-style attacks.

## Security headers

Add defense-in-depth headers (pair with HSTS from Lesson 5):

```nginx
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "SAMEORIGIN" always;          # clickjacking
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
# add_header Content-Security-Policy "default-src 'self'" always;  # powerful, test carefully
```

> ⚠️ Gotcha: `add_header` from an outer block is **not inherited** if an inner block adds *any* of its own headers — the inner block then needs to repeat them. When headers go missing, check whether a nested `location` redefined some.

## Hardening checklist

- 🔒 **Hide the version:** `server_tokens off;` (don't advertise your exact Nginx version).
- 🚫 **Block dotfiles:** `location ~ /\. { deny all; }` (no `.git`, `.env` leaks).
- 📏 **Limit body size:** `client_max_body_size 10m;` (reject oversized uploads).
- ⏱️ **Set client timeouts:** `client_body_timeout`, `client_header_timeout` (drop slow-loris clients).
- 🧱 **Run workers unprivileged** (the default) and keep the master's root use minimal.
- 🔍 **Watch logs:** rising 4xx/5xx, slow upstreams, and cache miss ratios are your early warnings.

## A note on observability

Add timing fields to your access log so you can *see* slowness instead of guessing:

```nginx
log_format timed '$remote_addr "$request" $status '
                 'rt=$request_time uct=$upstream_connect_time urt=$upstream_response_time '
                 'cache=$upstream_cache_status';
access_log /var/log/nginx/access.log timed;
```

`$upstream_response_time` tells you whether slowness is *your backend* or *Nginx*. That single distinction resolves most "the site is slow" investigations.

## Check yourself

1. What does `proxy_cache_use_stale` do for you during a backend outage?
2. You add a security header in a `location` block and a *different* header you set in `server` disappears. Why?
3. In `limit_req zone=api burst=20 nodelay;`, what do `rate`, `burst`, and `nodelay` each control?

## Key takeaways

- Two caches: **browser caching** (Lesson 3) and **proxy caching** of backend responses — and `proxy_cache_use_stale` keeps you up *through* backend failures.
- Enable `sendfile`/`tcp_nopush`, tune `worker_connections` and **backend keepalive**, and you realize the C10k throughput from Lesson 1.
- **Rate-limit** with `limit_req`/`limit_conn`, add **security headers** (mind the non-inheritance gotcha), and harden with `server_tokens off`, dotfile blocks, body-size and timeout limits.
- Add **`$upstream_response_time`** to your logs so you can tell backend slowness from proxy slowness. 🎓 That's Nginx — now reinforce it with the flashcards!
