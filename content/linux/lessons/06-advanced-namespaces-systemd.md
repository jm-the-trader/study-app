# Advanced: Namespaces, systemd Sandboxing & Resource Pressure

> **The one-sentence version:** The same kernel features that isolate containers — namespaces, cgroup v2 controllers, and capabilities — are also how you harden and constrain ordinary systemd services on a plain host.

You know the process model, systemd units, systemctl, journald, and cgroup basics. This lesson connects those to the primitives behind containers and the systemd directives that turn a unit into a sandboxed, resource-bounded service.

## Namespaces: the isolation primitive

A **namespace** gives a process its own view of one kind of global resource. The kernel has several (PID, mount, network, UTS, IPC, user, cgroup) — and "a container" is just a process placed in a fresh set of them (see the Containers topic). You can use them directly:

```bash
unshare --pid --fork --mount-proc bash   # new PID namespace: this bash is PID 1
lsns                                       # list namespaces and their processes
nsenter -t <pid> -n ip addr               # run a command in another process's net namespace
```

> 🔑 **User namespaces** are the key to running isolation *without* real root: a process can be UID 0 *inside* the namespace while mapped to an unprivileged UID on the host. This is what makes rootless containers and unprivileged sandboxes possible.

## Capabilities: splitting up root

Root isn't one switch — it's ~40 **capabilities**. A process can hold just the slice it needs:

- `CAP_NET_BIND_SERVICE` — bind ports below 1024 without being root.
- `CAP_SYS_ADMIN` — the "almost root" catch-all (grant reluctantly).

```bash
getcap /usr/bin/ping        # see a binary's file capabilities
setcap cap_net_raw+ep ./mytool
```

systemd can grant/drop them per service with `CapabilityBoundingSet=` and `AmbientCapabilities=`.

## Hardening a service with systemd directives

A modern systemd unit can sandbox a service using the kernel primitives above — often eliminating the need for a container just to get isolation:

```ini
[Service]
ExecStart=/usr/local/bin/myapp
# --- sandboxing ---
ProtectSystem=strict        # mount most of the FS read-only
ProtectHome=true            # hide /home, /root
PrivateTmp=true             # private /tmp (own mount namespace)
NoNewPrivileges=true        # can never gain privileges via setuid
CapabilityBoundingSet=CAP_NET_BIND_SERVICE
SystemCallFilter=@system-service   # seccomp allow-list
# --- resource control (cgroup v2) ---
MemoryMax=512M
CPUQuota=50%
TasksMax=100
```

> 💡 `systemd-analyze security myapp.service` scores a unit's hardening (0 = exposed, 10 = locked down) and tells you which directives to add. It's the fastest way to harden an existing service.

## Socket activation and timers

- **Socket activation** — systemd opens the listening socket and starts the service only on the first connection (and can pass the socket across restarts with zero dropped connections). Defined with a paired `.socket` unit. Saves resources for rarely-used services and enables on-demand start.
- **Timers** (`.timer` units) are systemd's cron replacement: they support calendar *and* monotonic schedules (`OnCalendar=`, `OnUnitActiveSec=`), missed-run catch-up (`Persistent=true`), randomized delays, and — crucially — the job runs as a normal unit, so its output lands in the **journal** and inherits resource limits.

## cgroup v2: pressure, not just limits

Beyond hard caps, cgroup v2 exposes **soft** controls and **pressure**:

- `MemoryHigh=` throttles (reclaims aggressively) before the hard `MemoryMax=` kills — a gentler back-pressure that often avoids the OOM killer.
- **PSI (Pressure Stall Information)** — `/proc/pressure/{cpu,memory,io}` (and per-cgroup `*.pressure`) report the % of time tasks were *stalled* waiting for a resource. PSI is a far better saturation signal than raw utilization for detecting contention (ties to the Observability "saturation" signal).

## When memory runs out: the OOM killer

Under memory exhaustion the kernel's **OOM killer** picks a victim by `oom_score` (roughly, biggest memory user, adjustable via `oom_score_adj`). A container hitting its cgroup `MemoryMax` is OOM-killed *within that cgroup* (this is the Kubernetes `OOMKilled` you see). Protect a critical process with a negative `oom_score_adj`; sacrifice a disposable one with a positive value.

## Limits at the edge: ulimits

Per-process **rlimits** (`ulimit -n` for file descriptors, `-u` for processes) still bite in production — the classic "too many open files" outage. Set them per service with `LimitNOFILE=` in the unit rather than relying on shell defaults.

## Check yourself

1. What is a namespace isolating, and how does a *user* namespace enable rootless isolation?
2. Name three systemd directives that sandbox a service, and the command that scores how hardened a unit is.
3. How does `MemoryHigh=` differ from `MemoryMax=`, and why might PSI tell you about trouble before utilization does?
4. A service intermittently fails with "too many open files." Where do you set the fix so it survives restarts?

## Key takeaways

- **Namespaces** (PID/mount/net/user/…) are the per-resource isolation primitive behind containers; **user namespaces** enable root-less isolation.
- Root is split into ~40 **capabilities** — grant only what's needed (`CAP_NET_BIND_SERVICE`, not full root).
- Harden services with systemd sandboxing (`ProtectSystem`, `PrivateTmp`, `NoNewPrivileges`, `SystemCallFilter`) and bound them with cgroup directives (`MemoryMax`, `CPUQuota`); audit with **`systemd-analyze security`**.
- Use **socket activation** for on-demand start and **timers** as a journal-integrated cron.
- **cgroup v2** adds soft limits (`MemoryHigh`) and **PSI** pressure metrics; understand the **OOM killer** (`oom_score_adj`) and set **ulimits** (`LimitNOFILE`) per unit.
