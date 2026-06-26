# Builds: S2I, BuildConfig, and ImageStreams

> **The one-sentence version:** OpenShift can turn a Git repo into a running, versioned container image *inside the cluster* — no Dockerfile, no laptop build, no manual `docker push` — using Source-to-Image, BuildConfigs, and ImageStreams.

This in-cluster build pipeline is one of OpenShift's signature differentiators from vanilla Kubernetes, where building images is entirely your problem.

## Why it matters

On plain Kubernetes the loop is: build an image on your machine or in CI, push it to a registry, then update a manifest. OpenShift can collapse that into "point me at your source." For a platform team, that means giving developers a paved path from `git push` to a Pod without each team reinventing CI.

## Source-to-Image (S2I)

**S2I** builds an app image from two ingredients:

1. Your **source code** (a Git repo or a local directory), and
2. A language-specific **builder image** (e.g. `python`, `nodejs`, `java`) that knows how to build and run that ecosystem.

The builder image ships two scripts S2I invokes:

- **`assemble`** — installs dependencies and builds your app *into* the image.
- **`run`** — the command that starts your app when the container runs.

```bash
# Build straight from a Git repo with the Python builder, deploy, and wire a Service:
oc new-app python:3.12~https://github.com/acme/myapp.git
```

> 🔑 **S2I = builder image + your source → runnable image, automatically.** No Dockerfile to write or maintain, and because everyone uses the same curated, patched builder images, you get consistency and a smaller supply-chain surface. The trade-off is less control than a hand-written `Containerfile` — for bespoke build needs, the Docker/Containerfile strategy below is still there.

## BuildConfig: the recipe

A **BuildConfig** is the object that describes *how* to build. It names a **source** (Git, an inline Dockerfile, or a binary upload), a **strategy**, and an **output** ImageStreamTag.

| Strategy | What it does |
|---|---|
| **Source (S2I)** | Builder image + source → image (no Dockerfile) |
| **Docker** | Build from your own `Dockerfile`/`Containerfile` |
| **Binary** | `oc start-build --from-dir=.` uploads local artifacts to build in-cluster |

```yaml
apiVersion: build.openshift.io/v1
kind: BuildConfig
metadata: { name: myapp }
spec:
  source:
    git: { uri: "https://github.com/acme/myapp.git" }
  strategy:
    sourceStrategy:                       # S2I
      from: { kind: ImageStreamTag, name: "python:3.12" }
  output:
    to: { kind: ImageStreamTag, name: "myapp:latest" }
  triggers:
    - type: ConfigChange
    - type: GitHub                        # webhook → build on push
```

```bash
oc start-build myapp            # kick a build manually
oc logs -f bc/myapp            # follow the build logs
```

## ImageStreams: versioning and triggers

An **ImageStream** is an OpenShift abstraction *over* images in a registry. Instead of Deployments referencing a registry path directly, they reference an **ImageStreamTag** (like `myapp:latest`), and the ImageStream tracks which underlying image (by digest) that tag points to.

Two reasons this is powerful:

- **Stable references.** Your Deployment points at `myapp:latest`; the ImageStream resolves it to an immutable **digest**. You get the indirection of a tag with the safety of a pinned digest.
- **Triggers.** An **image trigger** can automatically roll out a Deployment when a *new* image is pushed to a tag — so "build finishes → new image lands in the ImageStream → Deployment redeploys" happens with no manual step.

> 💡 ImageStreams also let you import and track images from *external* registries, so you can centralize and cache upstream images and get notified of updates — handy for keeping base images patched.

## The internal registry and cluster DNS

OpenShift ships an **internal image registry**. In-cluster, builds and pulls reach it through a **Kubernetes Service DNS name**:

```
image-registry.openshift-image-registry.svc:5000/<project>/<image>:<tag>
```

That hostname is pure cluster DNS — `<service>.<namespace>.svc` resolves to the registry Service's ClusterIP (more on this in the **DNS** topic and the next lesson). Builds push here; Deployments pull from here; nothing leaves the cluster.

## Check yourself

1. What two inputs does S2I combine, and which one provides the `assemble`/`run` scripts?
2. You want a `git push` to automatically produce a new image *and* redeploy. Which two mechanisms make that happen?
3. Why does a Deployment referencing an ImageStreamTag get "a tag's convenience with a digest's safety"?

## Key takeaways

- **S2I** builds an app image from a **builder image + your source** (via `assemble`/`run` scripts) — no Dockerfile required; the **Docker** and **Binary** strategies cover the cases where you need more control.
- A **BuildConfig** is the build recipe (source + strategy + output + triggers); `oc start-build` runs it and `oc logs -f bc/...` follows it.
- **ImageStreams** give stable, digest-backed tag references and can **trigger redeploys** when a new image is pushed.
- The **internal registry** is reached over cluster DNS at `image-registry.openshift-image-registry.svc:5000` — builds and pulls stay inside the cluster.
