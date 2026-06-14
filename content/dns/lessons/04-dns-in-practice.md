# DNS in Practice: Zones, dig & Troubleshooting

This lesson is the hands-on side: who actually controls your DNS, how to read it with `dig`, and how to diagnose the DNS problems that cause a frustrating share of "the site is down" tickets.

## Registrar vs. DNS host vs. web host

Three roles people conflate — they're often different companies:

- **Registrar** — where you *bought* the domain (e.g. Namecheap, GoDaddy, Cloudflare Registrar). Controls the **NS records** at the parent that delegate your domain.
- **DNS host (authoritative provider)** — where your **zone records** live and are served (e.g. Route 53, Cloudflare, Google Cloud DNS). Set at the registrar via NS records.
- **Web host** — where your app actually runs (the IP your A record points to).

> 🔑 The chain is: **registrar's NS records → DNS host's name servers → your zone records → the web host's IP.** A break anywhere looks like "DNS is down." A super common mistake: you set up records at one DNS provider but the registrar's NS records still point somewhere else — so nobody ever reads your new records.

## dig: the DNS microscope

`dig` is the tool for seeing what DNS *actually* returns (recall it from the networking troubleshooting lesson).

```bash
dig example.com                 # full answer (A record), TTL, which server answered
dig +short example.com          # just the value(s)
dig example.com MX              # a specific record type
dig example.com NS              # the domain's name servers
dig +trace example.com          # walk the hierarchy from the root (see delegation!)
dig @1.1.1.1 example.com        # ask a SPECIFIC resolver (e.g. public, to bypass yours)
dig @ns1.example.com example.com  # ask the AUTHORITATIVE server directly (bypass all caches)
```

Reading the output, watch the **ANSWER SECTION** (the records), the **TTL** (remaining cache time — counts down on repeat queries), and the **flags** (`aa` = authoritative answer).

> 💡 The two highest-value moves: **`dig +trace`** shows you the exact delegation path (root → TLD → your NS) and where it breaks; **`dig @authoritative-ns`** shows the *true current* record with caches removed — so you can tell "the record is wrong" from "my cache is stale."

## The troubleshooting playbook

Most DNS issues fall into a few buckets. Diagnose in this order:

1. **Is it actually DNS?** `ping <IP>` works but `ping <name>` fails → yes, DNS (networking lesson). Confirm with `dig +short <name>`.
2. **Right answer from the source?** `dig @<your-authoritative-ns> <name>` — does the authoritative server return the value you expect?
   - **No** → the record is wrong/missing at your DNS host. Fix the record.
   - **Yes, but you see the old value via normal `dig`** → it's a **cache/TTL** issue. Wait out the TTL, or flush your local cache.
3. **Is delegation correct?** `dig <name> NS` and compare to what your DNS host says it should be, and to the NS records at the registrar. Mismatch → fix NS at the registrar.
4. **Does the name even exist?** `NXDOMAIN` = no such record (typo, wrong zone, or negative cache from querying before it existed).

> ⚠️ "I updated the record but it's not working" is *usually* one of: (a) edited the zone at a DNS host the registrar isn't pointing to, (b) **TTL/cache** still serving the old value, or (c) **negative cache** of an earlier NXDOMAIN. `dig @authoritative` vs `dig` (your resolver) instantly distinguishes "wrong record" from "stale cache."

## Flushing caches

When you've confirmed the authoritative record is correct but you still see old data locally:

```bash
# macOS
sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder
# Linux (systemd-resolved)
resolvectl flush-caches
```
Browsers cache too (and have their own DNS cache) — a full restart or incognito helps. Remember you can't flush *other people's* resolvers; only time (TTL) fixes that.

## Practical tips

- **Lower TTLs before planned changes** (last lesson) so cutovers are fast.
- **Keep registrar and DNS host NS records in sync** — verify after any provider change.
- **Use a managed DNS provider** for reliability (anycast, DDoS resistance) rather than self-hosting BIND unless you have a reason.
- **Document your zone** (it's infrastructure) — many teams manage DNS as code via Terraform (recall the Terraform topic) so records are reviewed and versioned.

## Check yourself

1. Explain the difference between the **registrar**, the **DNS host**, and the **web host** — and a failure each can cause.
2. Your record change "isn't working." Which two `dig` commands distinguish "wrong record" from "stale cache," and how?
3. What does `dig +trace` show you that a plain `dig` does not?

## Key takeaways

- Three roles: **registrar** (controls delegating NS records) → **DNS host** (serves your zone) → **web host** (the IP); a break anywhere looks like "DNS down."
- **`dig`** is the microscope: `+short`, by type, **`+trace`** (delegation path), **`@server`** (query a specific/authoritative server to bypass caches).
- Troubleshoot in order: is it DNS? → correct at the **authoritative** server? → **delegation** right? → does the name exist? `dig @authoritative` vs `dig` separates **wrong record** from **stale cache**.
- Lower TTLs before changes, keep registrar/host **NS in sync**, prefer **managed DNS**, and consider **DNS-as-code** (Terraform).
