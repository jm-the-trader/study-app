# Writing Good Dockerfiles

A **Dockerfile** is the recipe for building an image. Anyone can write one that *works*; this lesson is about writing ones that are **small, fast to build, and safe** — the difference between a 1.2 GB image that rebuilds in 4 minutes and a 90 MB image that rebuilds in 4 seconds.

## The essential instructions

```dockerfile
FROM node:20-slim              # base image to build on
WORKDIR /app                   # set + create the working directory
COPY package*.json ./          # copy files from build context into the image
RUN npm ci --omit=dev          # run a command at BUILD time → new layer
COPY . .
ENV NODE_ENV=production         # environment variable (build + runtime)
EXPOSE 3000                     # documents the port (doesn't publish it)
USER node                       # run as a non-root user
CMD ["node", "server.js"]      # default command at RUN time
```

### RUN vs CMD vs ENTRYPOINT (a common mix-up)

- **`RUN`** executes at **build time**, creating a layer (install packages, compile).
- **`CMD`** is the **default command** when the container starts — easily overridden (`docker run img <other>`).
- **`ENTRYPOINT`** sets the executable that always runs; `CMD` then supplies its default arguments. Use `ENTRYPOINT ["app"]` + `CMD ["--help"]` for a CLI-style image.

> 🔑 **`RUN` = build time. `CMD`/`ENTRYPOINT` = run time.** Confusing them is the classic beginner error ("why does my image build but the container exits immediately?" — usually a missing/incorrect `CMD`).

Prefer the **exec form** (`CMD ["node", "server.js"]`, a JSON array) over the shell form (`CMD node server.js`). The exec form runs your process as **PID 1** directly, so it receives `SIGTERM` for graceful shutdown; the shell form wraps it in `/bin/sh -c`, which often *swallows signals*.

## Technique 1: Order for the cache

From the last lesson: put the least-frequently-changing instructions first. Dependencies before source. This alone makes most rebuilds near-instant.

## Technique 2: Multi-stage builds (the big one)

Your build tools (compilers, dev dependencies, SDKs) are huge and have **no business in the final image**. A **multi-stage build** uses one stage to build and a clean, tiny stage to run — copying only the artifacts across:

```dockerfile
# ---- build stage ----
FROM golang:1.22 AS build
WORKDIR /src
COPY . .
RUN CGO_ENABLED=0 go build -o /app ./cmd/server

# ---- runtime stage ----
FROM gcr.io/distroless/static          # no shell, no package manager — tiny + hardened
COPY --from=build /app /app            # copy ONLY the binary
USER nonroot
ENTRYPOINT ["/app"]
```

> 💡 **Multi-stage builds** routinely cut images from gigabytes to tens of megabytes. The Go toolchain (~1 GB) stays in the build stage; the final image is just your static binary on a minimal base. Smaller images = faster pulls, smaller attack surface, lower cost.

## Technique 3: Choose a small, appropriate base

- `node:20` (Debian, ~1 GB) → `node:20-slim` (~200 MB) → `node:20-alpine` (~150 MB, musl libc — watch for native-module quirks) → **distroless** (just runtime + your app, no shell).
- Smaller base = fewer packages = **fewer CVEs** to patch. Distroless and `-slim` are great defaults; test Alpine for native dependency compatibility.

## Technique 4: Fewer, leaner layers

Each `RUN` is a layer. Chain related commands and clean up **within the same layer** (cleaning in a later layer doesn't shrink the earlier one):

```dockerfile
RUN apt-get update \
 && apt-get install -y --no-install-recommends curl ca-certificates \
 && rm -rf /var/lib/apt/lists/*           # cleanup in the SAME RUN
```

## Technique 5: Don't ship secrets or junk

- Add a **`.dockerignore`** (like `.gitignore`) to keep `node_modules`, `.git`, `.env`, and build artifacts out of the build context — faster builds, no leaked secrets.
- **Never `COPY` secrets** into an image — they persist in a layer forever, even if "deleted" later. Use build secrets (`RUN --mount=type=secret`) or inject at runtime.

## Technique 6: Run as non-root

By default containers run as root, which is risky if the process is compromised. Create and switch to an unprivileged user:

```dockerfile
RUN useradd -r -u 10001 appuser
USER appuser
```

(More on security in the dedicated lesson.)

## A clean reference Dockerfile

```dockerfile
FROM node:20-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
USER node
EXPOSE 3000
CMD ["node", "dist/server.js"]
```

## Check yourself

1. When does `RUN` execute vs. `CMD`, and why prefer the exec (JSON-array) form of `CMD`/`ENTRYPOINT`?
2. How does a multi-stage build shrink your final image, and what stays behind in the build stage?
3. Why doesn't deleting a file in a later `RUN` reduce image size, and what's the fix?

## Key takeaways

- **`RUN` = build time; `CMD`/`ENTRYPOINT` = run time** — use the exec form so your app is PID 1 and receives signals.
- **Order for the cache** (deps before source) and use **multi-stage builds** to keep toolchains out of the final image.
- Pick a **small base** (slim/alpine/distroless), **chain + clean up in one layer**, and add a **`.dockerignore`**.
- **Never bake secrets** into layers; **run as a non-root user**.
