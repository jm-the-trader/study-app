# What Is a Container?

> **The one-sentence version:** A container is just a normal Linux process (or a few) that the kernel has *isolated* and *limited* so it looks and feels like it has the machine to itself — no separate operating system involved.

## The myth to unlearn

People picture a container as a "tiny lightweight VM." It isn't. There's no guest kernel, no virtual hardware. A container is **processes running directly on the host kernel**, wrapped in kernel features that fence them off from everything else.

> 🔑 **A container = process isolation, not machine virtualization.** It shares the host's kernel; the "boundary" is built from two Linux features you already met in the Linux topic: **namespaces** (what a process can *see*) and **cgroups** (what it can *use*).

## Containers vs. Virtual Machines

| | Virtual Machine | Container |
|---|---|---|
| Isolates via | A hypervisor + virtual hardware | Kernel namespaces + cgroups |
| Runs | A full **guest OS** (its own kernel) | Just **processes** on the host kernel |
| Size | Gigabytes | Megabytes |
| Start time | Seconds–minutes (boot) | Milliseconds (just exec) |
| Isolation strength | Stronger (separate kernel) | Lighter (shared kernel) |

```
   Virtual Machines                 Containers
 ┌──────┐ ┌──────┐              ┌──────┐ ┌──────┐
 │ App  │ │ App  │              │ App  │ │ App  │
 │GuestOS│ │GuestOS│            └──────┘ └──────┘
 ├──────┴─┴──────┤              ├───────────────┤
 │  Hypervisor   │              │ Container eng │
 ├───────────────┤              ├───────────────┤
 │   Host OS     │              │    Host OS     │  ← ONE shared kernel
 └───────────────┘              └───────────────┘
```

VMs trade weight for a harder security boundary; containers trade some isolation for speed and density. They're complementary — you often run containers *inside* VMs.

## The two kernel features that make it work

### Namespaces — control what a process can *see*

A namespace gives a process its own private view of some part of the system. There are several:

- **PID** — the container sees its own process tree; its main process is PID 1, and it can't see host processes.
- **Mount (mnt)** — its own filesystem view (its root `/` is the image, not the host's).
- **Network (net)** — its own network interfaces, IPs, ports, routing.
- **UTS** — its own hostname.
- **IPC** — its own shared-memory/semaphores.
- **User** — map container UIDs to different host UIDs (root inside ≠ root outside).

> 💡 Namespaces are why, *inside* a container, `ps` shows only the container's processes, `/` is the image's filesystem, and `hostname` is the container's — even though it's all just the host kernel underneath.

### cgroups — control what a process can *use*

Exactly as in the Linux topic: cgroups cap and account for the container's CPU, memory, and I/O. Your `--memory` / `--cpus` flags become cgroup limits; exceed memory and the cgroup OOM-kills the container.

> 🔑 **Namespaces = isolation (what you see). cgroups = limits (what you can use).** Put a process in its own set of namespaces, attach a cgroup, give it a packaged filesystem (the image), and you have a container. The "container" isn't one kernel object — it's this *combination*.

## Where the container runtime fits

You don't call these kernel APIs yourself. A **container engine/runtime** does:

- **Docker** / **Podman** — high-level engines (build, run, manage). Podman is daemonless and rootless-friendly.
- **containerd** / **CRI-O** — the runtimes Kubernetes actually drives.
- **runc** — the low-level tool that sets up namespaces/cgroups and execs your process.

They all speak the **OCI (Open Container Initiative)** standard, so an image built by Docker runs under Podman, containerd, or Kubernetes. Standardization is why "build once, run anywhere" holds.

## Why platform engineers care

Containers give you **consistent, portable, dense, fast-starting** units of software: the same artifact runs on your laptop, CI, and prod; you pack many per host; they start in milliseconds. That combination is what makes orchestration (the Kubernetes topic) possible.

## Check yourself

1. Why is "a container is a lightweight VM" wrong? What does a container *not* have that a VM does?
2. Which kernel feature controls what a container can *see*, and which controls what it can *use*?
3. What does the OCI standard buy you across Docker, Podman, and Kubernetes?

## Key takeaways

- A container is **isolated, resource-limited host processes** — *not* a VM; it shares the **host kernel**.
- **Namespaces** isolate a process's view (PID, mount, network, UTS, IPC, user); **cgroups** cap its resource use.
- A **runtime** (docker/podman → containerd/CRI-O → runc) assembles these into a container; the **OCI** standard makes images portable.
- The payoff: **consistent, portable, dense, fast-starting** software units — the foundation for orchestration.
