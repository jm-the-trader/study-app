# HTTPS and TLS Termination

> **The one-sentence version:** HTTPS is just HTTP carried inside a **TLS** tunnel that gives you encryption, integrity, and proof of the server's identity — and *where* that tunnel ends ("termination") is a design decision you make at every proxy, router, and Route.

## Why it matters

Every external endpoint you'll run is HTTPS. Knowing what the handshake actually establishes — and the difference between terminating TLS at the edge versus passing it through — is what lets you reason about certificates, the OpenShift Route TLS modes from the OpenShift topic, and "why is this connection insecure?" warnings.

## What TLS actually gives you

Three guarantees, often confused:

1. **Encryption** — eavesdroppers on the network see ciphertext, not your data.
2. **Integrity** — tampering in transit is detected.
3. **Authentication** — you're really talking to `example.com`, proven by a **certificate** a trusted **Certificate Authority** signed. (The full trust chain is the **PKI** topic — TLS is PKI in action.)

> 🔑 Encryption without authentication is nearly useless: a perfectly encrypted channel to an *impostor* just means the attacker reads your data privately. The certificate is what ties the encrypted tunnel to a verified identity — that's why a self-signed or expired cert triggers a browser warning even though the bytes are still encrypted.

## The handshake (conceptually)

When a client connects to an HTTPS server (after the TCP handshake from the **Networking** topic):

1. **ClientHello** — the client offers its TLS versions and cipher suites, and includes **SNI** (Server Name Indication): the hostname it wants, *in the clear*.
2. **ServerHello + Certificate** — the server picks the parameters and presents its certificate (proving identity).
3. **Key exchange** — both sides derive a shared symmetric session key (modern TLS uses ephemeral Diffie-Hellman for **forward secrecy** — capturing today's traffic and stealing the key later still won't decrypt it).
4. **Finished** — the rest of the connection (the actual HTTP) is encrypted with the fast symmetric key.

TLS 1.3 streamlines this to roughly **one round trip** (1-RTT), with session resumption making repeat visits faster.

> 💡 **SNI** is the TLS-layer cousin of the HTTP `Host` header: it lets one IP serve certificates for many hostnames, because the server must choose *which* certificate to present before any HTTP is sent. It's how a router or load balancer fronting hundreds of sites knows which cert to use.

## TLS termination: where the tunnel ends

"Terminating TLS" means decrypting the request. The big architectural choice is *where*:

| Pattern | TLS terminates at | Internal hop | Trade-off |
|---|---|---|---|
| **Edge / offload** | The proxy / LB / router | Plaintext | Simplest; app ignores TLS. Internal network must be trusted. |
| **Passthrough** | The **app** itself | Encrypted end-to-end | App owns certs; proxy can't see/route on content. |
| **Re-encrypt** | Proxy, then a **new** TLS hop to the app | Encrypted | External cert at the edge *and* encryption internally. |

These are exactly the **edge / passthrough / reencrypt** modes of an OpenShift **Route**, and the same pattern as an Nginx TLS-terminating reverse proxy. Terminating at the edge is popular because it centralizes certificate management and lets the proxy do L7 work (routing, caching) on plaintext — at the cost of trusting the internal network for the last hop.

## HSTS and mTLS (two you should recognize)

- **HSTS** (`Strict-Transport-Security` response header) tells browsers "only ever reach me over HTTPS," defeating downgrade attacks and accidental `http://` links.
- **mTLS** (mutual TLS) — the *client* also presents a certificate, so both ends authenticate. Common between services in a mesh and for zero-trust internal traffic. (Plain HTTPS authenticates only the server.)

> ⚠️ A "your connection is not private" warning almost always means a **certificate** problem — expired, wrong hostname (cert doesn't match the `Host`/SNI), or signed by a CA the client doesn't trust — *not* an encryption failure. Read the specific error; it names which of the three it is.

## Check yourself

1. TLS gives encryption, integrity, and authentication. Why is the authentication part not optional?
2. What does SNI do, and which HTTP header is it analogous to?
3. Your security team requires traffic to be encrypted all the way to the Pod, but you also want the platform to manage the external certificate. Which termination mode fits?

## Key takeaways

- **HTTPS = HTTP inside a TLS tunnel** providing **encryption, integrity, and authentication**; the certificate (a **PKI** trust chain) ties the encryption to a verified identity.
- The handshake negotiates parameters and derives a shared symmetric key (TLS 1.3 ≈ 1-RTT, with **forward secrecy**); **SNI** is the TLS analog of the `Host` header.
- **TLS termination** location is a design choice — **edge** (at the proxy), **passthrough** (at the app), **reencrypt** (both) — matching the OpenShift Route modes.
- Cert warnings are **identity** problems (expired / wrong name / untrusted CA), not encryption failures; **HSTS** forces HTTPS and **mTLS** authenticates both ends.
