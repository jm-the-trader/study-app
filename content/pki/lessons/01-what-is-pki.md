# What is PKI?

> **The one-sentence version:** PKI is the system that lets two strangers on the internet trust each other's identity and talk privately — without ever having met or shared a secret in advance.

## The problem PKI solves

Imagine you want to send your bank a secret message. You could lock it in a box, but then how do you get the *key* to the bank without a thief intercepting it on the way? This is the **key distribution problem**, and for most of history it had no good answer: to share a secret, you first needed a secret.

The internet makes this worse. You connect to thousands of servers you've never met. There's no trusted courier. Anyone on the network path — a coffee-shop router, an ISP, a government — can read or tamper with traffic. So we need to solve two things at once:

1. **Confidentiality** — nobody in the middle can read the conversation.
2. **Authenticity** — you're really talking to your bank, not an impostor.

**Public Key Infrastructure (PKI)** is the set of technologies, roles, and policies that solves both — at planetary scale.

## The breakthrough: asymmetric keys

PKI is built on **asymmetric (public-key) cryptography**. Instead of one shared secret key, each party has a *pair* of mathematically linked keys:

- A **public key**, which you hand out freely to anyone.
- A **private key**, which you guard and never share.

The magic property: **what one key locks, only the other can unlock.**

| You want to… | You use… | And… |
|---|---|---|
| Receive a secret | Publish your **public** key | Only your **private** key can decrypt it |
| Prove something is from you | Sign with your **private** key | Anyone can verify with your **public** key |

> 🔑 **Analogy:** Think of the public key as an open padlock you mail to anyone. They snap it shut on a box and ship it back. Only *you* hold the key that opens that padlock. You never had to send the key anywhere — that's how the key-distribution problem dissolves.

This is why it's called *asymmetric*: the two directions use different keys. (Contrast with *symmetric* crypto like AES, where the same key encrypts and decrypts — fast, but it brings back the distribution problem.)

## But wait — how do you trust the public key?

Asymmetric crypto alone has a gap. If an attacker can swap *their* public key for the bank's, you'll happily encrypt your secrets straight to the attacker. This is a **man-in-the-middle (MITM)** attack.

So we need a way to bind *"this public key really belongs to mybank.com"* — and have that binding be checkable by a stranger. That binding is a **certificate**, and the trusted parties who vouch for it are **Certificate Authorities (CAs)**. Together with revocation, storage, and policy, they form the *infrastructure* in PKI.

That's the whole story in miniature:

```
asymmetric keys  →  certificates bind a key to an identity
                 →  CAs vouch for certificates
                 →  everyone agrees to trust a few root CAs
                 =  trust at internet scale (PKI)
```

## The cast of characters

You'll meet each of these in detail later. For now, a map:

- **Subject** — the entity a certificate is *about* (e.g. `mybank.com`).
- **Certificate** — a signed document binding a public key to a subject's identity.
- **Certificate Authority (CA)** — a trusted issuer that signs certificates.
- **Registration Authority (RA)** — verifies who you are before a CA issues to you.
- **Relying party** — anyone who *checks* a certificate (your browser, an API client).
- **Trust store** — the list of root CAs a device has decided to trust out of the box.

## Where you already rely on PKI

- 🔒 The padlock and `https://` in your browser.
- 📦 Software updates that are *signed*, so your OS knows they're genuine.
- ✍️ Digitally signed PDFs and emails (S/MIME).
- 💳 Chip cards, passports, and corporate VPNs.
- 🔐 SSH, code signing, and IoT device identity.

## Check yourself

1. Why doesn't asymmetric cryptography *by itself* stop a man-in-the-middle attack?
2. In the padlock analogy, which key never travels across the network — and why does that matter?
3. What two distinct guarantees does PKI provide, and which character (cert vs. encryption) provides which?

## Key takeaways

- PKI exists to provide **confidentiality** and **authenticity** between parties who never pre-shared a secret.
- It rests on **asymmetric key pairs**: public key shared freely, private key kept secret; what one locks, only the other unlocks.
- Keys alone aren't enough — you need **certificates** to bind a key to an identity and **CAs** to vouch for that binding. That's the next lesson.
