# Registries & Image Distribution

You've built an image locally — now how does it get to CI, to a teammate, to production? Through a **registry**: the distribution hub for container images.

## What a registry is

A **container registry** is a server that stores and serves images, organized as **repositories** of tagged versions. Examples: Docker Hub, GitHub Container Registry (GHCR), GitLab, and cloud registries (Amazon ECR, Google Artifact Registry, Azure ACR). Companies usually run a **private** registry (or Harbor/Quay self-hosted) for internal images.

> 🔑 A registry is to images what a Git remote is to commits: the shared place you **push** to and **pull** from. The local build is your "working copy"; the registry is "origin."

## Image names decoded

A full image reference packs four parts:

```
ghcr.io / acme / payments-api : 1.4.2
└─registry─┘ └org/repo─────┘   └─tag─┘
   host      namespace/name

# or pinned by digest (immutable):
ghcr.io/acme/payments-api@sha256:9f2c...
```

- **Registry host** — omitted defaults to Docker Hub (`docker.io`).
- **Namespace/repository** — org and image name.
- **Tag** — a mutable label (`1.4.2`, `latest`), **or** a `@sha256:` **digest** for an exact, immutable pin.

## Push and pull

```bash
docker login ghcr.io                          # authenticate
docker tag myapp:1.4.2 ghcr.io/acme/myapp:1.4.2   # name it for the registry
docker push ghcr.io/acme/myapp:1.4.2          # upload (only new layers transfer)
docker pull ghcr.io/acme/myapp:1.4.2          # download elsewhere
```

Because layers are content-addressed (Lesson 2), pushes and pulls move **only the layers the registry/host doesn't already have** — sharing a base image makes transfers fast.

## Tagging strategy (this matters in production)

How you tag is an operational decision:

- **Semantic version** (`1.4.2`) — clear, human-meaningful releases.
- **Git SHA** (`sha-a1b2c3d`) — every build traceable to an exact commit; great for CI/CD.
- **`latest`** — convenient locally, **dangerous in prod** (mutable, non-reproducible).
- **Digest pin** (`@sha256:...`) — maximum reproducibility; what GitOps/Kubernetes often deploy.

> ⚠️ **Tags are mutable; someone can re-push `1.4.2` to point at different bytes.** For deployments that must be reproducible and rollback-safe, deploy by **digest**, or treat version tags as immutable by policy (and enable registry immutability/retention rules). A common pattern: tag each build with **both** a SHA *and* a version.

## Multi-architecture images

The same tag can serve different CPU architectures (e.g. `amd64` servers and `arm64` Macs/Graviton). A **manifest list** maps one tag to per-arch images, and the client pulls the right one automatically.

```bash
docker buildx build --platform linux/amd64,linux/arm64 -t ghcr.io/acme/myapp:1.4.2 --push .
```

> 💡 If you build on an Apple Silicon laptop and deploy to amd64 servers, build **multi-arch** (or target the server's arch) — otherwise you'll hit "exec format error" at runtime.

## Supply-chain hygiene

A registry is part of your software supply chain, so:

- **Scan images** for known CVEs (`docker scout`, Trivy, Grype) — ideally in CI, failing the build on critical vulns.
- **Sign images** (Sigstore **cosign**) and verify signatures before deploy, so you only run images you trust.
- **Generate an SBOM** (software bill of materials) to know exactly what's inside.
- **Use trusted base images** and pull from registries you control or trust; mirror/pin third-party images.

## Cleanup and cost

Registries fill up. Set **retention/garbage-collection** policies (e.g. keep the last N tags, expire untagged digests). Old images cost storage and clutter; CI that pushes per-commit images especially needs pruning.

## Check yourself

1. In `ghcr.io/acme/payments-api:1.4.2`, name each of the four parts.
2. Why does pushing your second image to the same registry usually transfer far less than the first?
3. You build on an arm64 laptop and your servers are amd64. What must you do to avoid "exec format error," and what mechanism makes one tag serve both?

## Key takeaways

- A **registry** is the push/pull hub for images (Docker Hub, GHCR, ECR, Harbor…) — like a Git remote for images.
- An image reference = **registry / namespace / repo : tag** (or `@sha256:` **digest**); layer dedup makes transfers efficient.
- **Tags are mutable** — deploy by **digest** (or enforce immutable tags) for reproducibility; tag with both **version and Git SHA**.
- Build **multi-arch** when build and run architectures differ, and practice **supply-chain hygiene**: scan, sign (cosign), SBOM, retention policies.
