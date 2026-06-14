# Modules: Reuse & Structure

Copy-pasting the same 80 lines of HCL for every environment is how Terraform codebases rot. **Modules** are the answer — they're how you package, reuse, and standardize infrastructure, just like functions in programming.

## What a module is

A **module** is just a directory of `.tf` files. That's it. When you call one module from another, the caller is the **root module** and the callee is a **child module**.

> 🔑 A module is a reusable, parameterized package of resources: **inputs** (variables) go in, resources get created, **outputs** come out — exactly like a function with arguments and return values. You write the pattern once and call it many times with different inputs.

```
modules/
└── vpc/
    ├── main.tf       # the resources
    ├── variables.tf  # the inputs (function parameters)
    └── outputs.tf    # the outputs (return values)
```

## Calling a module

```hcl
module "network" {
  source = "./modules/vpc"     # where the module lives

  cidr_block  = "10.0.0.0/16"  # passing inputs (variables)
  environment = "prod"
  az_count    = 3
}

# Use a module output downstream:
resource "aws_instance" "web" {
  subnet_id = module.network.public_subnet_ids[0]
}
```

You reference a module's outputs as `module.<name>.<output>`. Inputs map to the child's `variable` blocks; outputs come from its `output` blocks.

## Module sources

`source` can point many places:

- **Local path** — `./modules/vpc` (your own modules in the repo).
- **Terraform Registry** — `source = "terraform-aws-modules/vpc/aws"` with a `version` (huge ecosystem of battle-tested community modules).
- **Git** — `git::https://github.com/acme/modules.git//vpc?ref=v1.2.0`.

> ⚠️ **Always pin a `version` (or git `ref`) for remote modules.** An unpinned module can change under you and alter your infrastructure on the next `init`. Pin it, just like you pin image tags and provider versions.

```hcl
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"             # pinned
  # ...
}
```

## Why modules matter

- **DRY** — define "a standard VPC" / "a standard service" once; reuse everywhere.
- **Consistency** — every environment gets the *same* well-reviewed pattern (security, tagging, naming baked in).
- **Abstraction** — callers pass a few inputs instead of understanding 200 lines of networking.
- **Versioning** — publish modules with versions so teams adopt changes deliberately.

## Designing good modules

- **Keep them focused** — a module should do one coherent thing ("a VPC," "an RDS database"), not "everything."
- **Expose sensible inputs with defaults** so the common case is easy and edge cases are possible.
- **Output what callers need** (IDs, ARNs, endpoints) so modules compose.
- **Don't over-abstract early.** A thin wrapper around one resource adds indirection for little gain. Extract a module when you have *real* repetition.
- **Document inputs/outputs** (a README; tools like `terraform-docs` generate it).

> 💡 A common, healthy structure: small **reusable modules** (`modules/`) consumed by thin **root configurations per environment** (`environments/prod`, `environments/staging`) that mostly just pass different inputs to the same modules. Same code, different parameters — the inverse of snowflakes.

## Composition example

```
environments/
├── staging/
│   └── main.tf      # module "vpc" {...cidr=10.1...}, module "app" {...replicas=1...}
└── prod/
    └── main.tf      # module "vpc" {...cidr=10.0...}, module "app" {...replicas=5...}
modules/
├── vpc/
└── app/
```

Staging and prod share the *modules* but differ only in *inputs* (sizes, counts, CIDRs) — guaranteeing they're structurally identical while sized appropriately.

## Check yourself

1. What is a Terraform module, and what's the function analogy (inputs/outputs)?
2. Why must you pin a `version` on a registry/Git module?
3. Describe a folder structure that keeps staging and prod structurally identical but differently sized.

## Key takeaways

- A **module** is a directory of `.tf` packaged like a **function**: variables in (**inputs**), resources created, **outputs** out — reference them as `module.<name>.<output>`.
- Sources can be **local**, the **Terraform Registry**, or **Git** — always **pin a version/ref** for remote modules.
- Modules give you **DRY, consistency, abstraction, and versioning**; keep them **focused** and don't over-abstract.
- A clean pattern: **reusable `modules/`** consumed by thin **per-environment root configs** that differ only in inputs.
