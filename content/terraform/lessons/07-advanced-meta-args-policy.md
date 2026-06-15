# Advanced: Meta-Arguments, Refactoring & Policy as Code

> **The one-sentence version:** Advanced Terraform is wielding `for_each`, `dynamic`, and `lifecycle` precisely, refactoring state safely with `moved`/`import`, and enforcing standards automatically with tests and policy as code.

You know IaC, HCL basics, state, the workflow, modules, and environments. This lesson is about the controls that keep large configurations correct, refactorable, and governed.

## `count` vs `for_each`

Both create multiple instances, but the difference is operationally huge:

| | `count` | `for_each` |
|---|---|---|
| Indexed by | position (`[0]`, `[1]`) | a **stable key** (map/set) |
| Remove a middle item | **shifts** every later index → mass recreation | only that key is destroyed |
| Use when | identical, order-insensitive copies | a set of named, distinct things |

> ⚠️ The classic footgun: using `count` over a list, then deleting the *second* element. Every resource after it shifts index, so Terraform destroys and recreates them all. **Default to `for_each`** keyed on something stable (a name) for anything you'll add to or remove from.

## `dynamic` blocks

When a resource needs a variable number of nested blocks (e.g. security-group rules), generate them:

```hcl
dynamic "ingress" {
  for_each = var.allowed_ports
  content {
    from_port = ingress.value
    to_port   = ingress.value
    protocol  = "tcp"
  }
}
```

Use sparingly — over-using `dynamic` makes configs hard to read. A few explicit blocks are often clearer than a clever loop.

## The `lifecycle` block

Fine-grained control over how Terraform changes a resource:

- **`create_before_destroy`** — stand up the replacement *before* tearing down the old one (avoid downtime on replacements).
- **`prevent_destroy`** — refuse to destroy a resource (guard a production database).
- **`ignore_changes`** — stop fighting an external system that mutates a field (e.g. an autoscaler changing desired count, a tag added by another tool).
- **`replace_triggered_by`** — force replacement when a referenced resource/attribute changes.

## Refactoring without destroying: `moved` and `import`

Renaming a resource or moving it into a module normally makes Terraform see "delete old, create new" — catastrophic for stateful infra. Modern Terraform refactors *in config*:

- **`moved` block** — declare the old → new address; Terraform updates state on the next apply, no destroy. Replaces fragile `terraform state mv` for repeatable, reviewable moves.
- **`import` block** — bring existing, hand-created infrastructure under management declaratively (and `terraform plan -generate-config-out` can scaffold the HCL). Better than the old imperative `terraform import` because it's in code and code-reviewed.

```hcl
moved { from = aws_instance.web   to = module.web.aws_instance.this }
import { to = aws_s3_bucket.logs  id = "my-existing-logs-bucket" }
```

## State at scale

- **Provider version pinning** — commit the **`.terraform.lock.hcl`** lockfile so every run/CI uses identical provider versions (reproducibility), and set `required_version`/version constraints.
- **State isolation** — separate state per environment (separate backends/keys or workspaces) so a `prod` apply can never touch `dev`. Keep blast radius small; large monolithic state is slow and risky.
- **Surgical operations** stay available (`state rm`, `taint`/`-replace`) but prefer the declarative `moved`/`import`/`lifecycle` equivalents — they're reviewable and repeatable.

## Policy as Code: govern before apply

You don't want code review to be the only thing stopping an open security group or an untagged resource. **Policy as code** evaluates the *plan* automatically and blocks violations:

- **Sentinel** (HashiCorp), **OPA/Conftest** (open, Rego policies), or **Checkov/tfsec** (static analysis) run in CI against the plan JSON.
- Typical rules: "no `0.0.0.0/0` ingress on SSH," "all resources must have a `cost-center` tag," "only approved instance types." A failing policy fails the pipeline (ties to CI/CD's plan-on-PR/apply-on-merge gate).

## Testing modules

- **`terraform test`** (native, `.tftest.hcl`) runs plan/apply assertions against a module in real or mocked providers — keeps modules from regressing.
- **Terratest** (Go) spins up real infrastructure, asserts behavior, and tears it down — heavier, higher fidelity.
- Add **`precondition`/`postcondition`** blocks and **variable `validation`** so a module fails fast with a clear message on bad input.

## Check yourself

1. Why does `for_each` usually beat `count` for a collection you'll modify, and what's the failure mode of `count`?
2. You need to rename a resource and move it into a module without destroying it — what do you use?
3. Name two `lifecycle` arguments and the problem each solves.
4. How does policy as code complement (not replace) human code review in the pipeline?

## Key takeaways

- Prefer **`for_each`** (stable keys) over **`count`** (positional) for anything you add to/remove from; generate repeated nested blocks with **`dynamic`** — sparingly.
- Use **`lifecycle`** (`create_before_destroy`, `prevent_destroy`, `ignore_changes`, `replace_triggered_by`) to control how resources change.
- Refactor safely with **`moved`** blocks and adopt existing infra with **`import`** blocks — declarative, reviewable, no accidental destroy.
- Pin providers with the **lockfile**, **isolate state per environment**, and keep surgical ops as a last resort.
- Enforce standards with **policy as code** (Sentinel/OPA/Checkov) in CI and guard quality with **`terraform test`/Terratest** plus **pre/postconditions** and variable **validation**.
