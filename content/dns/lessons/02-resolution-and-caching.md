# Resolution & Caching

How does "what's the IP for `www.example.com`?" actually get answered? This lesson traces the **resolution** walk down the hierarchy and explains **caching + TTL** — the mechanism behind both DNS's speed *and* the dreaded "wait for propagation."

## The cast

- **Stub resolver** — the tiny client in your OS that kicks off the query.
- **Recursive resolver** (a.k.a. recursor/resolver) — does the legwork of finding the answer for you, then caches it. Usually your ISP's, or a public one like `1.1.1.1` (Cloudflare) / `8.8.8.8` (Google).
- **Authoritative name servers** — the servers that hold the *real* records for a zone and give definitive answers. Three tiers: **root**, **TLD**, and the **domain's own** name servers.

> 🔑 The split: a **recursive resolver** *finds* the answer (asking around and caching); **authoritative** servers *are* the source of truth for their zone. "Recursive" = does the work for you; "authoritative" = owns the data.

## The resolution walk

```
You ask the recursive resolver: "A record for www.example.com?"

resolver ─► ROOT server:        "who handles .com?"      → "ask the .com TLD servers"
resolver ─► .com TLD server:    "who handles example.com?" → "ask ns1.example.com (the NS records)"
resolver ─► example.com's NS:   "A record for www.example.com?" → "93.184.216.34"  ✅ (authoritative)
resolver ─► you:                "93.184.216.34"  (and caches it)
```

> 🔑 Resolution walks the hierarchy **top-down**: root tells you who runs the TLD, the TLD tells you who runs the domain, the domain's name servers give the final answer. Each step **delegates** via **NS records** pointing to the next level. The root doesn't know `www.example.com` — it only knows who runs `.com`.

The resolver does this **recursively** (it chases each referral); the authoritative servers answer **iteratively** ("I don't know, but ask them"). You only ever talk to your resolver.

## Caching: why it's fast (and stale)

If every lookup walked the full hierarchy, DNS would be slow and the root servers would melt. So **every resolver caches answers** — and so does your OS and browser. The next request for `example.com` is answered instantly from cache, skipping the walk entirely.

> 🔑 **Caching is what makes DNS fast at planetary scale** — most queries never reach an authoritative server. The trade-off: a cached answer can be **stale** until it expires.

## TTL: how long to cache

Each DNS record carries a **TTL (Time To Live)** in seconds, set by the domain owner. It tells resolvers **how long they may cache** the answer before re-checking.

```
www.example.com.   300   IN   A   93.184.216.34
                    ↑ TTL = cache for 300s (5 min)
```

- **Low TTL** (e.g. 60–300s) → changes take effect quickly, but more queries hit your authoritative servers.
- **High TTL** (e.g. 3600–86400s) → fewer queries, better resilience, but changes propagate slowly.

> 💡 **"DNS propagation" is really just caches expiring.** When you change a record, resolvers worldwide keep serving the *old* value until their cached copy's TTL runs out — which is why a change can take minutes to a day to be seen everywhere. There's no global push; you wait out the TTL.

### The migration trick

Planning to change a record (e.g. point a domain to a new server)? **Lower the TTL well in advance** (say to 60s, at least the old TTL before the change), make the change, confirm it, then raise the TTL back. That shrinks the window where users hit the old value.

> ⚠️ Common gotcha: you update a record and "it's not working" — but you (or your resolver) cached the old answer. Check with `dig` (which shows the remaining TTL) and query an authoritative server directly (`dig @ns1.example.com ...`) to see the real current value, bypassing caches. (Full troubleshooting in a later lesson.)

## Negative caching

Resolvers also cache **failures** ("this name doesn't exist", NXDOMAIN) for a period set by the zone's **SOA** record (record-types lesson). So if you query a name *before* you create it, the "doesn't exist" answer may be cached briefly even after you add the record — another reason changes can seem delayed.

## Check yourself

1. What's the difference between a recursive resolver and an authoritative name server?
2. Walk the resolution of `www.example.com` from root downward, naming what each tier tells the resolver.
3. What does "DNS propagation" actually mean, and how do you minimize the delay before a planned record change?

## Key takeaways

- A **recursive resolver** finds answers (and caches them) by walking the hierarchy **top-down**: **root → TLD → domain's authoritative name servers**, following **NS** delegations; **authoritative** servers are the source of truth.
- **Caching** at resolvers/OS/browser makes DNS fast — most queries never reach authoritative servers.
- **TTL** controls how long an answer is cached; **"propagation" is just caches expiring** — lower the TTL *before* a planned change, then raise it afterward.
- Stale caches (and **negative caching** of NXDOMAIN) explain most "I changed it but it's not working" confusion — verify with `dig` against an authoritative server.
