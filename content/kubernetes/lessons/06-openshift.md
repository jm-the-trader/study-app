# OpenShift: What It Adds on Top

**OpenShift** is Red Hat's enterprise Kubernetes distribution. The crucial thing to understand: **OpenShift *is* Kubernetes** — a certified distro — plus an opinionated layer of security, developer tooling, and ops features. Everything you learned transfers; this lesson covers what's *extra* or *different*.

> 🔑 **OpenShift = Kubernetes + batteries + guardrails.** Standard K8s objects (Pods, Deployments, Services, ConfigMaps) all work unchanged. OpenShift adds its own objects and stricter defaults for enterprise use. Learn K8s first; OpenShift is then a set of additions.

## The `oc` CLI and Projects

- **`oc`** is OpenShift's CLI — a superset of `kubectl`. Everything `kubectl` does, `oc` does, plus OpenShift-specific verbs (`oc new-app`, `oc rollout`, `oc adm`). `kubectl` still works against an OpenShift cluster.
- **Projects** are OpenShift's take on **namespaces** — a namespace plus extra metadata and access controls. `oc new-project myapp` ≈ a namespace you own.
- A polished **web console** is built in (developer + admin perspectives), unlike vanilla K8s which ships only an API.

```bash
oc login https://api.cluster:6443     # authenticate
oc new-project demo                   # create a project (namespace)
oc get pods                           # same as kubectl
oc whoami                             # current user
```

## Routes vs. Ingress

OpenShift predates the Ingress API and ships its own **Route** object for exposing HTTP(S) services externally, backed by a built-in **HAProxy router**.

```yaml
apiVersion: route.openshift.io/v1
kind: Route
metadata: { name: web }
spec:
  host: web.apps.cluster.example.com
  to: { kind: Service, name: web }
  tls: { termination: edge }          # edge | passthrough | reencrypt
```

> 💡 Routes came first and are deeply integrated (e.g. easy `edge`/`passthrough`/`reencrypt` TLS, automatic hostnames under the cluster's `apps.` domain). Standard **Ingress objects also work** on OpenShift — it transparently creates Routes for them. For OpenShift-native work, you'll usually see Routes.

## Source-to-Image (S2I) and BuildConfig

A signature OpenShift feature: build container images **inside the cluster, straight from source code** — no Dockerfile required.

- **S2I (Source-to-Image)** takes your source repo + a language **builder image** and produces a runnable app image automatically.
- A **BuildConfig** defines how to build (from Git, Dockerfile, or binary); an **ImageStream** tracks image versions and can **trigger redeploys** when a new image is pushed.

```bash
oc new-app python:3.12~https://github.com/acme/myapp.git   # S2I build from Git
```

> 🔑 With S2I, a developer can go from `git push` to a running pod without writing a Dockerfile or touching a registry by hand — OpenShift builds, stores (ImageStream), and deploys. This integrated build pipeline is a major OpenShift differentiator from vanilla K8s.

## Security: SCCs and "no root by default"

The biggest day-one difference for engineers coming from plain Kubernetes:

> ⚠️ **OpenShift refuses to run containers as root by default.** It assigns each project a **random high UID** and enforces it via **Security Context Constraints (SCCs)** — OpenShift's policy objects controlling what a Pod may do (run as root? use host network? which volumes? which capabilities?). Many public images that assume root or a fixed UID **fail out of the box** with permission errors.

The fix is good practice anyway (recall container security): build images that run as an **arbitrary non-root UID** — don't hardcode `USER 1000`, ensure files are group-writable (`root` group, GID 0), and don't bind privileged ports. SCCs are essentially a stricter, OpenShift-native superset of upstream **Pod Security Standards**.

## DeploymentConfig vs Deployment

OpenShift historically had its own **DeploymentConfig** (with features like deployment triggers and lifecycle hooks). Today **standard Kubernetes `Deployment` is recommended** for new work; you'll still encounter DeploymentConfigs in older projects. Know that both exist and prefer `Deployment`.

## Operators and OperatorHub

OpenShift leans heavily on the **Operator** pattern — controllers that package operational knowledge for an app (install, upgrade, backup) as Kubernetes-native automation. **OperatorHub** (built into the console) makes installing databases, monitoring stacks, etc. a few clicks. (Operators are upstream Kubernetes too, but OpenShift integrates them tightly.)

## What's bundled (so you don't assemble it yourself)

A vanilla cluster is BYO-everything; OpenShift ships an integrated stack: the **HAProxy router**, an internal **image registry**, **monitoring** (Prometheus + Grafana — see the Observability topic), **logging**, CI/CD (**OpenShift Pipelines** = Tekton; **GitOps** = Argo CD), and built-in **RBAC/auth**. That curation-plus-support is what enterprises pay for.

## Check yourself

1. In one sentence, what is the relationship between OpenShift and Kubernetes?
2. A public image runs fine on your kind cluster but crashes with permission errors on OpenShift. What's the likely cause and the fix?
3. What does S2I + BuildConfig let a developer do that plain Kubernetes does not?

## Key takeaways

- **OpenShift is Kubernetes** (a certified distro) plus enterprise additions; all standard K8s objects and `kubectl` still work. `oc` is a `kubectl` superset; **Projects** ≈ namespaces.
- **Routes** (HAProxy router, easy TLS modes) are OpenShift's native external exposure; Ingress also works (it creates Routes).
- **S2I/BuildConfig/ImageStream** build images from source in-cluster — no Dockerfile needed; **Operators/OperatorHub** package app operations.
- **SCCs enforce non-root by default** (random UID) — build images that run as an arbitrary non-root user, which is best practice regardless.
