# AppProjects, RBAC, and the Secrets Problem

> **The one-sentence version:** An **AppProject** fences in *what* Applications may deploy (which repos, clusters, namespaces, kinds), Argo **RBAC** controls *who* may do *what* in the UI/API, and because Argo deliberately won't store plaintext secrets, you bolt on a dedicated secrets tool.

## Why it matters

Once more than one team shares an Argo CD instance, "anyone can deploy anything anywhere" is a security incident waiting to happen. Projects and RBAC are the multi-tenancy guardrails, and the secrets question is the one every GitOps adopter must answer before committing real config.

## AppProjects: guardrails for Applications

Every Application belongs to an **AppProject** (the built-in one is `default`, which allows everything — lock it down in production). A project constrains its Applications:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: team-payments
spec:
  sourceRepos:                              # only these Git repos
    - https://github.com/acme/payments-deploy.git
  destinations:                             # only these cluster/namespace targets
    - { server: https://kubernetes.default.svc, namespace: "payments-*" }
  clusterResourceWhitelist:                 # may this project touch cluster-scoped kinds?
    - { group: "", kind: "" }               # (here: none — namespaced resources only)
```

> 🔑 An AppProject answers "**what** is this set of apps *allowed* to do?" — which **repos** they may pull from, which **clusters/namespaces** they may deploy to, and which **resource kinds** they may create. It's a blast-radius limiter: even a malicious or fat-fingered Application in `team-payments` can't deploy to another team's namespace or create a cluster-admin `ClusterRole`.

## RBAC: who may do what

Separately, Argo CD **RBAC** governs *human* (and token) actions in Argo itself — synced to your identity provider via **SSO** (OIDC/SAML). Policies map groups to permissions, usually scoped by project:

```
 p, role:payments-dev, applications, get,  team-payments/*, allow
 p, role:payments-dev, applications, sync, team-payments/*, allow
 g, acme:payments-team, role:payments-dev          # SSO group → role
```

This says the `payments-team` SSO group may *view and sync* applications in the `team-payments` project — but not delete them, not touch other projects, and not change Argo settings.

> 💡 Keep the two axes straight: **AppProject limits what an Application can deploy; RBAC limits what a person can do in Argo.** A developer might have RBAC permission to `sync` an app, while the AppProject still forbids that app from deploying outside its namespaces. You need both — they constrain different actors.

## The secrets problem

Here's the catch GitOps newcomers hit: **your desired state lives in Git, but you must not commit plaintext secrets to Git.** Argo CD intentionally has no built-in secret store. The accepted solutions all keep the *usable* secret out of the repo:

| Approach | How it works |
|---|---|
| **Sealed Secrets** | Commit an *encrypted* `SealedSecret`; an in-cluster controller holds the private key and decrypts it into a real `Secret`. The repo only ever has ciphertext. |
| **External Secrets Operator** | Commit a *reference*; the operator fetches the real value from Vault / AWS Secrets Manager / etc. at runtime. The secret never enters Git. |
| **SOPS (+ KSOPS plugin)** | Encrypt secret files with SOPS (KMS/age keys); Argo decrypts them at render time. |

> ⚠️ Never commit a base64 `Secret` to Git and call it secured — base64 is encoding, not encryption (recall the OpenShift storage lesson). The whole point of these tools is that **what's in Git is encrypted or a reference**, and only the cluster can turn it into a usable secret. Pick one before you onboard anything with credentials.

## Check yourself

1. What four things can an AppProject restrict, and what kind of mistake does that prevent?
2. A developer has RBAC `sync` permission but the deployment still can't reach another team's namespace. Which control stopped it, and is that a bug?
3. Why can't you just commit a normal Kubernetes `Secret` to Git, and name one tool that solves it and how.

## Key takeaways

- **AppProjects** constrain *what* Applications may do — allowed **repos**, **destinations** (clusters/namespaces), and **resource kinds** — limiting blast radius.
- Argo **RBAC** (synced via **SSO**) constrains *who* may do *what* in Argo, usually scoped per project; AppProject and RBAC are **different axes** and you want both.
- Argo stores **no plaintext secrets** — use **Sealed Secrets**, the **External Secrets Operator**, or **SOPS** so Git holds only ciphertext or references.
- **base64 ≠ encryption**: never commit a raw `Secret`; choose a secrets strategy before onboarding anything with credentials.
