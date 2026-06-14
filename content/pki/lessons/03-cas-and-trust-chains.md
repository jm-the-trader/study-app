# Certificate Authorities & Chains of Trust

A certificate is only as believable as whoever signed it. This lesson is about *who* does the signing and *why your device believes them* — the heart of PKI.

## The trust anchor problem

Your browser has never met `mybank.com`. So how does it decide the bank's certificate is genuine? It can't trust *everyone*. The solution is to trust a **small, fixed set of root CAs** up front, and let trust flow *downward* from them.

This pre-installed list is the **trust store** (a.k.a. root store). Your operating system and browser ship with ~100–150 root CA certificates that experts have vetted. Everything else is trusted *transitively*, by chaining back to one of these roots.

> 🔑 **Core idea:** You don't trust a website's certificate directly. You trust a **root**, and the root's signature (possibly through intermediates) vouches for the website. Trust is *delegated*.

## The three tiers

```
        ┌─────────────────────┐
        │      Root CA        │  self-signed, kept OFFLINE in a vault
        │  (in your trust     │
        │      store)         │
        └──────────┬──────────┘
                   │ signs
        ┌──────────▼──────────┐
        │   Intermediate CA   │  online, does the day-to-day signing
        └──────────┬──────────┘
                   │ signs
        ┌──────────▼──────────┐
        │  Leaf / End-entity  │  mybank.com — the cert on the server
        └─────────────────────┘
```

### Root CA

- **Self-signed**: the issuer and subject are the same. There's no one above it to vouch — it's a *trust anchor*. You trust it because it's in your store, full stop.
- Its private key is astronomically valuable, so it's kept **offline** ("air-gapped"), often in a hardware security module (HSM) inside a physical vault. It signs rarely.

### Intermediate CA (a.k.a. issuing CA)

- Signed *by* the root, and authorized to sign further certs (`Basic Constraints: CA:TRUE`).
- This is the workhorse that actually issues your `mybank.com` cert.
- **Why bother with a middle layer?** If an intermediate's key is ever compromised, you revoke *that intermediate* — the precious root stays safe and offline. The root's rare signatures also limit its exposure.

### Leaf / end-entity certificate

- The actual server (or person, or device) certificate. `Basic Constraints: CA:FALSE` — it cannot sign other certificates, only identify its subject.

## How verification actually works

When you connect, the server sends its leaf cert **plus the intermediate(s)** — together called the **chain** or **bundle**. Your client then walks the chain upward:

1. Does the **leaf**'s `Issuer` match an intermediate it was given? Verify the leaf's signature using the intermediate's public key. ✔
2. Does that **intermediate**'s `Issuer` match a root? Verify its signature using the root's public key. ✔
3. Is that **root** in my **trust store**? ✔
4. For every cert: is it within its validity dates, not revoked, and used for the right purpose (EKU `serverAuth`)? ✔
5. Does the leaf's **SAN** match the hostname I typed? ✔

If every link holds, the chain is trusted. Break any link — expired cert, wrong hostname, unknown root, missing intermediate — and the connection fails.

> ⚠️ **The #1 real-world chain bug:** the server forgets to send the **intermediate** certificate. It often *works in your browser* (which caches intermediates) but fails in `curl`, mobile apps, and other clients. Always serve the **full chain** (leaf + intermediates), not just the leaf. Test with `openssl s_client -connect host:443` and look for "Verify return code: 0 (ok)".

## Cross-signing (why one cert can have two paths)

Sometimes a CA's newer root isn't yet in older devices' trust stores. To stay compatible, the intermediate is **cross-signed**: signed by *both* the new root and an older, widely-trusted root. Clients pick whichever path leads to a root *they* know. This is how new CAs bootstrap trust without breaking old phones.

## Private PKI: be your own CA

Inside a company, you don't need a public CA. You can stand up your **own root and intermediate**, distribute the root to your fleet's trust stores (via MDM/group policy), and issue certs for internal services, VPNs, and devices. Same chain-of-trust mechanics — you simply control the anchor. (You'll build a mini version of this in the next lesson.)

> 💡 The difference between a "public" and "private" CA isn't the technology — it's *whose trust store the root lives in*. A public CA's root is in everyone's store; your private root is only in *yours*.

## Check yourself

1. Why is a root CA's certificate self-signed, and why isn't that a security problem?
2. Your site loads fine in Chrome but `curl` reports "unable to get local issuer certificate." What did the server almost certainly forget to send?
3. What concrete advantage do you get from issuing leaf certs off an *intermediate* instead of signing them directly with the root?

## Key takeaways

- Trust flows **downward** from a small set of pre-trusted **root CAs** in your device's **trust store**.
- A typical chain is **Root → Intermediate → Leaf**; roots stay **offline**, intermediates do the daily signing.
- Clients verify by **walking the chain** to a trusted root, checking signature, dates, revocation, purpose, and hostname (SAN) at each step.
- Servers must present the **full chain**; a missing intermediate is the classic "works for me, broken for them" bug.
