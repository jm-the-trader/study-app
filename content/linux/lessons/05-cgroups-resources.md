# Resource Control with cgroups

**Control groups (cgroups)** are the Linux kernel feature that limits and accounts for the resources — CPU, memory, I/O — a group of processes can use. They're the quiet foundation under both systemd resource limits *and* every container you'll ever run.

## The problem cgroups solve

On a shared box, one runaway process can starve everything else: a memory leak triggers the dreaded **OOM killer**, or a busy loop pins every CPU. cgroups let the kernel say *"this group of processes may use at most X memory and Y CPU, together"* — and enforce it.

> 🔑 **cgroups group processes and cap their collective resource use.** systemd already puts every service in its own cgroup (that's how `stop` kills the whole tree). Containers are *also* just processes in cgroups (plus namespaces — see the Containers topic). Same kernel feature, two front-ends.

## cgroup v2: the unified hierarchy

Modern systems use **cgroup v2**, a single unified tree mounted at `/sys/fs/cgroup`. systemd organizes it for you using a clean naming scheme:

- **slices** (`.slice`) — branches that group and apportion resources (e.g. `system.slice`, `user.slice`).
- **scopes** (`.scope`) — externally-started process groups (e.g. a user session).
- **services** — each `.service` gets its own cgroup under `system.slice`.

```bash
systemd-cgls                     # the cgroup tree, as systemd sees it
systemd-cgtop                    # live CPU/mem/IO per cgroup (like top, but grouped)
systemctl status myapp           # shows the unit's cgroup + current usage
```

## Setting limits the systemd way

You rarely poke `/sys/fs/cgroup` by hand. Instead you add **resource directives** to a unit's `[Service]` section (or via `systemctl set-property`):

```ini
[Service]
# Memory
MemoryMax=512M            # hard cap — exceed it and the cgroup gets OOM-killed
MemoryHigh=400M           # soft cap — throttle + reclaim pressure before the hard wall

# CPU
CPUQuota=50%             # at most half of ONE core's time
CPUWeight=100            # relative share under contention (default 100)

# I/O and tasks
IOWeight=100
TasksMax=4096            # cap number of processes/threads (fork-bomb guard)
```

Apply to a running service without editing files:

```bash
sudo systemctl set-property myapp.service MemoryMax=512M CPUQuota=50%
```

> 💡 **`MemoryHigh` vs `MemoryMax`:** `High` is a *soft* limit — the kernel aggressively reclaims and throttles the group as it approaches, giving it a chance to shed memory. `Max` is the *hard* wall — cross it and the OOM killer fires inside the cgroup. Set `High` a bit below `Max` for graceful pressure instead of a sudden kill.

## Why this matters for platforms

This is the exact mechanism behind container resource limits. When you later write in Kubernetes:

```yaml
resources:
  limits:    { memory: "512Mi", cpu: "500m" }
  requests:  { memory: "256Mi", cpu: "250m" }
```

…the container runtime translates `limits` into **cgroup** `MemoryMax` / CPU quota on the host. A pod that exceeds its memory **limit** gets OOM-killed *by the cgroup*, not by magic. Understanding cgroups here demystifies pod evictions and "OOMKilled" statuses later.

## Accounting, not just limiting

cgroups also **measure**. Even without limits, systemd accounts per-service CPU and memory, which is why `systemctl status` can show "Memory: 84.2M" for a unit. Turn on accounting explicitly if needed:

```ini
[Service]
CPUAccounting=yes
MemoryAccounting=yes
```

This per-service measurement is the host-level seed of the metrics you'll collect in the Observability topic.

## Check yourself

1. In one sentence, what do cgroups do, and which two front-ends in this course both rely on them?
2. What's the difference between `MemoryHigh` and `MemoryMax`, and why might you set both?
3. A Kubernetes pod shows `OOMKilled`. In kernel terms, what actually happened?

## Key takeaways

- **cgroups** limit and account for the **collective** CPU/memory/I/O of a group of processes (cgroup **v2** = one unified tree under `/sys/fs/cgroup`).
- systemd exposes them via unit directives: **`MemoryMax`/`MemoryHigh`**, **`CPUQuota`/`CPUWeight`**, `TasksMax` — or `systemctl set-property` live.
- **Container resource limits *are* cgroups** under the hood; "OOMKilled" = the cgroup's hard memory cap was hit.
- cgroups also **measure** usage, which is why per-service memory/CPU shows up in `systemctl status` and feeds later observability.
