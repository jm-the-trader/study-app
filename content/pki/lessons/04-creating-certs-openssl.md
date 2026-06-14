# Creating Certificates with OpenSSL

Time to get hands-on. In this lesson you'll generate keys, create a self-signed cert, and then **build your own mini-CA** and use it to issue a properly chained server certificate — exactly the private-PKI pattern from the last lesson.

> 🧪 Everything here is safe to run in a scratch folder. Make one: `mkdir pki-lab && cd pki-lab`. Nothing touches your system trust store unless you explicitly add it.

## The mental model: key → request → certificate

There are three artifacts, always in this order:

1. **Private key** (`.key`) — you generate it; it never leaves your control.
2. **Certificate Signing Request** (`.csr`) — your *public* key plus your desired identity (subject, SAN), bundled and self-signed to prove you hold the private key. This is what you'd send to a CA.
3. **Certificate** (`.crt`) — what the CA hands back: your request, now signed by the CA.

> 🔑 The CA **never sees your private key.** It only signs your CSR. That's the whole point — your secret stays secret.

## Quick win: a self-signed certificate

A self-signed cert is its own issuer (no CA). Great for local dev, useless for public trust (browsers will warn). One command does key + cert:

```bash
openssl req -x509 -newkey ec -pkeyopt ec_paramgen_curve:P-256 \
  -keyout server.key -out server.crt \
  -days 365 -nodes \
  -subj "/CN=localhost" \
  -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"
```

Breaking that down:

- `req -x509` — make a certificate (not just a CSR).
- `-newkey ec -pkeyopt ec_paramgen_curve:P-256` — generate a fresh ECDSA P-256 key.
- `-nodes` — "**no DES**": don't encrypt the private key with a passphrase (fine for a lab; in production you'd protect or HSM it).
- `-subj` — set the subject non-interactively.
- `-addext "subjectAltName=…"` — **the SAN**. Remember Lesson 2: without this, browsers reject it.

Verify your work:

```bash
openssl x509 -in server.crt -noout -text | less
```

That's enough for `https://localhost` in dev. Now let's do it *properly* with a CA.

## Building your own CA

### Step 1 — Create the Root CA

```bash
# Root private key (kept offline in real life)
openssl ecparam -name prime256v1 -genkey -noout -out rootCA.key

# Self-signed root certificate, long-lived
openssl req -x509 -new -key rootCA.key -sha256 -days 3650 \
  -subj "/C=US/O=Acme Internal/CN=Acme Root CA" \
  -out rootCA.crt
```

`rootCA.crt` is your trust anchor. On your own machines you'd add it to the trust store so anything it (eventually) signs is trusted.

### Step 2 — Create the server's key and CSR

```bash
# The server's own private key
openssl ecparam -name prime256v1 -genkey -noout -out server.key

# A CSR describing what we want certified
openssl req -new -key server.key \
  -subj "/C=US/O=Acme Internal/CN=app.acme.internal" \
  -out server.csr
```

### Step 3 — Sign the CSR with the CA

The SAN must end up in the *certificate*, so we pass it at signing time via an extensions file:

```bash
cat > server.ext <<'EOF'
basicConstraints = CA:FALSE
keyUsage = digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth
subjectAltName = DNS:app.acme.internal, DNS:localhost, IP:127.0.0.1
EOF

openssl x509 -req -in server.csr \
  -CA rootCA.crt -CAkey rootCA.key -CAcreateserial \
  -days 365 -sha256 \
  -extfile server.ext \
  -out server.crt
```

You now have `server.crt`, signed by *your* root. 🎉

> 💡 In a real deployment you'd insert an **intermediate** CA between root and server (Lesson 3). The commands are identical — you'd just sign the intermediate with the root (`basicConstraints=CA:TRUE`), then sign the server with the intermediate.

### Step 4 — Verify the chain

```bash
# Does the server cert verify against our CA?
openssl verify -CAfile rootCA.crt server.crt
# → server.crt: OK

# Build the full chain file your server will actually serve
cat server.crt rootCA.crt > fullchain.pem
```

If you had an intermediate, `fullchain.pem` would be `server.crt` + `intermediate.crt` (the root is *not* sent — clients already have it).

## Reading and debugging

```bash
# Confirm the SAN made it into the final cert (the usual culprit)
openssl x509 -in server.crt -noout -ext subjectAltName

# Confirm a key and a cert actually match (compare the public-key hashes)
openssl pkey -in server.key -pubout -outform der | openssl sha256
openssl x509 -in server.crt -pubkey -noout | openssl pkey -pubin -pubout -outform der | openssl sha256
# The two hashes must be identical, or the cert won't work with that key.
```

That last check is gold: the most maddening TLS errors come from serving a certificate with the *wrong* private key.

## Trusting your root locally (optional, for testing)

- **macOS:** `sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain rootCA.crt`
- **Debian/Ubuntu:** copy to `/usr/local/share/ca-certificates/acme-root.crt`, then `sudo update-ca-certificates`.

Now `curl https://app.acme.internal` (with appropriate DNS/hosts) verifies cleanly — you've reproduced public PKI inside your own walls.

> 🛟 **Lost?** Run `openssl x509 -in <file> -noout -text` on any cert to see exactly what it is. When something fails, check, in order: (1) does the SAN match the hostname, (2) do key and cert match, (3) is the full chain present, (4) are the dates valid.

## Check yourself

1. Why does the CA never need (and should never receive) your private key?
2. You signed a cert but the browser still says "name mismatch." Which step did you most likely skip?
3. What's in `fullchain.pem` for a Root → Intermediate → Leaf setup, and why isn't the root included?

## Key takeaways

- The flow is always **key → CSR → certificate**; your private key stays with you.
- A **self-signed** cert is quick for dev; a **CA-signed** cert (even your own CA) gives you real chained trust.
- The **SAN must be set at signing time** via an extensions file — the most common reason a hand-made cert fails.
- Verify relentlessly: `openssl verify`, SAN check, and the key/cert public-hash match.
