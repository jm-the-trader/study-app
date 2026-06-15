# Advanced: DNSSEC, Encrypted DNS & Traffic Routing

> **The one-sentence version:** Plain DNS answers can be forged and snooped; the advanced layer adds *cryptographic authenticity* (DNSSEC), *privacy* (DoT/DoH), and turns DNS itself into a *global traffic controller*.

You know resolution, caching, record types, and the basic security surface. Now we make answers trustworthy, private, and intelligent.

## DNSSEC: proving an answer wasn't forged

Classic DNS has no integrity check — a poisoned cache or on-path attacker can hand you a fake IP (the Kaminsky attack exploited exactly this). **DNSSEC** signs records so a resolver can verify authenticity.

- Each zone signs its record sets, producing an **RRSIG** (the signature) validated against the zone's public key in a **DNSKEY** record.
- Trust chains *downward*: the parent zone publishes a **DS** record — a hash of the child's key — so `.com` vouches for `example.com`, and the root vouches for `.com`. The **root zone's key is the trust anchor** (analogous to a root CA in PKI).
- **NSEC/NSEC3** records authenticate *non-existence* ("there is genuinely no such name"), preventing forged "doesn't exist" replies.

> ⚠️ DNSSEC provides **authenticity and integrity, not confidentiality** — answers are signed, not encrypted. It also doesn't help if a zone simply isn't signed (much of the internet still isn't). And misconfigured/expired signatures cause hard `SERVFAIL` outages — signatures expire and must be re-signed on schedule.

## Encrypted DNS: DoT and DoH

DNSSEC stops *forgery* but the query/response still travels in cleartext on UDP/53 — anyone on the path can see every domain you visit. Two protocols encrypt the transport:

| Protocol | Transport | Notes |
|---|---|---|
| **DoT** (DNS over TLS) | TLS on port **853** | Easy for network admins to identify/manage (own port) |
| **DoH** (DNS over HTTPS) | HTTPS on port **443** | Looks like normal web traffic — harder to block, controversial for that reason |

Both protect privacy and tampering *in transit*; they're complementary to DNSSEC (which protects authenticity *end to end*).

## EDNS0: getting past 512 bytes

Original DNS capped UDP responses at 512 bytes. **EDNS0** (extension mechanisms) negotiates larger UDP payloads and carries options like **client subnet** (so geo-routing resolvers know roughly where you are). DNSSEC responses are large, so EDNS0 is effectively required for it to work over UDP.

## DNS as a traffic director

Because resolvers ask DNS *first*, the answer can be computed per-request to steer users:

- **GeoDNS / latency-based routing** — return the IP of the nearest or fastest region.
- **Weighted routing** — split traffic by percentage (a DNS-level canary or A/B test).
- **Failover / health-checked records** — only hand out IPs of endpoints currently passing health checks.
- **Anycast** — advertise the *same* IP from many locations via BGP; the network routes each user to the closest instance. This is how big resolvers (1.1.1.1, 8.8.8.8) and CDNs achieve global low latency and absorb DDoS.

> 💡 The catch with all DNS-based routing is **TTL and caching**. A 300-second TTL means a failover can take up to 5 minutes to take effect for cached clients. Keep TTLs short on records you intend to fail over — but not so short you hammer your authoritative servers.

## A couple more records worth knowing

- **CAA** — declares *which* CAs are allowed to issue certificates for your domain (ties to the PKI topic); CAs must honor it.
- **SVCB/HTTPS** records — advertise endpoint capabilities (e.g. HTTP/3 support, alt ports) before the connection, reducing round trips.

## Check yourself

1. DNSSEC and DoH both improve DNS security — what *different* guarantee does each provide?
2. Walk the DNSSEC chain of trust from the root to `example.com`. What role does the DS record play?
3. Why does a short TTL matter for DNS-based failover, and what's the downside of making it too short?
4. How does anycast let `8.8.8.8` be "close" to everyone at once?

## Key takeaways

- **DNSSEC** signs records (**RRSIG/DNSKEY/DS**, with **NSEC** for non-existence) so resolvers can verify authenticity — a chain of trust anchored at the root, like PKI. It's integrity, **not** encryption, and expired signatures cause outages.
- **DoT (853)** and **DoH (443)** encrypt the DNS *transport* for privacy; **EDNS0** enables large responses (needed for DNSSEC) and client-subnet hints.
- DNS doubles as a **traffic controller**: GeoDNS, latency/weighted routing, health-checked failover, and **anycast** for global proximity and DDoS resilience.
- All DNS routing is gated by **TTL/caching** — short TTLs speed failover at the cost of more query load.
- **CAA** records constrain which CAs may issue your certs; **SVCB/HTTPS** records advertise endpoint capabilities up front.
