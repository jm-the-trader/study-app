# DNS Record Types

A DNS zone is a collection of **records**, each a different *type* answering a different question. Knowing the common types — and their gotchas — is daily bread for anyone who manages domains.

## Reading a record

```
www.example.com.   3600   IN   A   93.184.216.34
└──── name ─────┘   TTL  class  ┬   └── value (RDATA) ──┘
                              type
```

- **name** — the record's name (often a subdomain).
- **TTL** — cache lifetime (last lesson).
- **class** — almost always `IN` (Internet).
- **type** — what kind of record (below).
- **value** — the data for that type.

## The records you'll use constantly

### A and AAAA — name → IP
The core mapping.
```
example.com.      A      93.184.216.34       # name → IPv4
example.com.      AAAA   2606:2800:220:1::    # name → IPv6
```
> 🔑 **A = IPv4, AAAA = IPv6.** ("AAAA" = four times the bits of an A record.) These are the records that ultimately produce the IP your client connects to.

### CNAME — name → another name (alias)
Points one name at another, which is then resolved.
```
www.example.com.   CNAME   example.com.       # www is an alias for the apex
shop.example.com.  CNAME   myshop.shopify.com.
```
> ⚠️ Two classic CNAME rules: (1) **A CNAME can't coexist with other records** for the same name. (2) You **can't put a CNAME at the zone apex** (the bare `example.com`) because the apex must have SOA/NS records. To alias the apex, providers offer non-standard **ALIAS/ANAME** (or Cloudflare's "CNAME flattening"). This bites everyone setting up an apex domain on a CDN.

### MX — mail routing
Tells the world which mail servers accept email for the domain, with **priority** (lower = preferred).
```
example.com.   MX   10 mail1.example.com.
example.com.   MX   20 mail2.example.com.    # backup (higher number = lower priority)
```

### TXT — arbitrary text (used for verification & email auth)
Free-form text, heavily used for:
- **Domain verification** (Google, AWS, etc. ask you to add a TXT record to prove ownership).
- **Email authentication:** **SPF** (which servers may send mail for you), **DKIM** (signing keys), **DMARC** (policy). Misconfigured SPF/DKIM/DMARC is the #1 cause of email landing in spam.

### NS — delegation
Names the authoritative name servers for a zone — the delegation glue from the resolution lesson.
```
example.com.   NS   ns1.registrar.com.
example.com.   NS   ns2.registrar.com.
```
> 💡 The NS records at your **registrar/parent** must match your DNS host's name servers, or lookups break. Pointing NS records at the wrong host is a common "my whole domain is down" cause.

### SOA — zone metadata
"Start of Authority" — one per zone. Holds the primary name server, admin email, a **serial number** (bump it when you change the zone, used for replication to secondaries), refresh/retry timers, and the **negative-caching TTL** (how long NXDOMAIN is cached — last lesson).

## Records worth knowing

| Type | Purpose |
|---|---|
| **CAA** | Restricts which Certificate Authorities may issue certs for the domain (ties to the PKI topic — defense against mis-issuance). |
| **SRV** | Advertises a service's host + **port** (used by some protocols / service discovery). |
| **PTR** | **Reverse DNS**: IP → name. Lives in a special reverse zone; important for mail-server reputation. |
| **CNAME flattening / ALIAS** | Provider feature to fake a CNAME at the apex (see above). |

## A small zone, end to end

```
example.com.        SOA    ns1.host.com. admin.example.com. 2026061401 ...
example.com.        NS     ns1.host.com.
example.com.        NS     ns2.host.com.
example.com.        A      93.184.216.34
www.example.com.    CNAME  example.com.
api.example.com.    A      93.184.216.40
example.com.        MX     10 mail.example.com.
example.com.        TXT    "v=spf1 include:_spf.google.com ~all"
example.com.        CAA    0 issue "letsencrypt.org"
```

That single zone gets you a website (apex + www), an API subdomain, working email, sender authentication, and a CA restriction.

## Check yourself

1. What's the difference between an A record and a CNAME, and what are the two big CNAME restrictions?
2. Which record type routes email, and what does its priority number mean?
3. You need to prove domain ownership to a cloud provider and configure who can send email as you. Which record type do both use?

## Key takeaways

- Records have a **name, TTL, type, and value**; **A/AAAA** map a name to an **IPv4/IPv6** address.
- **CNAME** aliases one name to another — but **can't coexist with other records** and **can't sit at the apex** (use ALIAS/flattening there).
- **MX** routes mail (lower priority = preferred); **TXT** powers domain verification and **SPF/DKIM/DMARC** email auth; **NS** delegates the zone; **SOA** holds zone metadata + negative-cache TTL.
- Know **CAA** (restrict cert issuers — PKI link), **SRV** (host+port), and **PTR** (reverse DNS) for completeness.
