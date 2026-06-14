# Certificate Lifecycle, Expiry & Revocation

A certificate isn't "set and forget." It's born, it lives a fixed lifespan, sometimes it must be killed early, and it always eventually dies. Managing that lifecycle well is where most real-world PKI pain lives.

## The lifecycle at a glance

```
  generate key → CSR → issue → DEPLOY → monitor → renew  ↺
                                  │
                                  └── (if compromised) → REVOKE
                                  └── (always, eventually) → EXPIRE
```

## Validity windows: why certs expire on purpose

Every cert carries `Not Before` and `Not After` dates. Expiry is a **feature**, not an annoyance:

- It **limits blast radius** — a stolen key is only useful until the cert expires.
- It **forces key rotation** and config hygiene.
- It lets the ecosystem retire weak algorithms on a schedule.

Lifetimes have been shrinking hard. Public TLS certs were once valid for years; the industry maximum is now **398 days** and trending toward ~47 days. The unmistakable lesson: **renewal must be automated.** A human calendar reminder does not scale and *will* be missed.

> ⚠️ **Expired-certificate outages are among the most common and embarrassing outages in tech** — they've taken down payment networks, telecoms, and major sites. The fix is never "be more careful"; it's "automate renewal and monitor expiry."

## Renewal vs. rotation

- **Renewal** — get a fresh cert before the old one expires. Best practice: **reuse the same CSR identity but generate a *new key*** each time (true rotation), so a quietly-leaked old key becomes worthless.
- **Automate it** with the **ACME** protocol (the thing Let's Encrypt popularized). Clients like `certbot`, `acme.sh`, or Caddy prove control of the domain and fetch/install renewed certs unattended. Renew at ~⅔ of the lifetime so you have a buffer to fix failures.

## Revocation: killing a cert before it expires

Sometimes you can't wait for expiry — the private key leaked, an employee left, a domain changed hands, or a cert was mis-issued. You need to declare a still-dated certificate **no longer valid**. Two mechanisms exist:

### CRL — Certificate Revocation List

The CA publishes a signed list of revoked serial numbers. Clients download it and check membership.

- ✅ Simple, offline-verifiable.
- ❌ Lists grow large; clients cache them, so revocation can lag.

### OCSP — Online Certificate Status Protocol

The client asks the CA's responder, in real time, "is serial `0x…` still good?" and gets a signed `good` / `revoked` / `unknown`.

- ✅ Timely, small responses.
- ❌ A network round-trip per check; a **privacy leak** (the responder learns which sites you visit); and if the responder is down, clients must choose between failing open (insecure) or closed (fragile).

### OCSP Stapling — the practical fix

Instead of *your visitors* phoning the CA, **the server** periodically fetches a fresh, signed OCSP response and **staples** it to the TLS handshake. The client gets proof-of-freshness with no extra request and no privacy leak.

```nginx
# nginx: enable OCSP stapling
ssl_stapling on;
ssl_stapling_verify on;
ssl_trusted_certificate /etc/ssl/chain.pem;
```

> 💡 The honest state of the world: browser revocation checking is famously unreliable, which is *another* reason short lifetimes matter — a 47-day cert is "self-revoking" fast enough that revocation matters less. **Short-lived certs are the strategic direction; revocation is the emergency brake.**

## When you must revoke

Revoke immediately if:

- A private key is exposed (committed to git, leaked in logs, stolen).
- A cert was mis-issued or contains wrong information.
- The subject is decommissioned or the domain is transferred.
- An employee/device holding a client cert departs.

With your own CA (Lesson 4), revocation looks like:

```bash
# Mark a cert revoked in the CA database, then publish an updated CRL
openssl ca -config ca.cnf -revoke server.crt
openssl ca -config ca.cnf -gencrl -out acme.crl
```

## Operational hygiene that prevents 3 a.m. pages

- 📅 **Monitor expiry** for *every* cert — endpoints, internal services, load balancers, even client certs. Alert at 30 *and* 7 days out.
- 🔁 **Automate renewal** (ACME) wherever possible; treat manual certs as tech debt.
- 🗝️ **Protect private keys**: restrict file permissions (`chmod 600`), keep them out of version control, use HSMs/secret managers for high-value keys, and **rotate keys on renewal**.
- 🧾 **Inventory** what you have. You can't renew the cert you forgot existed. (Certificate Transparency logs and tools like `crt.sh` help you discover certs issued for your domains.)
- 🧪 **Check before deploy**: `openssl s_client -connect host:443` and confirm dates, chain, and stapling.

## A quick word on Certificate Transparency

Public CAs must log every cert they issue to append-only **Certificate Transparency (CT)** logs. This lets anyone detect mis-issuance — e.g. you can watch `crt.sh` for unexpected certs minted for *your* domains. It's a powerful, free monitoring tool: a cert you didn't request showing up is an early warning of compromise.

## Check yourself

1. Why is *short* certificate validity considered a security improvement rather than just a chore?
2. Your server must report revocation status without leaking your visitors' browsing to the CA. What do you enable?
3. A developer accidentally commits `server.key` to a public repo. What two actions do you take, and in what order?

## Key takeaways

- Certs have a deliberate lifespan; **expiry forces rotation** and shrinks the damage from leaks.
- **Automate renewal** with ACME — expired-cert outages are self-inflicted and avoidable.
- **Revocation** (CRL / OCSP, ideally **OCSP stapling**) is the early-kill switch when a cert can't wait for expiry.
- Real PKI is mostly **operations**: monitor expiry, protect and rotate keys, inventory everything, and watch CT logs.
