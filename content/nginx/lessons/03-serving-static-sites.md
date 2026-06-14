# Serving Static Sites & SPAs

Serving files is what Nginx does best, and it's the perfect place to make the config concepts from Lesson 2 concrete. By the end you'll have a production-shaped config for both a classic static site and a single-page app (SPA).

## A minimal static site

```nginx
server {
    listen 80;
    server_name example.com www.example.com;

    root  /var/www/example;   # files live here
    index index.html;         # what to serve for a directory

    location / {
        try_files $uri $uri/ =404;
    }
}
```

The star of the show is **`try_files`**. It tries each argument in order and serves the first that exists:

- `$uri` — the requested file as-is (e.g. `/about.html`).
- `$uri/` — the request as a directory (serve its `index`).
- `=404` — if nothing matched, return a 404.

> 🔑 `try_files` is the workhorse of static serving. Read it as: *"try this file, then this directory, otherwise do X."* The last argument is the fallback.

## The SPA pattern (React/Vue/Svelte builds)

Single-page apps do their own client-side routing. The browser may request `/dashboard/settings`, but there's no such *file* — only `index.html` plus JS. So the fallback changes: instead of 404, hand unmatched routes to `index.html` and let the app router take over.

```nginx
server {
    listen 80;
    server_name app.example.com;
    root  /var/www/app/dist;     # your `vite build` / `npm run build` output
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;   # ← the SPA fallback
    }
}
```

> 💡 **The one line that makes SPAs work:** `try_files $uri $uri/ /index.html;`. Without it, deep links and page refreshes on client-side routes return 404. With it, real assets are served directly and everything else falls through to the app.

### But don't fall back for assets or the API

If a missing `/assets/old.js` falls through to `index.html`, the browser gets HTML where it expected JavaScript — a confusing `Unexpected token '<'` error. Protect real asset paths so they 404 honestly, and never let `/api` fall back to HTML:

```nginx
    # Hashed build assets: cache hard, and 404 if truly missing
    location /assets/ {
        try_files $uri =404;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
```

## Caching headers: fast *and* correct

The trick to static performance is telling browsers what they may reuse and for how long:

- **Fingerprinted assets** (`app.4f3a9b.js`) — the hash changes when content changes, so cache them **forever**: `expires 1y; Cache-Control: public, immutable`.
- **`index.html`** — must *not* be cached long, or users keep loading old versions that point at deleted assets: `Cache-Control: no-cache` (revalidate every load).

```nginx
    location = /index.html {
        add_header Cache-Control "no-cache";
    }
```

> ⚠️ The classic deploy bug: a long-cached `index.html` references `app.OLD.js`, which you've deleted → blank page. Fix the *policy*, not each incident: **immutable hashed assets, never-cached HTML.**

## Compression

Compress text-based responses to cut transfer size dramatically:

```nginx
gzip on;
gzip_comp_level 5;
gzip_min_length 1024;          # don't bother with tiny files
gzip_types text/plain text/css application/javascript application/json
           image/svg+xml application/xml;
# gzip_static on;              # serve pre-compressed .gz files if present
```

(Already-compressed formats like JPEG/PNG/WebP/MP4 won't shrink — don't list them.) Where available, **Brotli** compresses even better for static assets; many builds ship pre-compressed `.br`/`.gz` files that Nginx can serve directly.

## A few quality-of-life touches

```nginx
    # Custom error page
    error_page 404 /404.html;

    # Don't log noise, and serve favicons quietly
    location = /favicon.ico { access_log off; log_not_found off; }

    # Block hidden files like .git, .env
    location ~ /\. { deny all; }
```

## Putting it together (a real SPA server block)

```nginx
server {
    listen 80;
    server_name app.example.com;
    root  /var/www/app/dist;
    index index.html;

    gzip on;
    gzip_types text/css application/javascript application/json image/svg+xml;

    location /assets/ {
        try_files $uri =404;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location = /index.html {
        add_header Cache-Control "no-cache";
    }

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~ /\. { deny all; }
}
```

Test and reload: `sudo nginx -t && sudo nginx -s reload`.

## Check yourself

1. What does `try_files $uri $uri/ /index.html;` do, and why is the third argument essential for an SPA?
2. Why should hashed assets be cached for a year but `index.html` not cached at all?
3. A user hard-refreshes `/reports/2026` in your SPA and gets a 404. What's almost certainly missing from the config?

## Key takeaways

- **`try_files`** drives static serving; the **SPA fallback** is `try_files $uri $uri/ /index.html;`.
- Don't let **assets or `/api`** fall back to `index.html` — let them 404 honestly to avoid "unexpected token '<'" errors.
- Cache **fingerprinted assets as immutable for a year**, but keep **`index.html` uncached** so deploys take effect.
- Turn on **gzip/Brotli** for text assets; serve pre-compressed files when you have them.
