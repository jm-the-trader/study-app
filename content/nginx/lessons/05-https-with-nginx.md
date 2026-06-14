# HTTPS with Nginx (where it meets PKI)

This lesson is the bridge between your two topics. Everything you learned in **PKI & Certificates** — keys, certs, chains, the TLS handshake — now becomes a handful of Nginx directives. Nginx is where PKI theory turns into a working padlock. 🔐

> 💡 If the terms *full chain*, *SAN*, *OCSP stapling*, or *TLS handshake* feel fuzzy, the PKI topic covers them. This lesson assumes them and shows the operational side.

## TLS termination, restated

Nginx as a **TLS terminator** means: clients connect to Nginx over HTTPS, Nginx decrypts, and talks to your backend over plain HTTP on a private network. One place owns certificates and ciphers; your apps stay simple.

```
 browser ══HTTPS══► NGINX ──HTTP──► app
          (encrypted)   ▲
                        └ holds the cert + private key, does the handshake
```

## A minimal HTTPS server block

```nginx
server {
    listen 443 ssl;
    http2  on;                       # enable HTTP/2 (its own directive in modern nginx)
    server_name example.com;

    ssl_certificate     /etc/nginx/ssl/fullchain.pem;   # leaf + intermediates (PKI L3!)
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;     # the private key — guard it

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Two directives carry all the PKI weight:

- **`ssl_certificate`** must point to the **full chain** (your leaf cert *then* the intermediates), not just the leaf. This is the same "send the intermediates" rule from PKI Lesson 3 — get it wrong and some clients fail to verify while your browser works fine.
- **`ssl_certificate_key`** is the matching **private key**. Lock it down: `chmod 600`, owned by root, never in version control.

> ⚠️ If `ssl_certificate` and `ssl_certificate_key` don't correspond to the *same* key pair, Nginx fails to start with a key-mismatch error. Verify with the public-hash trick from PKI Lesson 4.

## Redirect HTTP → HTTPS

Always send port-80 visitors to HTTPS:

```nginx
server {
    listen 80;
    server_name example.com www.example.com;
    return 301 https://$host$request_uri;   # permanent redirect, preserve path
}
```

Use `return 301` — it's cheaper and clearer than a rewrite. Don't forget to forward `X-Forwarded-Proto $scheme` (Lesson 4) so the backend knows the original request was HTTPS.

## Modern TLS settings (sane defaults)

```nginx
    ssl_protocols       TLSv1.2 TLSv1.3;        # drop old, broken versions
    ssl_prefer_server_ciphers off;             # let TLS 1.3 negotiate
    ssl_ciphers         HIGH:!aNULL:!MD5;

    # Session resumption — fewer full handshakes, faster repeat visits
    ssl_session_cache   shared:SSL:10m;
    ssl_session_timeout 1d;
    ssl_session_tickets off;

    # OCSP stapling — server fetches revocation proof so visitors don't (PKI L5)
    ssl_stapling on;
    ssl_stapling_verify on;
    ssl_trusted_certificate /etc/nginx/ssl/chain.pem;
```

- **Only TLS 1.2 and 1.3.** Older SSL/TLS versions are insecure; disable them.
- **OCSP stapling** is exactly the PKI Lesson 5 optimization, now a one-liner: Nginx fetches a signed freshness proof and staples it into the handshake, so your visitors never phone the CA.
- Don't agonize over `ssl_ciphers` by hand — generate a config from **Mozilla's SSL Configuration Generator** and pick the "intermediate" profile.

## HSTS: tell browsers to always use HTTPS

```nginx
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```

**HSTS** makes browsers refuse plain HTTP to your domain for the given duration — closing the gap where a first `http://` request could be hijacked before the redirect. Add it only once you're confident HTTPS works everywhere (it's sticky), and use `always` so it's sent even on error responses.

## Automating certificates with Let's Encrypt (ACME)

Recall PKI Lesson 5: renewal must be automated. In practice that means **certbot** (or `acme.sh`):

```bash
sudo certbot --nginx -d example.com -d www.example.com
```

This proves you control the domain, obtains a free cert, **edits your Nginx config** to install it, and sets up a timer to renew at ~⅔ of the 90-day lifetime — unattended. Renewals reload Nginx automatically (the zero-downtime reload from Lesson 1). This single command is how most of the web gets its padlock today.

> 🔑 The big picture: PKI defines *what* a certificate is and *how* trust works; Nginx + ACME is *where you operate it.* `ssl_certificate` (full chain) + `ssl_certificate_key` + auto-renewal = a correct, self-maintaining HTTPS site.

## Quick verification

```bash
sudo nginx -t && sudo nginx -s reload

# Confirm chain, protocol, and a green verify (PKI L6)
openssl s_client -connect example.com:443 -servername example.com </dev/null 2>/dev/null \
  | openssl x509 -noout -dates -ext subjectAltName
```

For a thorough external grade, run the domain through **SSL Labs' server test** — it flags missing intermediates, weak protocols, and stapling problems.

## Check yourself

1. Why must `ssl_certificate` point to the *full chain* rather than just your leaf certificate?
2. What does enabling `ssl_stapling` save your visitors from doing, and which PKI concept is it implementing?
3. What does HSTS protect against that an HTTP→HTTPS redirect alone does not?

## Key takeaways

- Nginx is where PKI becomes operational: **`ssl_certificate` = full chain**, **`ssl_certificate_key` = matching private key** (locked down).
- Redirect HTTP→HTTPS with `return 301`, restrict to **TLS 1.2/1.3**, enable **OCSP stapling** (PKI L5) and **HSTS**.
- **certbot/ACME** obtains, installs, and auto-renews free certs — the practical answer to PKI's "automate renewal" mandate.
- Verify with `openssl s_client` and SSL Labs; a green chain here is the TLS handshake from PKI Lesson 6 working end to end.
