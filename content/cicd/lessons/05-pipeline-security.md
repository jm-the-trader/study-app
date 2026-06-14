# Pipeline Security & Best Practices

Your CI/CD pipeline has the keys to the kingdom: it can read your source, holds deploy credentials, and pushes code straight to production. That makes it a **prime target** — a compromised pipeline is a compromised everything. This lesson hardens it and collects the best practices.

## Why the pipeline is high-value

> 🔑 The pipeline is a **trusted, privileged automation** with access to source code, secrets, registries, and production. Attackers increasingly target CI/CD (and the dependencies it pulls) because owning the pipeline means owning the software it ships — the essence of a **supply-chain attack**. Treat pipeline security as production security.

## Secrets management

- **Never hardcode** credentials in workflow files or commit them (recall the security review — secrets in source persist in history). Use the platform's **secrets** store (masked, encrypted).
- **Least privilege** — a deploy token should deploy *one* thing, not be an org-admin key. Scope and rotate credentials.
- **Prefer short-lived credentials over long-lived secrets:** use **OIDC** so the pipeline exchanges a short-lived, workload-identity token with your cloud (AWS/GCP/Azure) at runtime — **no stored cloud keys to leak**.

```yaml
# OIDC example: assume a cloud role with no stored secret
permissions:
  id-token: write          # allow the runner to request an OIDC token
  contents: read
steps:
  - uses: aws-actions/configure-aws-credentials@v4
    with:
      role-to-assume: arn:aws:iam::123456789012:role/deploy
      aws-region: us-east-1
```

> 💡 OIDC is the single biggest CI/CD security upgrade for cloud deploys: it eliminates long-lived `AWS_SECRET_ACCESS_KEY`-style secrets entirely, replacing them with ephemeral tokens tied to *this repo/workflow*.

## Minimize permissions

- **Restrict the workflow token.** Default it to read-only and grant only what's needed:
  ```yaml
  permissions:
    contents: read         # start from least privilege; add specifics per job
  ```
- **Protect production.** Use **environments with required reviewers** so a prod deploy needs human approval, and scope prod secrets to that environment only.
- **Branch protection** (Git topic): require PR review + passing CI before merge to `main`; disallow force-push. The pipeline's integrity depends on `main` being trustworthy.

## Supply-chain hardening

The code your pipeline *runs* and *pulls* is part of your attack surface:

- **Pin third-party Actions/images.** A tag like `actions/foo@v3` is mutable — a hijacked action could exfiltrate secrets. Pin to a **full commit SHA** for sensitive ones (`uses: actions/foo@<sha>`), and only use trusted publishers.
- **Pin and scan dependencies.** Lockfiles + vulnerability scanning in CI (recall `npm audit` / Trivy from the Containers and security work); fail the build on critical CVEs; rebuild to pick up patches.
- **Beware untrusted PRs.** Workflows triggered by forks (`pull_request_target`, especially) can be tricked into leaking secrets — don't expose secrets to untrusted PR code; run untrusted contributions in restricted, secret-less jobs.
- **Sign your artifacts** (cosign — Containers topic) and **generate an SBOM**, so you can prove what you shipped and respond fast to a new CVE.
- **Protect self-hosted runners** — they run arbitrary job code; isolate them, keep them ephemeral, and never let untrusted PRs run on runners with network/secret access.

> ⚠️ Recent real-world incidents (poisoned npm packages, hijacked popular Actions, leaked tokens) almost all exploit the *pipeline's trust*: a malicious dependency or action runs *inside* your trusted CI and steals secrets or injects code. Pinning, least privilege, OIDC, and scanning are the concrete defenses.

## Quality & reliability gates

Security aside, encode your standards as **gates** the pipeline enforces, so quality isn't optional:

- Required: tests pass, coverage threshold, lint clean, no critical vulns, no secrets detected (secret-scanning).
- **Policy as code** (OPA, tfsec/Checkov for Terraform — recall that topic) to block insecure infra changes.
- Make these **required status checks** for merging.

## A best-practices checklist

- [ ] Secrets in the secret store, **never** in source; least-privilege & rotated
- [ ] **OIDC** for cloud auth (no long-lived cloud keys)
- [ ] Workflow `permissions:` default read-only; prod behind **environment approvals**
- [ ] Branch protection: PR review + green CI required, no force-push to `main`
- [ ] **Pin** third-party Actions (SHA) and base images; only trusted sources
- [ ] Dependency + image **scanning** in CI; fail on critical; **SBOM** + artifact **signing**
- [ ] Untrusted-PR / fork workflows can't access secrets; self-hosted runners isolated
- [ ] Build once, promote the same artifact; fast, practiced **rollback**

## Check yourself

1. Why is the CI/CD pipeline an especially high-value target, and what's a "supply-chain attack" in this context?
2. What does OIDC give you over storing a long-lived cloud secret?
3. Why pin third-party Actions to a commit SHA rather than a version tag?

## Key takeaways

- The pipeline is **privileged, trusted automation** with the keys to source, secrets, and prod — secure it like production.
- **Secrets:** store them properly, least-privilege + rotate, and prefer **OIDC** short-lived tokens over stored cloud keys.
- **Minimize permissions** (read-only default token, environment approvals for prod) and rely on **branch protection** for mainline integrity.
- **Harden the supply chain:** pin Actions/images to SHAs, scan & pin dependencies, restrict untrusted-PR access to secrets, sign artifacts + SBOM — and enforce **quality gates** as required checks.
