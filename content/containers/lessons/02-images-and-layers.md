# Images & Layers

A container needs a filesystem to run in — that's the **image**. Understanding how images are built from **layers** explains caching, image size, and why your builds are fast or slow.

## Image vs. container

- An **image** is a read-only template: a packaged filesystem plus metadata (the command to run, environment, exposed ports). It's the *class*.
- A **container** is a running (or stopped) **instance** of an image, with a thin writable layer on top. It's the *object*.

> 🔑 One image → many containers. `docker run nginx` three times gives three containers sharing the same read-only image, each with its own writable scratch layer.

## Layers and the union filesystem

An image is **not** one big blob — it's a stack of **layers**, each a set of filesystem changes. Each instruction in a Dockerfile that modifies the filesystem produces a new layer:

```
┌─────────────────────────────┐  ← container's writable layer (per-container)
├─────────────────────────────┤
│ COPY app/ → /app            │  layer 4
│ RUN npm ci                  │  layer 3
│ COPY package.json           │  layer 2
│ FROM node:20-slim           │  layer 1 (base)
└─────────────────────────────┘
```

A **union/overlay filesystem** stacks these read-only layers and presents them as one unified filesystem. The running container adds a thin **writable layer** on top — changes a process makes go there (copy-on-write) and vanish when the container is removed, unless you used a volume (next lesson).

### Why layers are brilliant

- **Sharing:** layers are content-addressed (hashed). If ten images share the same `node:20-slim` base, that base is stored and pulled **once**. Same for pushes — only new layers transfer.
- **Caching:** rebuilding only re-runs layers that changed (next section).

> 💡 Layers are **immutable and content-addressed** — identical layers are deduplicated across images on disk and over the network. This is why pulling your second Node image is fast: the base layers are already there.

## The build cache — the thing that makes or breaks build speed

When building, Docker reuses a cached layer **if that instruction and all instructions before it are unchanged**. The moment one layer's inputs change, that layer and **every layer after it** are rebuilt.

> ⚠️ **Cache invalidation cascades downward.** Because each layer depends on the ones before, changing an early instruction busts the cache for everything below it. This single rule drives Dockerfile ordering — covered fully next lesson, but the headline:

**Order instructions from least- to most-frequently-changing.** Copy your dependency manifest and install deps *before* copying your source code, so editing source doesn't re-run the slow dependency install:

```dockerfile
# GOOD: deps cached unless package files change
COPY package.json package-lock.json ./
RUN npm ci                # cached across source edits 🎉
COPY . .                  # only this layer rebuilds when code changes
```

```dockerfile
# BAD: any source edit busts the npm install cache
COPY . .
RUN npm ci                # re-runs on every code change 😤
```

## Tags and digests

The same image can be referenced two ways:

- **Tag** — a human label like `myapp:1.4.2` or `nginx:latest`. **Tags are mutable** — `latest` can point to different images over time.
- **Digest** — `myapp@sha256:abc123...`, a content hash that is **immutable**: it always refers to the exact same bytes.

> ⚠️ Never deploy `:latest` to production — it's a moving target that makes builds non-reproducible and rollbacks ambiguous. Pin a real version tag, or a **digest** for full reproducibility.

## Inspecting images

```bash
docker images                    # list local images + sizes
docker history myapp:1.4         # see each layer and its size ← find the bloat
docker inspect myapp:1.4         # full metadata (env, cmd, layers)
docker pull nginx:1.27           # fetch (only missing layers transfer)
```

`docker history` is your tool for "why is this image 1.2 GB?" — it shows which instruction added the weight.

## Check yourself

1. What's the relationship between an image and a container, and what is the container's writable layer for?
2. Why does copying `package.json` and running the install *before* copying source code make rebuilds faster?
3. Why is deploying `:latest` to production a bad idea, and what should you use instead?

## Key takeaways

- An **image** is a read-only template (stack of **layers**); a **container** is a running instance with a thin **writable** layer.
- Layers are **immutable, content-addressed**, and **shared/deduplicated** across images and transfers.
- The **build cache** reuses unchanged layers but **invalidates everything after** the first change — so order instructions least- to most-frequently-changing.
- **Tags are mutable, digests are immutable** — pin versions (or digests) for reproducible deploys; avoid `:latest` in prod.
