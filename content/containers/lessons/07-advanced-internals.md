# Advanced: Internals, the OCI Spec & Stronger Isolation

> **The one-sentence version:** A container is just a Linux process wearing namespaces and cgroups — and once you see it that way, the OCI standards, rootless mode, and sandbox runtimes all click into place.

You already know containers aren't VMs and rely on two kernel features. This lesson opens the hood: the exact kernel primitives, the standards that keep the ecosystem interoperable, and how to make the isolation genuinely strong.

## The kernel primitives, named precisely

A container is a normal process whose view of the system is narrowed by **namespaces** (what it can *see*) and constrained by **cgroups** (what it can *use*).

| Namespace | Isolates |
|---|---|
| **PID** | Process IDs — the container sees its app as PID 1 |
| **mount (mnt)** | Filesystem mounts — its own root and mounts |
| **network (net)** | Interfaces, routes, ports — its own network stack |
| **UTS** | Hostname and domain name |
| **IPC** | Shared memory / semaphores |
| **user** | UID/GID mappings — the key to rootless (below) |
| **cgroup** | The cgroup hierarchy view |

> 🔑 There is no `create_container()` syscall. The runtime calls `clone()`/`unshare()` with namespace flags, sets up cgroups, pivots the root filesystem, applies a seccomp filter, then `exec`s your binary. "Container" is a *convention*, not a kernel object.

## The OCI standards: why any image runs anywhere

The **Open Container Initiative** defines three specs that decouple the tools:

- **image-spec** — the on-disk format of an image (layers + config manifest). It's why an image built by Docker runs under Podman or containerd.
- **runtime-spec** — how to run a "filesystem bundle" + JSON config; **runc** is the reference implementation.
- **distribution-spec** — the registry API for push/pull.

The runtime stack on a typical node: **kubelet/Docker → containerd (CRI) → runc → your process**. containerd manages images and lifecycle; runc does the low-level `clone()` dance.

## Rootless and user namespaces

Running the daemon and containers as root is the classic risk: a container escape lands on the host as **root**. **User namespaces** map a container's UID 0 to an *unprivileged* host UID — so "root in the container" is "nobody on the host."

> ⚠️ "Run as non-root *inside* the container" (a Dockerfile `USER` directive) and "run the whole engine **rootless**" are different layers of defense. Use both: a non-root app process, inside a user-namespaced, rootless engine (Podman is rootless by default; Docker supports rootless mode).

## Tightening the sandbox: seccomp, LSMs, capabilities

The container security lesson introduced dropping capabilities and read-only roots. Going further:

- **seccomp** — a syscall allow/deny filter. The default Docker/Kubernetes profile blocks ~44 dangerous syscalls. A tight, app-specific profile shrinks the attack surface dramatically.
- **LSMs** — **AppArmor** (path-based) or **SELinux** (label-based) mandatory access control confine what files/operations a container can touch even if it's compromised.
- **Capabilities** — Linux splits root into ~40 capabilities. Drop `ALL`, add back only what you need (rarely more than `NET_BIND_SERVICE`).

For genuinely hostile or multi-tenant workloads, namespaces may not be enough isolation. **Sandbox runtimes** add a boundary:

| Runtime | How it isolates |
|---|---|
| **gVisor** (runsc) | A user-space kernel intercepts syscalls — the app never talks to the host kernel directly |
| **Kata Containers** | Each container in a lightweight micro-VM — VM-grade isolation with a container UX |

These trade some performance/compatibility for a much harder escape boundary.

## Advanced builds with BuildKit

Modern `docker build` uses **BuildKit**, which unlocks more than multi-stage:

```dockerfile
# Cache mount: persist the package cache across builds (not in the image)
RUN --mount=type=cache,target=/root/.cache/pip pip install -r requirements.txt

# Secret mount: use a secret during build without baking it into a layer
RUN --mount=type=secret,id=npmrc,target=/root/.npmrc npm ci
```

Cache mounts make dependency installs near-instant on rebuilds; secret mounts solve the "don't bake credentials into layers" problem properly. Pair builds with **distroless** or scratch base images (no shell, no package manager) for the smallest attack surface, and generate an **SBOM** + sign the image (Containers security + the CI/CD provenance lesson).

## Check yourself

1. There's no "container" kernel object — so what actually happens when a runtime starts one?
2. What does a *user namespace* protect against that a non-root `USER` directive alone does not?
3. When would you reach for gVisor or Kata instead of plain runc?
4. What two problems do BuildKit cache mounts and secret mounts each solve?

## Key takeaways

- A container = a process isolated by **namespaces** (PID, mnt, net, UTS, IPC, user, cgroup) and limited by **cgroups** — assembled by the runtime, not a single syscall.
- The **OCI** image/runtime/distribution specs make images portable; the stack is **containerd → runc → process**.
- **Rootless mode + user namespaces** turn "root in container" into "nobody on host" — combine with a non-root app user.
- Harden with **seccomp**, **AppArmor/SELinux**, and **dropped capabilities**; for hostile workloads use sandbox runtimes (**gVisor**, **Kata**).
- **BuildKit** adds cache mounts (fast rebuilds) and secret mounts (no baked-in secrets); finish with **distroless** images, an **SBOM**, and signing.
