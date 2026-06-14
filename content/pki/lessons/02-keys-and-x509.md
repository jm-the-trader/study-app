# Keys, Certificates & the X.509 Standard

In the last lesson we said a **certificate** binds a public key to an identity. Now let's open one up and see what's actually inside — and learn the file formats you'll wrestle with in practice.

## What a certificate really is

A certificate is just a **structured document that has been digitally signed by a CA**. Strip away the jargon and it says:

> "I, the issuer, certify that this **public key** belongs to this **subject**, and this certificate is valid from this **date** to that **date**. — signed, the CA."

Because the CA *signed* it with the CA's private key, anyone can verify the certificate hasn't been forged or altered using the CA's public key. Tamper with one byte and the signature breaks.

## The X.509 standard

Nearly every certificate you'll meet — for HTTPS, email, code signing — follows **X.509**, an ITU standard. X.509 defines the fields a certificate must contain. The important ones:

| Field | What it holds | Example |
|---|---|---|
| **Version** | X.509 version (almost always v3) | `3` |
| **Serial Number** | Unique ID assigned by the issuer | `0x0a1b2c…` |
| **Subject** | Who the cert is *about* (a Distinguished Name) | `CN=mybank.com` |
| **Issuer** | Which CA signed it (also a DN) | `CN=DigiCert TLS RSA CA` |
| **Validity** | `Not Before` / `Not After` dates | 2026-01-01 → 2027-01-01 |
| **Subject Public Key** | The public key being vouched for | RSA 2048-bit … |
| **Extensions** | Modern add-ons (see below) | SAN, Key Usage … |
| **Signature** | The CA's signature over all of the above | … |

### Distinguished Names (DN)

The **Subject** and **Issuer** are *Distinguished Names* — a set of attributes:

- `CN` Common Name (historically the hostname)
- `O` Organization, `OU` Organizational Unit
- `L` Locality, `ST` State, `C` Country

You'll see them written compactly: `CN=mybank.com, O=My Bank Inc, C=US`.

### The most important extension: SAN

Here's a gotcha that trips up everyone. The **Common Name (CN)** used to hold the hostname, but **modern clients ignore CN for hostname matching**. They check the **Subject Alternative Name (SAN)** extension instead.

> ⚠️ If your certificate works in `curl` but browsers complain "subject alternative name missing," your cert lacks a SAN. **A cert without a SAN is effectively broken for HTTPS.** Always put your hostnames in the SAN.

A SAN can list multiple names, which is how one cert can cover several hostnames:

```
X509v3 Subject Alternative Name:
    DNS:mybank.com, DNS:www.mybank.com, DNS:api.mybank.com
```

### Other extensions you'll see

- **Key Usage** — what the key may do (e.g. `digitalSignature`, `keyEncipherment`).
- **Extended Key Usage (EKU)** — higher-level purpose (e.g. `serverAuth`, `clientAuth`, `codeSigning`).
- **Basic Constraints** — `CA:TRUE` means "this cert may sign other certs." Crucial in the next lesson.

## Key types: RSA vs. ECDSA

Two families dominate:

- **RSA** — the classic. Secure at 2048 or 3072 bits. Widely compatible, but keys and operations are larger/slower.
- **ECDSA (Elliptic Curve)** — modern. A 256-bit EC key (`P-256`) rivals a 3072-bit RSA key, with smaller, faster keys. Preferred for new deployments.

> 🔑 Rule of thumb: choose **ECDSA P-256** for new services; keep **RSA 2048** when you need maximum legacy compatibility.

## File formats: the part that actually confuses people

The certificate *contents* are standard, but they're stored in different **encodings** and **file conventions**. Knowing these saves hours.

### Encodings

- **PEM** — Base64 text wrapped in `-----BEGIN …-----` / `-----END …-----`. Human-readable-ish, the most common. UTF-8 text file.
- **DER** — the same data in raw binary. Common on Windows/Java.

### Common file extensions

| Extension | Usually contains | Notes |
|---|---|---|
| `.crt`, `.cer`, `.pem` | A certificate (often PEM) | `.cer` is sometimes DER |
| `.key` | A **private** key | Guard this with your life 🔒 |
| `.csr` | Certificate Signing Request | What you send to a CA (next lessons) |
| `.p12`, `.pfx` | Cert **+ private key + chain**, bundled & password-protected | PKCS#12, used for import/export |
| `.p7b` | Certificate chain, no private key | PKCS#7 |

> 💡 **A PEM file can hold more than one block.** A typical TLS deployment uses a "full chain" file: your certificate first, then each intermediate CA, concatenated. Order matters — leaf first, then up the chain.

### Peeking inside files

```bash
# Human-readable dump of a certificate
openssl x509 -in cert.pem -noout -text

# Just the SAN and validity
openssl x509 -in cert.pem -noout -ext subjectAltName -dates

# Convert PEM → DER and back
openssl x509 -in cert.pem -outform der -out cert.der
openssl x509 -inform der -in cert.der -out cert.pem

# What's in a PKCS#12 bundle?
openssl pkcs12 -in bundle.pfx -info -noout
```

You'll run the first command constantly. Bookmark it.

## Check yourself

1. A browser shows "certificate name mismatch" even though the CN is correct. What extension should you check first?
2. You're handed a `.pfx` file. What three things might it contain, and which one must you protect?
3. Why can a single certificate legitimately serve `mybank.com`, `www.mybank.com`, and `api.mybank.com`?

## Key takeaways

- A certificate = a signed X.509 document binding a **public key** to a **subject identity** with a **validity window**.
- Modern clients match hostnames against the **SAN**, *not* the CN — always populate the SAN.
- Learn the file landscape: **PEM vs DER** encodings; `.key` is secret; `.pfx`/`.p12` bundles cert + key + chain.
- `openssl x509 -in cert.pem -noout -text` is your microscope.
