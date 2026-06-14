# systemd & Units

systemd is the **init system and service manager** on virtually every modern Linux distro — it's PID 1. Once you understand its core abstraction, the **unit**, managing services becomes declarative and predictable.

## What systemd actually does

When the kernel finishes booting, it starts **PID 1 = systemd**. From there, systemd:

- Starts everything else, in **parallel**, resolving **dependencies** between them.
- Keeps long-running services alive (restarting them on failure).
- Tracks each service's processes in a **cgroup** (so it can reliably stop *all* of them — Lesson 5).
- Captures their logs into the **journal** (Lesson 4).

> 🔑 systemd replaced the old sequential init scripts with a **dependency graph** of declarative units it activates in parallel. You describe *what should be true*; systemd figures out the order.

## Units: the core abstraction

A **unit** is anything systemd manages, described by a small INI-style file. The type is the filename suffix:

| Unit type | Manages | Example |
|---|---|---|
| `.service` | A process/daemon | `nginx.service` |
| `.socket` | A listening socket (for socket activation) | `docker.socket` |
| `.timer` | A scheduled trigger (a modern cron) | `backup.timer` |
| `.target` | A group of units (a "runlevel") | `multi-user.target` |
| `.mount` | A filesystem mount | `data.mount` |
| `.path` | Watches a file/dir for changes | `spool.path` |

You'll write `.service` units most often. (Targets and timers come up later.)

## Where units live (and who wins)

systemd reads units from several directories, in priority order:

- `/usr/lib/systemd/system/` — shipped by packages. **Don't edit these.**
- `/etc/systemd/system/` — **your** units and overrides. Highest priority.
- `/run/systemd/system/` — runtime/transient.

To tweak a packaged unit without editing it, use a **drop-in**: `systemctl edit nginx.service` creates `/etc/systemd/system/nginx.service.d/override.conf` with just your changes layered on top. This survives package upgrades.

## Anatomy of a service unit

```ini
# /etc/systemd/system/myapp.service
[Unit]
Description=My platform app
After=network-online.target        # start after networking is up
Wants=network-online.target

[Service]
Type=simple                        # the main process IS the service
ExecStart=/usr/local/bin/myapp --port 8080
ExecReload=/bin/kill -HUP $MAINPID # what `systemctl reload` runs
Restart=on-failure                 # auto-restart if it crashes
RestartSec=5
User=myapp                         # run unprivileged, not root
Environment=LOG_LEVEL=info
EnvironmentFile=-/etc/myapp/env    # '-' = ok if missing
WorkingDirectory=/opt/myapp

[Install]
WantedBy=multi-user.target         # enable = hook into normal boot
```

The three sections:

- **`[Unit]`** — metadata and *ordering/dependencies* (`After`, `Before`, `Wants`, `Requires`).
- **`[Service]`** — *how to run it*: the command, restart policy, user, environment.
- **`[Install]`** — *what enabling it means* (which target pulls it in at boot).

### Two distinctions that trip people up

**`Wants` vs `Requires`:** both pull in a dependency, but `Requires` makes your unit *fail* if the dependency fails, while `Wants` is a soft wish (preferred for resilience). Note that neither, by itself, controls *order* — use `After`/`Before` for that.

**`Type=`** tells systemd when startup is "done":

- `simple` — the process you `ExecStart` *is* the service (most common).
- `forking` — the process forks and the parent exits (classic daemons); needs `PIDFile=`.
- `notify` — the service tells systemd "I'm ready" via `sd_notify` (best for correct ordering).
- `oneshot` — runs to completion once (setup tasks); pair with `RemainAfterExit=yes`.

> 💡 **Restart policy is the superpower.** `Restart=on-failure` turns any plain program into a self-healing daemon — no need to write daemonization logic yourself. This is the same job a container orchestrator does for pods; systemd does it for the host.

## Check yourself

1. Where do you put a custom service unit, and why edit packaged units via `systemctl edit` instead of in place?
2. What's the difference between `Wants=` and `Requires=`, and does either guarantee *start order*?
3. You wrote a unit but the service starts before the database is reachable. Which directives fix the ordering and the dependency?

## Key takeaways

- systemd is **PID 1**: it starts the system as a parallel **dependency graph** of **units**.
- A **`.service`** unit has `[Unit]` (deps/order), `[Service]` (how to run), and `[Install]` (boot hookup).
- Put your units/overrides in **`/etc/systemd/system/`** (or `systemctl edit` drop-ins); never edit packaged units.
- `Restart=on-failure` makes any program a **self-healing** service — the host-level version of what orchestrators do for pods.
