# Environments & Best Practices

You can write Terraform; this lesson is about running it *safely in a team and in production*. These are the practices that prevent the classic Terraform incidents.

## Managing multiple environments

You need staging, prod, etc. — structurally identical, separately stated (so a staging apply can never touch prod). Two main approaches:

### Separate directories (recommended for most teams)

A folder per environment, each with its **own backend/state**, all calling the same shared modules:

```
environments/
├── staging/   (main.tf + its own backend → staging.tfstate)
└── prod/      (main.tf + its own backend → prod.tfstate)
modules/        (shared)
```

- ✅ Strong **state isolation** (separate state files), per-env backends, explicit and obvious.
- ✅ You can grant different access to prod vs staging.

### Workspaces (use with caution)

`terraform workspace` keeps multiple states for the *same* configuration:

```bash
terraform workspace new staging
terraform workspace select prod
```

> ⚠️ Workspaces are handy for ephemeral/short-lived copies, but they're a **weak boundary** for prod-vs-staging: same code, same backend, easy to forget which workspace you're in and apply to the wrong one. For real environments, **prefer separate directories/state**. Workspaces shine for transient per-feature or per-PR stacks.

## Secrets: keep them out of code and state

- **Never hardcode secrets** in `.tf` or commit `terraform.tfvars` containing them. Inject via environment (`TF_VAR_*`), a secrets manager (Vault, cloud secret stores), or a data source that reads them at apply time.
- Mark secret outputs/variables **`sensitive = true`**.
- Remember (from the state lesson) that **secrets land in state in plaintext** — so encrypt state at rest and lock down who can read the backend. Treat the state bucket like a vault.

## `.gitignore` essentials

```gitignore
.terraform/            # provider cache (large, machine-specific)
*.tfstate              # state — NEVER commit (secrets + corruption risk)
*.tfstate.*
*.tfvars               # if they contain secrets (commit example.tfvars instead)
crash.log
```

**Do** commit: your `.tf` files and **`.terraform.lock.hcl`** (so everyone uses identical provider versions).

## CI/CD: plan on PR, apply on merge

The professional workflow treats infra like app code:

1. Engineer opens a PR with `.tf` changes.
2. CI runs `fmt -check`, `validate`, and **`terraform plan`** — posting the plan as a PR comment.
3. Reviewers **read the plan** (the actual diff to prod) and approve.
4. On merge, CI runs **`apply`** against the saved plan.

> 🔑 **The plan is the review artifact.** Reviewing HCL is good; reviewing the *generated plan* ("3 to add, 1 to destroy") is what actually catches a stray database deletion before it happens. Gate prod applies behind human approval.

Add **policy as code** (OPA/Sentinel, `tflint`, `tfsec`/Checkov) in CI to automatically block insecure or non-compliant changes (public S3 buckets, untagged resources, open security groups).

## GitOps for infrastructure

Tools like **Terraform Cloud/Enterprise**, **Atlantis**, **Spacelift**, or **env0** automate the PR→plan→apply loop with state management, locking, approvals, and audit logs — so Git is the single source of truth and every change is traceable. This mirrors the GitOps pattern you'll see for Kubernetes.

## Operational hygiene

- **Small, frequent applies** beat giant ones — smaller plans are easier to review and safer to roll back conceptually.
- **`prevent_destroy`** on critical resources (prod DBs, state buckets).
- **Tag everything** (owner, environment, cost-center) — enforce via policy.
- **Run `plan` regularly** even without changes to **detect drift** early.
- **Back up state** (versioned backend) and know how to `state` surgery your way out of trouble.
- **Pin versions** — providers, modules, and Terraform itself (`required_version`).

## Check yourself

1. Why are separate directories/state generally safer than workspaces for prod vs. staging?
2. In the CI/CD flow, what is the actual review artifact, and why is it better than reviewing HCL alone?
3. Which files must you never commit, and which one *should* you commit for reproducible provider versions?

## Key takeaways

- Isolate environments with **separate directories + separate state**; treat **workspaces** as a weak boundary best for ephemeral stacks.
- **Keep secrets out of code and Git**; remember they live in **state in plaintext**, so encrypt and lock down the backend.
- **Gitignore** `.terraform/`, `*.tfstate`, and secret `*.tfvars`; **commit** `.terraform.lock.hcl`.
- Run **plan on PR / apply on merge** with the **plan as the review artifact**, add **policy-as-code** checks, and pin all versions.
