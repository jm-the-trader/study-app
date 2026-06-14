# The Terraform Workflow

Terraform's day-to-day is a tight, predictable loop: **write → init → plan → apply**. Mastering this loop — especially *reading plans* — is what makes you safe and fast.

## The core commands

```bash
terraform init       # download providers + set up the backend (run once / when they change)
terraform plan       # preview what WOULD change (no changes made)
terraform apply      # make reality match your code (asks for confirmation)
terraform destroy    # tear everything down
```

### `init` — get ready

Reads your config, downloads the **provider plugins**, and configures the **backend** (where state lives). Run it in a new project, after adding/changing providers, or after changing the backend. It creates `.terraform/` (cache) and `.terraform.lock.hcl` (provider version lockfile — **commit this** so everyone uses identical provider versions).

### `plan` — look before you leap

`plan` computes the diff between your code, the state, and live reality, then prints exactly what it intends to do. **Reading the plan is the single most important habit in Terraform.**

```
  + create        # a new resource
  ~ update in-place
  - destroy
-/+ replace        # destroy then recreate (⚠️ pay attention!)
```

> ⚠️ **Watch for `-/+` (replace) and `-` (destroy).** A seemingly innocent change (editing an immutable attribute) can force Terraform to **destroy and recreate** a resource — fine for a stateless server, catastrophic for a database. Always read the plan's resource count line: *"Plan: 1 to add, 0 to change, 1 to destroy."* If you didn't expect a destroy, stop.

Save a plan to guarantee apply does *exactly* what you reviewed:

```bash
terraform plan -out=tfplan      # save the exact plan
terraform apply tfplan          # apply precisely that (no re-plan, no surprises)
```

### `apply` — make it real

`apply` shows the plan again and asks you to type `yes`. It then calls provider APIs to create/update/destroy resources and updates state. In CI you use `-auto-approve` (after a reviewed plan).

### `destroy` — clean teardown

Removes everything in the configuration. Invaluable for ephemeral environments (spin up for a test, tear down after) — one of IaC's superpowers over ClickOps.

## The dependency graph

Terraform doesn't apply resources top-to-bottom. It builds a **dependency graph** from your references and:

- Creates independent resources **in parallel** (fast).
- Orders dependent resources correctly (the VPC before the subnet before the instance).
- On destroy, reverses the order.

> 🔑 You declare *relationships* (via references), not *order*. The graph derives execution order automatically. If you ever need an order Terraform can't infer, `depends_on` adds an explicit edge — but reach for it rarely; implicit references are cleaner.

## Validate and format

```bash
terraform fmt        # auto-format to canonical style (run before commit)
terraform validate   # check syntax + internal consistency (no API calls)
```

Both are fast and belong in pre-commit hooks and CI.

## Handling changes safely

- **Want to force a replace** (e.g. rebuild a tainted server)? `terraform apply -replace=aws_instance.web`.
- **Control replacement behavior** with a `lifecycle` block:
  ```hcl
  lifecycle {
    create_before_destroy = true   # build the new one BEFORE destroying old (avoid downtime)
    prevent_destroy       = true   # refuse to destroy this resource (guard rails for prod DBs)
    ignore_changes        = [tags] # don't fight external changes to these attributes
  }
  ```

> 💡 `prevent_destroy = true` on critical resources (production databases, state buckets) is a cheap insurance policy against an accidental `destroy`.

## The loop in practice

```
edit .tf  →  terraform fmt && validate  →  terraform plan  →  READ the plan
          →  terraform apply  →  commit code (+ lockfile)  →  repeat
```

In a team, that plan is reviewed in a **pull request** (next lessons cover CI), so infra changes get the same scrutiny as application code.

## Check yourself

1. What does `terraform init` do, and which file should you commit so everyone uses the same provider versions?
2. In a plan, what does `-/+` mean, and why should it make you stop and look?
3. How does Terraform decide the order to create resources, and when would you use `depends_on`?

## Key takeaways

- The loop is **init → plan → apply** (and `destroy` for teardown); `init` sets up providers/backend and writes the lockfile you should commit.
- **Always read the plan** — especially **`-/+` replace** and **`-` destroy** lines; use `plan -out` + `apply tfplan` to apply exactly what you reviewed.
- Terraform builds a **dependency graph** from references (parallel where possible); you declare relationships, not order (`depends_on` only when needed).
- Guard changes with **`lifecycle`** (`create_before_destroy`, `prevent_destroy`, `ignore_changes`) and keep `fmt`/`validate` in CI.
