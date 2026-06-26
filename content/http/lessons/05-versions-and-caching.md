# HTTP Versions and Caching

> **The one-sentence version:** HTTP/1.1, /2, and /3 send the *same* methods and headers but move them across the wire very differently — and HTTP caching is the highest-leverage performance trick there is, because the fastest request is the one you never make.

## Why it matters

"Why is the site slow?" and "why won't my change show up?" are both answered here. Connection reuse and protocol version govern throughput and latency; caching governs whether a request even leaves the building. Both come up constantly behind proxies and CDNs.

## The protocol versions

| Version | Transport | Headline feature | The problem it fixed |
|---|---|---|---|
| **HTTP/1.0** | TCP, new connection per request | — | Crushing overhead: a TCP (and TLS) handshake *per* file |
| **HTTP/1.1** | TCP, **persistent** connections | `keep-alive`, chunked transfer, `Host` | Reuse one connection for many requests |
| **HTTP/2** | TCP, one connection | **Multiplexing** + header compression (HPACK) | Many concurrent streams on one connection |
| **HTTP/3** | **QUIC over UDP** | Multiplexing without TCP head-of-line blocking | A lost packet no longer stalls every stream |

### HTTP/1.1: keep-alive and its limit

HTTP/1.1 keeps the TCP connection open (`Connection: keep-alive`) so subsequent requests skip the handshake. But responses on one connection still come back **in order** — a slow response blocks the ones behind it. This is **head-of-line (HOL) blocking** at the HTTP layer, and browsers worked around it by opening ~6 parallel connections per host.

### HTTP/2: multiplexing

HTTP/2 puts many independent **streams** on a *single* connection, interleaved, so responses no longer have to wait in line — solving application-layer HOL blocking and removing the need for 6 connections. It also compresses headers (**HPACK**), which matters when every request repeats the same cookies and `User-Agent`.

> 🔑 HTTP/2's win is **one connection, many concurrent streams**. But because it still rides on a single **TCP** connection, a lost TCP packet stalls *all* streams until it's retransmitted — TCP-level HOL blocking. HTTP/3 fixes this by moving to **QUIC over UDP**, where streams are independent at the transport layer too.

> 💡 HTTP/2 "server push" existed but is effectively **deprecated** (browsers removed support) — don't design around it. Multiplexing and header compression are the features that actually carried over.

## HTTP caching: don't make the request

Caching is governed by response headers, and the model has two halves.

### 1. Freshness — avoid the request entirely

`Cache-Control` tells caches (the browser, a CDN, a proxy) how long a response stays "fresh":

```http
Cache-Control: max-age=3600          # reusable without asking for 1 hour
Cache-Control: no-cache              # may cache, but MUST revalidate before reuse
Cache-Control: no-store              # never cache (sensitive data)
Cache-Control: public, max-age=31536000, immutable   # great for hashed asset files
```

While a response is fresh, the cache serves it with **zero network round-trips**.

### 2. Validation — a cheap "still good?" check

When freshness expires, the client doesn't blindly re-download. It revalidates using a fingerprint the server sent earlier:

```http
# First response carried a validator:
ETag: "v3-abc123"

# On revalidation the client asks "only send it if it changed":
If-None-Match: "v3-abc123"

# If unchanged, the server replies with NO body:
HTTP/1.1 304 Not Modified
```

A **`304 Not Modified`** means "your copy is still good" — headers only, no payload. (`Last-Modified`/`If-Modified-Since` is the older, date-based version of the same idea.)

> ⚠️ The classic "my CSS change won't show up" bug is caching working *as told*: a long `max-age` on `style.css` means browsers reuse the old file until it expires. The standard fix is **cache busting** — put a content hash in the filename (`style.a1b2c3.css`) and serve it `immutable`, so a change produces a new URL the cache has never seen.

## Compression

Servers compress text payloads (HTML/CSS/JS/JSON) when the client advertises support:

```http
Accept-Encoding: gzip, br            # client: I understand gzip and Brotli
Content-Encoding: br                 # server: here's a Brotli-compressed body
```

This often shrinks text responses by 70–80%. It's usually configured at the proxy/CDN (an Nginx `gzip on;` or the OpenShift router), not the app.

## Check yourself

1. What problem did persistent connections (HTTP/1.1 keep-alive) solve, and what limitation remained?
2. Distinguish HTTP/2 multiplexing from HTTP/3's reason for existing — what kind of head-of-line blocking does each address?
3. Walk through what happens on a request for a cached-but-stale resource that has an `ETag`.

## Key takeaways

- All HTTP versions share methods/headers but differ on the wire: **1.1** = persistent connections; **2** = multiplexed streams + header compression on one TCP connection; **3** = QUIC/UDP to beat TCP head-of-line blocking.
- HTTP/2 solved **application-layer** HOL blocking but not **TCP-layer**; that's HTTP/3's whole point. Don't rely on HTTP/2 **server push** (deprecated).
- Caching has two halves: **freshness** (`Cache-Control: max-age` → serve with no round-trip) and **validation** (`ETag` + `If-None-Match` → cheap **`304 Not Modified`**).
- Cache-related "stale content" bugs are caching doing what you told it — fix with **cache busting** (hashed filenames + `immutable`).
