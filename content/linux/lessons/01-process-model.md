# The Linux Process Model

> **The one-sentence version:** Everything running on a Linux box is a *process* — a program in execution with an identity, a parent, and a lifecycle — and almost every platform skill (services, containers, debugging) is really about understanding processes.

## What a process is

A **process** is a running instance of a program. The kernel gives each one:

- A **PID** (process ID) — a unique number.
- A **parent** (PPID) — the process that started it. Every process has one, tracing back to **PID 1** (`init`, which today is usually **systemd**).
- Its own **memory space**, open **file descriptors**, a **working directory**, **environment variables**, and a **user/group** it runs as.

> 🔑 The kernel boots exactly one process — **PID 1** — and *every other process descends from it.* This tree is why "who started this?" always has an answer (`ps -ef --forest` shows it).

## How processes are created: fork + exec

Linux creates processes with a two-step dance that surprises newcomers:

1. **`fork()`** — a process clones itself. Now there are two near-identical processes (parent and child).
2. **`exec()`** — the child *replaces its own program image* with a new one (e.g. becomes `nginx`).

So "run a program" = fork a copy of yourself, then have the copy become the new program. Your shell does exactly this for every command you type.

```bash
ps -o pid,ppid,user,comm   # PID, parent PID, user, command
pstree -p                  # the whole tree, with PIDs
```

## Process states (what `ps`/`top` show you)

- **R** — running or runnable (on a CPU or waiting for one).
- **S** — interruptible sleep (waiting for an event, e.g. I/O). Most processes, most of the time.
- **D** — uninterruptible sleep (usually blocked on disk/NFS). Lots of `D` = an I/O problem.
- **Z** — **zombie**: finished, but its parent hasn't read its exit status yet. Harmless individually; piles of them mean a buggy parent. The fix is fixing the parent, not killing the zombie (you can't — it's already dead).
- **T** — stopped (e.g. by `Ctrl-Z` or a `SIGSTOP`).

## Signals: how you talk to a process

A **signal** is an asynchronous message to a process. The ones you'll use constantly:

| Signal | Number | Meaning | Default |
|---|---|---|---|
| `SIGTERM` | 15 | "Please shut down cleanly." | terminate (catchable) |
| `SIGKILL` | 9 | "Die now." | **uncatchable** — kernel kills it |
| `SIGINT` | 2 | What `Ctrl-C` sends. | terminate |
| `SIGHUP` | 1 | Terminal hangup; many daemons treat it as "reload config." | terminate |
| `SIGSTOP`/`SIGCONT` | 19/18 | Pause / resume. | stop / continue |

```bash
kill 1234           # send SIGTERM (the polite default)
kill -9 1234        # SIGKILL — last resort, no cleanup
kill -HUP 1234      # ask many daemons to reload
pkill -f myapp      # by name/command match
```

> ⚠️ **Reach for `SIGTERM` first, `SIGKILL` last.** `SIGTERM` lets a process flush buffers, finish requests, and remove lock files. `SIGKILL` gives it zero chance to clean up — you can corrupt data or leave stale locks. This is *exactly* how graceful shutdown works in containers and systemd, too.

## Exit codes

When a process ends it returns an **exit code**: `0` means success, anything non-zero means failure. The shell exposes the last one as `$?`:

```bash
ls /nope; echo $?    # → 2  (ls failed)
true; echo $?        # → 0
```

Convention worth knowing: `1` general error, `2` misuse, `126` not executable, `127` command not found, `130` killed by `Ctrl-C` (128 + signal 2). Scripts, CI, health checks, and `systemd` all branch on exit codes — they're how programs report success to automation.

## Foreground, background, and daemons

- `cmd &` runs in the **background**; `jobs`, `fg`, `bg` manage them.
- A **daemon** is a long-running background process detached from any terminal (web servers, databases). Historically programs "daemonized" themselves; **today you let systemd manage that for you** — which is the next lesson.

## Check yourself

1. Walk through what your shell does, in terms of `fork`/`exec`, when you run `nginx`.
2. Why should you almost never start with `kill -9`, and what can go wrong if you do?
3. You see hundreds of zombie (`Z`) processes. What's the actual problem, and what fixes it?

## Key takeaways

- A **process** has a PID, a parent (up to **PID 1 / systemd**), its own memory, and a user — forming one big tree.
- New processes are made with **`fork()` then `exec()`**.
- **Signals** control processes; prefer **`SIGTERM`** (graceful) over **`SIGKILL`** (uncatchable, no cleanup).
- **Exit codes** (`0` = success) are how programs report outcomes to shells, CI, and service managers.
