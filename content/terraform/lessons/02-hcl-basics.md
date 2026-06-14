# HCL: Resources, Variables & Outputs

HCL (HashiCorp Configuration Language) is how you describe infrastructure. It's small — a handful of block types covers almost everything. This lesson is the working vocabulary.

## Resources: the building blocks

A **resource** block declares one piece of infrastructure. Its syntax is `resource "<type>" "<local_name>"`:

```hcl
resource "aws_s3_bucket" "assets" {
  bucket = "acme-static-assets"
}
```

- `aws_s3_bucket` — the **resource type** (defined by the provider).
- `assets` — your **local name** (how you refer to it elsewhere in code; not the real-world name).
- The arguments inside configure it.

You reference a resource's attributes elsewhere as `<type>.<name>.<attribute>`:

```hcl
resource "aws_s3_bucket_policy" "p" {
  bucket = aws_s3_bucket.assets.id     # reference creates a dependency (next lesson)
}
```

> 🔑 **References build the dependency graph.** Because `aws_s3_bucket_policy.p` references `aws_s3_bucket.assets.id`, Terraform knows the bucket must exist *first*. You almost never specify order manually — references imply it.

## Variables: parameterize your config

**Input variables** make configurations reusable across environments:

```hcl
variable "instance_type" {
  type        = string
  default     = "t3.micro"
  description = "EC2 size"
}

variable "environment" {
  type = string
  # no default → must be provided
}

resource "aws_instance" "web" {
  instance_type = var.instance_type
  tags = { Environment = var.environment }
}
```

Set values via a `terraform.tfvars` file, `-var` flags, or `TF_VAR_*` environment variables:

```hcl
# terraform.tfvars
environment   = "prod"
instance_type = "t3.large"
```

## Outputs: expose useful values

**Outputs** surface values after apply — for humans, or to pass between configurations:

```hcl
output "bucket_url" {
  value = aws_s3_bucket.assets.bucket_domain_name
}

output "db_password" {
  value     = aws_db_instance.main.password
  sensitive = true     # hide it from CLI output / logs
}
```

`terraform output` prints them; other tooling can read them as JSON.

## Data sources: read existing things

A **data source** *reads* information about infrastructure Terraform doesn't manage (or that another config created) — read-only lookups:

```hcl
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"]   # Canonical
  filter { name = "name"; values = ["ubuntu/images/*-24.04-amd64-server-*"] }
}

resource "aws_instance" "web" {
  ami = data.aws_ami.ubuntu.id     # use the looked-up AMI
}
```

> 💡 **`resource` = "create/manage this"; `data` = "look this up, don't touch it."** Use data sources to reference shared VPCs, the latest AMI, existing DNS zones, etc., without putting them under your management.

## Locals, expressions, and meta-arguments

```hcl
locals {
  name_prefix = "${var.environment}-acme"     # named expression, computed once
}
```

- **Interpolation:** `"${var.x}-suffix"`; functions like `length()`, `join()`, `lookup()`, `cidrsubnet()`.
- **`count`** — create N copies: `count = 3`, referenced as `aws_instance.web[0]`.
- **`for_each`** — create one per map/set entry (more stable than `count` for changing sets):
  ```hcl
  resource "aws_iam_user" "team" {
    for_each = toset(["ana", "ben", "cleo"])
    name     = each.key
  }
  ```

> ⚠️ Prefer **`for_each`** over `count` when the collection can change. With `count`, removing the *middle* item renumbers the rest, so Terraform thinks later items changed and may destroy/recreate them. `for_each` keys by identity, avoiding that churn.

## File layout

Terraform reads **all `.tf` files in a directory** and merges them — order and filenames don't matter to Terraform, but convention helps humans:

```
main.tf         # resources
variables.tf    # variable declarations
outputs.tf      # outputs
providers.tf    # provider + terraform blocks
terraform.tfvars  # values (often gitignored if it holds secrets)
```

## Check yourself

1. In `resource "aws_s3_bucket" "assets"`, what are `aws_s3_bucket` and `assets`, and which one appears in the real cloud?
2. What's the difference between a `resource` and a `data` source?
3. Why prefer `for_each` over `count` for a set of items that might change?

## Key takeaways

- A **resource** block declares managed infrastructure (`type.localname`); **references** between resources build the dependency graph automatically.
- **Variables** parameterize configs (via tfvars/flags/`TF_VAR_`); **outputs** expose results (`sensitive = true` to hide secrets).
- **Data sources** read existing/unmanaged infrastructure read-only — `resource` creates, `data` looks up.
- Use **`for_each`** (keyed, stable) over **`count`** (indexed, churns on middle changes) for variable collections; Terraform merges all `.tf` files in a directory.
