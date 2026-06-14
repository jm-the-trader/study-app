# DNS for Platform Engineers

Beyond "name → IP," DNS is a surprisingly powerful tool for **traffic management, high availability, and service discovery** — and a meaningful **security** surface. This lesson covers the patterns you'll actually deploy.

## DNS as a traffic director

Because clients ask DNS *before* connecting, the DNS answer is a chance to steer traffic. Managed DNS providers turn records into routing policies:

- **Round-robin DNS** — return multiple A records; clients spread across them. Crude load balancing (no health awareness on its own).
- **Weighted records** — send X% of traffic to one target, Y% to another. Great for **canary releases** and gradual migrations (ties to the CI/CD topic's deploy strategies).
- **Latency / Geo routing (GeoDNS)** — answer with the nearest/fastest endpoint based on the resolver's location. How global services and CDNs send you to a close region.
- **Failover routing** — paired with **health checks**, the provider stops returning an unhealthy endpoint's record, shifting traffic to a healthy one.

> 🔑 **DNS-based load balancing/failover works by *which answer it returns*, not by proxying traffic** (unlike an L4/L7 load balancer that sits in the path). Its big limitation is **TTL/caching**: failover is only as fast as clients re-querying after the TTL expires, so use **low TTLs** on records you need to fail over quickly. DNS routing is coarse-grained but global and cheap.

## High availability patterns

- **Multiple A records + health-checked failover** for redundancy across servers/regions.
- **GeoDNS + regional endpoints** for latency and isolation.
- DNS in front of **load balancers**: typically DNS points at a load balancer (or its name via CNAME/ALIAS), and the LB does the fine-grained, health-aware distribution. DNS picks the *region/LB*; the LB picks the *server*.

## Split-horizon DNS

**Split-horizon (split-brain) DNS** returns *different answers depending on who's asking* — e.g. `app.internal.com` resolves to a **private** IP for queries from inside your network and to a **public** IP (or nothing) from outside. Used to keep internal services internal while sharing a naming scheme. Common in corporate networks and cloud private zones (e.g. Route 53 private hosted zones).

## DNS service discovery (incl. Kubernetes)

DNS is a natural **service registry**: register a service under a name, clients resolve the name. You already saw this in the Kubernetes topic — **CoreDNS** gives every Service a DNS name:

```
db.prod.svc.cluster.local   →  the Service's ClusterIP
```

> 💡 This is why "service discovery" in Kubernetes is *just DNS*: your `api` pod connects to `db` (or `db.prod`) by name, CoreDNS resolves it to the Service IP, and the Service load-balances to healthy pods. The same right-to-left hierarchy and resolution you learned applies inside the cluster. **SRV** records (host+port) and tools like Consul extend DNS-based discovery further.

## DNS security (a real attack surface)

DNS is critical and historically under-secured. Know the threats and defenses:

- **DNS spoofing / cache poisoning** — an attacker injects forged answers so a resolver caches a wrong IP, sending users to a malicious server. Defended by **DNSSEC**.
- **DNSSEC** — cryptographically **signs** DNS records so resolvers can verify answers are authentic and untampered (a chain of trust from the root, conceptually like the PKI topic's chains). It provides **authenticity/integrity**, not confidentiality.
- **DNS over HTTPS / TLS (DoH / DoT)** — encrypt the *query* between you and the resolver so it can't be **eavesdropped or tampered on the wire** (port 853 for DoT; DoH rides 443). This adds **privacy/confidentiality** (complementary to DNSSEC's authenticity).
- **DNS as exfiltration / C2 channel** — because DNS is almost always allowed out, malware abuses it to tunnel data. Defenders monitor for anomalous query patterns.
- **Domain/registrar hijacking** — protect the registrar account (MFA, registrar lock); losing it means losing your domain's traffic and email.

> 🔑 Two complementary protections: **DNSSEC = "is this answer authentic?"** (signing/integrity); **DoH/DoT = "can anyone see/alter my query?"** (encryption/privacy). They solve different problems; mature setups use both.

## Operational reminders

- Manage DNS **as code** (Terraform — recall that topic) so records are reviewed, versioned, and reproducible.
- Mind **TTLs** for the failover speed vs. query-load trade-off.
- Monitor DNS (resolution success, propagation, expiry of domains/DNSSEC keys) — an expired domain or DNSSEC misconfig is a full outage.

## Check yourself

1. How does DNS-based load balancing/failover differ from an L4/L7 load balancer, and what's its main limitation?
2. What is split-horizon DNS, and give a use case.
3. DNSSEC and DoH/DoT both "secure DNS" — what distinct problem does each solve?

## Key takeaways

- DNS steers traffic by **the answer it returns**: round-robin, **weighted** (canaries), **Geo/latency** routing, and **health-checked failover** — global and cheap, but **TTL-limited** in speed (use low TTLs for fast failover).
- DNS typically points at **load balancers** (DNS picks the region/LB; the LB picks the server); **split-horizon** returns internal vs. external answers for the same name.
- **Service discovery is DNS** — Kubernetes/CoreDNS resolves Service names to IPs; SRV records and Consul extend this.
- Secure it: **DNSSEC** for **authenticity/integrity** (anti-spoofing), **DoH/DoT** for **query privacy** — and protect the **registrar account**; manage records **as code**.
