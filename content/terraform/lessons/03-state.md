# State: Terraform's Most Important Concept

If you learn one thing deeply about Terraform, make it **state**. It's the source of most power *and* most disasters. Understanding it separates people who use Terraform from people who get burned by it.

## Why Terraform needs state

Terraform must answer: "what does my code say should exist, what *actually* exists, and what's the difference?" To do that efficiently, it keeps a **state file** (`terraform.tfstate`) — a JSON record mapping each resource in your code to the **real-world object** it created (IDs, attributes, metadata).

> 🔑 **State is Terraform's memory.** It's the bridge between your HCL (`aws_instance.web`) and the actual cloud resource (`i-0abc123`). Without it, Terraform wouldn't know that the instance in your code *is* that specific running instance — it couldn't update or destroy the right thing.

When you run a command, Terraform builds a three-way comparison:

```
   your CODE (desired)  ───┐
                           ├──►  plan = the diff to reconcile them
   STATE (last known) ─────┤
                           │
   REAL WORLD (actual) ────┘   (refreshed from provider APIs)
```

## Why state is dangerous

- **It can contain secrets.** Resource attributes (DB passwords, private keys) are stored in state **in plaintext**. So state is sensitive data.
- **It's authoritative.** If state says a resource exists but it was deleted by hand, Terraform gets confused. If you lose state, Terraform "forgets" it manages your infra and may try to recreate everything.
- **Concurrent edits corrupt it.** Two people running `apply` at once can clobber the file.

> ⚠️ **Never commit `terraform.tfstate` to Git.** It holds plaintext secrets and is easily corrupted by merges. Add it to `.gitignore`. The very common rookie mistake of committing state has leaked countless credentials.

## Remote state and locking (the real-world setup)

For anything beyond a solo experiment, store state in a **remote backend** — a shared, secure location with locking:

```hcl
terraform {
  backend "s3" {
    bucket         = "acme-tf-state"
    key            = "prod/network.tfstate"
    region         = "us-east-1"
    dynamodb_table = "acme-tf-locks"   # state LOCKING
    encrypt        = true              # encrypt at rest
  }
}
```

Remote backends (S3+DynamoDB, Terraform Cloud, GCS, Azure Blob) give you three essentials:

1. **Shared access** — the whole team reads/writes one canonical state.
2. **Locking** — while one `apply` runs, others are **blocked**, preventing corruption from concurrent runs.
3. **Encryption + versioning** — state is encrypted at rest and you can roll back to a previous version if something goes wrong.

> 🔑 **Remote backend + state locking is non-negotiable for teams.** Local state on someone's laptop is a single point of failure and a collaboration hazard. Set up a locked remote backend on day one.

## Drift: when reality diverges

**Drift** is when the real world no longer matches state — usually because someone changed a resource by hand in the console. Terraform detects drift by refreshing state against the live APIs:

```bash
terraform plan        # refreshes, then shows differences (including drift)
```

The plan will show it intends to *revert* the manual change back to what your code declares.

> 💡 The lesson of drift: **make changes through Terraform, not the console.** If you must hot-fix by hand, import it or update the code afterward — otherwise the next `apply` will undo your fix.

## Surgical state operations (use with care)

Sometimes you manipulate state directly:

```bash
terraform state list                 # what Terraform tracks
terraform state show aws_instance.web
terraform import aws_instance.web i-0abc123   # adopt an existing resource into state
terraform state rm aws_s3_bucket.old          # stop managing (without destroying)
terraform state mv <old> <new>                # rename/move within state
```

- **`import`** brings an already-existing (e.g. ClickOps-created) resource under management.
- **`state rm`** makes Terraform forget a resource *without deleting it* in the cloud.

These are powerful and easy to misuse — back up state first.

## Check yourself

1. What does the state file actually store, and why does Terraform need it?
2. Give two reasons you must never commit `terraform.tfstate` to Git.
3. What is drift, how does Terraform detect it, and what will `apply` do about a manual console change?

## Key takeaways

- **State** maps your code's resources to real-world objects — Terraform's memory and the basis of every plan (code vs. state vs. reality).
- State is **sensitive** (plaintext secrets) and **fragile** — **never commit it to Git**; losing it can make Terraform try to recreate everything.
- Use a **remote backend with locking** (S3+DynamoDB, Terraform Cloud, etc.) for shared access, concurrency safety, encryption, and versioning.
- **Drift** = reality diverging from state (usually ClickOps); make changes *through Terraform*, and use `import`/`state` commands carefully to reconcile.
