# Advanced: ACME Automation, Workload Identity & Key Protection

> **The one-sentence version:** At scale, PKI stops being about issuing certs by hand and becomes about *automating* issuance (ACME/cert-manager), giving *machines* cryptographic identities (SPIFFE/mTLS), and *protecting the keys* that anchor all of it (HSMs, short lifetimes).

You know what PKI is, keys/X.509, CAs and chains, OpenSSL issuance, lifecycle/revocation, and the TLS handshake. This lesson is about operating PKI for thousands of certs and services without 3 a.m. expiry pages.

## ACME: issuance as an API

The manual CSR → CA → install dance doesn't scale. **ACME** (the protocol behind Let's Encrypt) automates it:

1. The client proves it controls the domain via a **challenge** — **HTTP-01** (serve a token at `/.well-known/acme-challenge/`) or **DNS-01** (publish a TXT record).
2. The CA validates and issues. The client installs and **auto-renews** well before expiry.

> 💡 **DNS-01 is the one to know for infrastructure**: it works for **wildcard** certs and for hosts not publicly reachable on port 80, because you prove control via DNS rather than a live web server. It needs API access to your DNS provider.

## cert-manager: ACME for Kubernetes

In Kubernetes, **cert-manager** turns certificates into native objects. You define an **Issuer/ClusterIssuer** (an ACME CA, a private CA, or Vault) and request a `Certificate`; cert-manager obtains it, stores it in a Secret, and **renews automatically**. Ingress can request certs by annotation. This is the standard way clusters get TLS without humans touching `openssl`.

## Short-lived certificates

Long-lived certs make revocation the hard problem (CRLs and OCSP both have gaps). The modern answer: **issue certs that live hours, not years**, and just let them expire. If the validity is short enough, you may not need revocation at all — a compromised cert is useless almost immediately. This only works *because* issuance is automated.

## OCSP stapling, must-staple, and CT

Revocation checking has known weaknesses (a client that can't reach the OCSP responder often **soft-fails** and proceeds — see the lifecycle lesson). Two reinforcements:

- **OCSP stapling** — the *server* fetches a signed, time-stamped OCSP response and "staples" it to the handshake, so the client needn't contact the CA (faster + private).
- **OCSP must-staple** — a cert flag that tells clients to **hard-fail** if no staple is present, closing the soft-fail gap.
- **Certificate Transparency (CT)** — CAs log every issued cert to public, append-only logs. You can monitor CT for **mis-issuance** (certs for your domain you didn't request) — a detective control against a compromised or rogue CA.

## Workload identity: SPIFFE / SPIRE and mTLS at scale

In a microservices mesh, every service needs to prove *who it is* to every other — and "share a static API key" doesn't cut it. **SPIFFE** standardizes a workload identity as a **SPIFFE ID** (`spiffe://trust-domain/workload`) carried in a short-lived **SVID** (usually an X.509 cert). **SPIRE** is the runtime that attests workloads and issues/rotates these SVIDs automatically.

> 🔑 This is **mTLS** (mutual TLS from the handshake lesson) operationalized: every service presents a cert proving its identity, both sides verify, and a service mesh (Istio/Linkerd) often automates the certs so app code is unchanged. Identity becomes cryptographic and automatic, not a shared secret.

## Protecting the keys

A private key is the whole ballgame — leak the CA key and the trust is gone. Defenses:

- **HSM (Hardware Security Module)** — a tamper-resistant device that performs signing *without ever exposing the private key*. Root CA keys live in HSMs (often offline).
- **Key ceremonies** — the formal, witnessed, audited process for generating and using a root key. Root CAs are kept **offline**; only intermediates sign day-to-day (so a compromised intermediate can be revoked without re-rooting trust — the chain lesson).
- **Rotation** — rotate intermediates and leaf keys on a schedule; never reuse a key across a revoke/reissue.

## A note on the horizon: post-quantum

Large quantum computers would break RSA/ECDSA. Standardized **post-quantum** algorithms (e.g. ML-KEM/Kyber for key exchange, ML-DSA/Dilithium for signatures) are arriving, and TLS is moving toward **hybrid** key exchange (classical + PQC together) so a future break doesn't retroactively expose today's traffic. You don't need to deploy it yet, but know the term and the "harvest now, decrypt later" risk it addresses.

## Check yourself

1. When and why would you choose the DNS-01 challenge over HTTP-01?
2. How do short-lived certificates change the importance of revocation?
3. What gap does OCSP *must-staple* close that plain OCSP leaves open?
4. What problem do SPIFFE/SPIRE solve for service-to-service auth, and how does it relate to mTLS?

## Key takeaways

- **ACME** automates issuance via HTTP-01/DNS-01 challenges; **DNS-01** enables wildcards and non-public hosts. **cert-manager** brings this to Kubernetes with Issuers + auto-renewing `Certificate` objects.
- Prefer **short-lived certs** (automated renewal) so expiry replaces revocation; reinforce revocation with **OCSP stapling**, **must-staple**, and monitor **CT logs** for mis-issuance.
- **SPIFFE/SPIRE** give workloads cryptographic identities (SVIDs) and automate **mTLS** at mesh scale — identity, not shared secrets.
- Protect keys with **HSMs**, **offline root CAs**, witnessed **key ceremonies**, day-to-day signing by **intermediates**, and regular **rotation**.
- **Post-quantum** + hybrid key exchange is the horizon, addressing "harvest now, decrypt later."
