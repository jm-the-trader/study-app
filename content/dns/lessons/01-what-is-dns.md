# What Is DNS?

> **The one-sentence version:** DNS is the internet's **phone book** — it translates human-friendly names like `example.com` into the IP addresses machines actually route to, so you never have to memorize numbers.

## The problem DNS solves

From the Networking topic, you know traffic is delivered to **IP addresses** (`93.184.216.34`), not names. But humans can't remember IPs for every site, IPs change, and one name may map to many servers. We need a layer that maps **names → IPs**, is **globally consistent**, **updatable**, and **fast** at massive scale.

That's **DNS (Domain Name System)** — arguably the largest distributed database in the world, queried trillions of times a day.

> 🔑 **DNS turns names into IPs.** Almost every connection starts with a DNS lookup: your browser asks "what's the IP for `example.com`?", gets an answer, *then* opens the TCP connection (recall the troubleshooting lesson — `ping name` failing while `ping IP` works is a DNS problem). DNS is step zero of nearly everything.

## Anatomy of a domain name

Domain names are **hierarchical**, read **right to left** (most general → most specific):

```
            www  .  example  .  com  .
            └┬─┘     └──┬───┘    └┬┘   └ root (the trailing dot, usually implied)
         subdomain   second-level  TLD
                       domain
```

- **Root** — the implicit trailing `.` at the very top of the hierarchy.
- **TLD (Top-Level Domain)** — `.com`, `.org`, `.io`, country codes like `.uk`, etc.
- **Second-level domain** — `example` (what you register).
- **Subdomain** — `www`, `api`, `mail` — you create these freely under your domain.
- The whole thing is a **FQDN** (Fully Qualified Domain Name) when it includes everything down to the root.

> 💡 Reading right-to-left mirrors how resolution works (next lesson): you start at the **root**, find who handles `.com`, then who handles `example.com`, then look up `www`. The hierarchy *is* the lookup path.

## Why "distributed" matters

No single server could answer all the world's DNS queries, and no single organization could own every name. So DNS **delegates**: the root delegates each TLD to registries, which delegate each domain to its owner's **name servers**, which answer for that domain. Authority is handed down the tree.

> 🔑 DNS scales because authority is **delegated** down the hierarchy and answers are **cached** everywhere (next lesson). No central bottleneck, no single owner — each level is responsible only for delegating to the level below.

## Where you already rely on DNS

- Every website, API call, and `git pull` over a hostname.
- **Email** routing (MX records — record types lesson).
- **Service discovery** inside Kubernetes (`db.prod.svc.cluster.local` — recall the k8s networking lesson; CoreDNS is DNS).
- Domain verification, SPF/DKIM (TXT records), CDN and load-balancer routing.

## The mental model in one picture

```
"What's the IP for www.example.com?"
        │
   [ resolver ] ── asks ──► root ──► .com servers ──► example.com's name servers
        │                                                      │
        └──────────────── "93.184.216.34" ◄───────────────────┘
        │
   browser opens TCP/TLS to 93.184.216.34
```

The *how* of that walk — resolvers, caching, TTLs — is the next lesson. For now: **name in, IP out, via a delegated hierarchy.**

## Check yourself

1. In one sentence, what does DNS do, and why does almost every connection begin with it?
2. Break down `api.example.co.uk` into root / TLD / domain / subdomain (reading right to left).
3. Why is DNS designed as a *distributed*, delegated system rather than one central database?

## Key takeaways

- DNS maps **names → IP addresses** — the internet's phone book and the first step of nearly every connection.
- Domain names are **hierarchical**, read **right to left**: root → **TLD** → second-level **domain** → **subdomains** (a full path is an **FQDN**).
- It scales by **delegating authority** down the tree and **caching** answers — no central bottleneck or owner.
- DNS underpins web, email, and **service discovery** (e.g. Kubernetes/CoreDNS), making it foundational platform infrastructure.
