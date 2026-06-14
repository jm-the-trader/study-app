# Putting It Together: The TLS Handshake

Everything so far — keys, certificates, chains, revocation — converges in one moment: the **TLS handshake**, the few milliseconds when your browser and a server set up a secure channel. This lesson shows how the pieces snap together, so the whole topic clicks into place.

## What TLS actually delivers

When you see 🔒 `https://`, TLS (Transport Layer Security, the successor to SSL) is giving you three things:

1. **Authentication** — you're talking to the real server (via its *certificate*, the thing this whole topic built up to).
2. **Confidentiality** — traffic is encrypted so eavesdroppers see gibberish.
3. **Integrity** — tampering is detected.

## The clever combination: asymmetric *and* symmetric

Recall: asymmetric crypto (Lesson 1) solves key distribution but is **slow**. Symmetric crypto (like AES) is **fast** but needs a shared secret. TLS uses each for what it's best at:

> 🔑 **The key insight:** TLS uses *asymmetric* keys only briefly — to authenticate the server and to safely agree on a fresh *symmetric* session key. Then it switches to fast *symmetric* encryption for the actual data. Best of both worlds.

## The handshake, step by step (TLS 1.3)

TLS 1.3 streamlined the handshake to a single round trip. Conceptually:

```
CLIENT                                                     SERVER
  │  ── ClientHello ───────────────────────────────────────► │
  │     • supported ciphers                                   │
  │     • a fresh ephemeral key share (ECDHE)                 │
  │                                                           │
  │  ◄─────────────────────────── ServerHello + Certificate  │
  │     • server's ephemeral key share                        │
  │     • the server's CERTIFICATE (+ chain, + OCSP staple)   │
  │     • a SIGNATURE proving it owns the cert's private key   │
  │                                                           │
  │  ── (verify everything) ──                                │
  │     ✓ chain builds to a trusted root  (Lesson 3)          │
  │     ✓ dates valid, not revoked        (Lesson 5)          │
  │     ✓ SAN matches the hostname        (Lesson 2)          │
  │     ✓ signature checks out → server holds the private key │
  │                                                           │
  │  ══ both derive the same symmetric session key (ECDHE) ══ │
  │  ◄════════════ encrypted application data ═══════════════► │
```

### What each part proves

- **The certificate** says *"this public key belongs to mybank.com,"* vouched for by a CA your device trusts. But anyone could *copy* a public certificate…
- **…so the server also signs** part of the handshake with its **private key**. Only the real owner can produce that signature, and you verify it with the public key in the cert. This is the moment authentication actually happens. Copying the cert isn't enough — you'd need the private key.
- **ECDHE** (Elliptic Curve Diffie–Hellman Ephemeral) lets both sides derive a shared secret over the open wire that an eavesdropper *cannot* compute. "Ephemeral" = a brand-new keypair per session.

## Forward secrecy: why "ephemeral" matters

Because the session key comes from *ephemeral* ECDHE keys that are thrown away after the session, **recording today's encrypted traffic and stealing the server's private key tomorrow won't decrypt it.** The private key authenticates; it doesn't unlock the session. This property is **Perfect Forward Secrecy (PFS)**, and it's mandatory in TLS 1.3.

> 💡 This is also why simply having the server's certificate/private key doesn't let an attacker decrypt past recorded sessions — a common misconception. The private key proves identity; the *ephemeral* exchange creates the secret.

## Mutual TLS (mTLS): both sides present certs

In normal TLS only the *server* proves identity. In **mutual TLS**, the server also demands a **client certificate** and verifies it the same way. This is how:

- Microservices authenticate to *each other* (service mesh).
- VPNs and corporate networks verify devices.
- High-security APIs replace API keys with cryptographic client identity.

mTLS is just the same chain-of-trust machinery applied in both directions — your Lesson 3 knowledge transfers directly.

## Watch a real handshake

```bash
# Full handshake detail: chain, cert, protocol, cipher
openssl s_client -connect example.com:443 -servername example.com

# Look for, near the end:
#   Verify return code: 0 (ok)      ← the chain validated
#   Protocol  : TLSv1.3
#   Cipher    : TLS_AES_256_GCM_SHA384
```

`-servername` sets **SNI** (Server Name Indication) — the hostname the client announces *in the clear* so a server hosting many sites knows which certificate to present. Omit it on a multi-site host and you may get the wrong cert.

## How the whole topic fits together

| You learned… | …and it shows up in the handshake as |
|---|---|
| Asymmetric keys (L1) | Server's signature; ephemeral key exchange |
| X.509 + SAN (L2) | The certificate sent; hostname match |
| Chains & CAs (L3) | Verifying the chain to a trusted root |
| OpenSSL issuance (L4) | The cert/key the server is actually using |
| Revocation/lifecycle (L5) | Dates + OCSP staple checked during verify |

That's PKI: a stack of simple ideas that combine, in milliseconds, into trust.

## Check yourself

1. Why does the server send *both* a certificate **and** a signature — what would be missing if it sent only the certificate?
2. Explain forward secrecy: why can't an attacker who records traffic today and steals the private key next year read that traffic?
3. What is SNI, and what breaks if a client omits it when connecting to a host serving many domains?

## Key takeaways

- TLS uses **asymmetric** crypto to authenticate and agree on a key, then **symmetric** crypto for speed.
- Authentication needs *both* the **certificate** (binds key↔identity, vouched by a CA) and a fresh **signature** (proves possession of the private key).
- **Ephemeral** key exchange (ECDHE) gives **forward secrecy** — stealing the private key later doesn't decrypt past sessions.
- **mTLS** applies the same chain-of-trust in both directions; **SNI** tells a multi-site server which cert to send.
- 🎓 You've now traced trust from a single key pair all the way to a live, encrypted, authenticated connection. Lock it in with the flashcards!
