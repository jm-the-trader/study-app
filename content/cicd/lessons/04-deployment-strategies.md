# Continuous Delivery & Deployment Strategies

CI gets you a tested artifact; **CD gets it safely into production**. This lesson covers promoting through environments, the deployment strategies that minimize risk, rollback, and GitOps.

## Environments and promotion

A change is usually promoted through a series of **environments**, each more production-like:

```
dev → staging → production
```

The **same artifact** (built once — last lessons) flows through, configured per environment via env vars/secrets (recall the Containers and Kubernetes config lessons). GitHub Actions **Environments** model this: each can require **approvals** and hold its own scoped secrets.

> 🔑 **Promote one immutable artifact through environments; change only the config.** If staging runs image `app:abc123` and it passes, production runs that *exact* image — so you ship what you tested. Rebuilding per environment reintroduces "works in staging" surprises.

## The gate before production

This is the line between Continuous **Delivery** (human approves prod) and **Deployment** (auto). A typical Delivery gate:

```yaml
  deploy-prod:
    needs: deploy-staging
    environment: production        # can require a reviewer's approval
    steps: [ ... ]
```

Approvals, required checks, and **smoke tests** after deploy are how you keep automation fast *and* safe.

## Deployment strategies (minimize blast radius)

How you replace the old version with the new one is a risk decision:

### Rolling update
Replace instances **gradually**, a few at a time, keeping the service available throughout. The Kubernetes default (recall the k8s rollout lesson — new ReplicaSet scales up as old scales down).
- ✅ Simple, no extra infrastructure. ❌ Old and new run simultaneously mid-rollout; rollback is another roll.

### Blue-green
Run **two full environments**: **blue** (current/live) and **green** (new). Deploy to green, test it, then **switch all traffic** at once (e.g. flip the load balancer or DNS — recall DNS/LB topics).
- ✅ Instant cutover **and instant rollback** (switch back to blue); test green before any user hits it. ❌ Needs double the capacity during the switch.

### Canary
Release the new version to a **small % of traffic** first (e.g. 5%), watch metrics/errors (recall Observability — SLOs, error rate), then **gradually ramp** to 100% if healthy, or roll back if not.
- ✅ Limits blast radius to a few users; data-driven rollout. ❌ More complex (traffic splitting + good metrics/automation).

```
rolling:    [old old old] → [old old NEW] → [old NEW NEW] → [NEW NEW NEW]
blue-green: blue(live) + green(new,tested) → switch → green(live), blue standby
canary:     100% old → 95% old / 5% new → watch → 50/50 → 100% new (or roll back)
```

> 💡 **Choosing:** rolling is the sane default (built into k8s). Use **blue-green** when you need instant rollback and can afford double capacity. Use **canary** for high-traffic, high-stakes services where you want to validate against real traffic before full rollout. Feature flags (Git topic) complement all three by decoupling *deploy* from *release*.

## Rollback: assume you'll need it

> ⚠️ **A deploy strategy without a fast rollback is half a plan.** Things will break in prod that passed every test. Make rollback a **first-class, practiced, fast** operation: keep the previous artifact ready (k8s `rollout undo` scales the old ReplicaSet back up — instant), keep blue available, or ramp the canary to 0%. The team should rehearse it, not improvise at 2 a.m.

Pair this with **post-deploy verification** (smoke tests, health checks, watching the golden signals) so you *detect* a bad deploy quickly and trigger rollback — ideally automatically on SLO breach.

## GitOps: Git as the deploy mechanism

A modern CD pattern, especially for Kubernetes: instead of the pipeline *pushing* to the cluster, the **desired state lives in Git**, and an in-cluster controller (**Argo CD** or **Flux**) continuously **reconciles** the cluster to match it.

> 🔑 **GitOps = Git is the single source of truth for what's deployed; a controller pulls and reconciles.** Your CI builds an image and **commits the new image tag to a Git repo**; Argo CD/Flux notices and updates the cluster. Benefits: every change is a reviewed, audited Git commit; rollback is `git revert`; the cluster self-heals to the declared state (the same reconcile principle from the Kubernetes and Terraform topics).

## Check yourself

1. Why promote the same artifact through environments instead of rebuilding for each?
2. Compare rolling, blue-green, and canary deployments — and when you'd pick each.
3. What is GitOps, and how does rollback work in it?

## Key takeaways

- **CD promotes one immutable artifact** through **environments** (dev → staging → prod), changing only config; **Delivery** keeps an approval gate before prod, **Deployment** automates it.
- Deployment strategies trade safety vs. cost: **rolling** (gradual, default), **blue-green** (instant switch + instant rollback, double capacity), **canary** (small % first, metric-driven ramp).
- **Fast, practiced rollback** is essential (keep the previous artifact / blue / canary-to-0), paired with **post-deploy verification** on the golden signals.
- **GitOps** (Argo CD/Flux) makes **Git the source of truth**: CI commits the new version, a controller **reconciles** the cluster, and rollback is `git revert`.
