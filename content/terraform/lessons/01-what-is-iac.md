# Infrastructure as Code & Terraform

> **The one-sentence version:** Instead of clicking through a cloud console to create servers and networks, you *describe the infrastructure you want in code*, and Terraform makes the real world match — repeatably, reviewably, and reversibly.

## The problem with clicking

Building infrastructure by hand in a web console (or ad-hoc CLI commands) is **ClickOps**, and it doesn't scale:

- **Not reproducible** — can you rebuild staging *exactly*? Recreate prod in another region?
- **No record** — who changed that security group, when, and why? No history, no review.
- **Drift & snowflakes** — environments diverge into hand-tuned "snowflakes" nobody fully understands.
- **No undo** — a misclick can't be reverted like a commit.

**Infrastructure as Code (IaC)** fixes this by treating infrastructure like software: definitions live in version-controlled files, reviewed in pull requests, applied by automation.

> 🔑 **IaC = your infrastructure, expressed in code, in Git.** The benefits are exactly software's benefits: version history, code review, reproducibility, automated deployment, and easy teardown/rebuild.

## Declarative vs. imperative

There are two styles of IaC:

- **Imperative** — you write the *steps* ("create VM, then attach disk, then open port"). Like a shell script.
- **Declarative** — you describe the *desired end state* ("I want a VM with this disk and this port open"), and the tool figures out the steps to get there.

Terraform is **declarative**. You describe *what*, not *how*.

> 🔑 If "declare desired state and let the tool reconcile" sounds familiar, it's the **same principle as Kubernetes** — just applied to cloud infrastructure (VMs, networks, DNS, databases) instead of containers. Declarative + reconciliation is the central idea of modern platform engineering.

## What Terraform is

**Terraform** (by HashiCorp) is the most widely used IaC tool. You write `.tf` files in **HCL** (HashiCorp Configuration Language); Terraform compares them to the real world and makes changes to converge.

It's **provider-based** and therefore **multi-cloud**: a **provider** is a plugin that knows how to talk to one platform's API — AWS, Azure, Google Cloud, Kubernetes, GitHub, Cloudflare, Datadog, and hundreds more. The same Terraform workflow manages all of them.

```
   .tf files (HCL)  ──►  Terraform core  ──►  Provider plugin  ──►  Real API
   "what I want"          (plan/apply)        (AWS/Azure/...)       (creates resources)
```

> 💡 Because it's just provider plugins around a common engine, one tool and one mental model manage your servers, DNS, Kubernetes clusters, SaaS config, and more. Learn the workflow once; apply it everywhere.

## A taste of HCL

```hcl
terraform {
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
  }
}

provider "aws" {
  region = "us-east-1"
}

resource "aws_instance" "web" {
  ami           = "ami-0abcdef1234567890"
  instance_type = "t3.micro"
  tags = { Name = "web-server" }
}
```

Run `terraform apply`, and Terraform creates that EC2 instance. Change `t3.micro` to `t3.small` and apply again — Terraform figures out the minimal change. Run `terraform destroy` and it's all cleanly removed.

## A note on OpenTofu

In 2023 Terraform's license changed, and the community created **OpenTofu** — an open-source fork that's a drop-in replacement (same HCL, same workflow). Everything in this topic applies to both; pick per your licensing needs.

## Where IaC fits in the platform

IaC provisions the *foundation* (clusters, networks, databases, DNS, IAM); tools like Kubernetes then run *workloads* on it; CI/CD applies changes; GitOps keeps it all reconciled from Git. Terraform is usually the layer that stands up the cluster your other topics run on.

## Check yourself

1. List three concrete problems with building infrastructure by clicking in a console that IaC solves.
2. What's the difference between declarative and imperative IaC, and which is Terraform?
3. What is a Terraform **provider**, and why does that design make Terraform multi-cloud?

## Key takeaways

- **IaC** expresses infrastructure as version-controlled code — bringing reproducibility, review, history, and easy teardown to ops.
- Terraform is **declarative** (describe desired state, it reconciles) — the **same principle as Kubernetes**, applied to cloud resources.
- It's **provider-based and multi-cloud**: one workflow (and HCL) manages AWS, Azure, GCP, Kubernetes, SaaS, and more.
- **OpenTofu** is an open-source, drop-in fork; this topic applies to both.
