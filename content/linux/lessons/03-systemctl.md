# Managing Services with systemctl

`systemctl` is your control panel for systemd. A handful of subcommands cover 95% of day-to-day platform work. This lesson makes them muscle memory.

## The everyday verbs

```bash
systemctl status nginx       # is it running? recent logs, PID, memory, cgroup
systemctl start nginx        # start now (this boot only)
systemctl stop nginx         # stop now
systemctl restart nginx      # stop then start
systemctl reload nginx       # re-read config WITHOUT dropping connections (if supported)
systemctl reload-or-restart nginx   # reload if it can, else restart
```

> 🔑 **`reload` ≠ `restart`.** `reload` runs the unit's `ExecReload` (e.g. signal the process to re-read config) with **no downtime**; `restart` kills and re-launches the process, dropping in-flight work. Prefer `reload` for config changes when the service supports it.

## enable vs. start (the #1 confusion)

These are **independent**:

- **`start`** — run it *right now*. Says nothing about boot.
- **`enable`** — make it start *automatically at boot* (creates the symlink from the `[Install]` target). Says nothing about right now.

```bash
systemctl enable nginx        # start at every boot (from now on)
systemctl enable --now nginx  # enable AND start immediately ← what you usually want
systemctl disable nginx       # don't start at boot
systemctl is-enabled nginx    # query
```

> ⚠️ A classic incident: you `start` a service, everything works, the box reboots months later, and the service **doesn't come back** — because you never `enable`d it. Use `enable --now` to do both.

## The step everyone forgets: daemon-reload

systemd caches unit files. **After you create or edit a unit file**, systemd doesn't see the change until you tell it to re-read from disk:

```bash
systemctl daemon-reload      # re-read unit files after editing them
systemctl restart myapp      # then apply
```

(Note: `daemon-reload` reloads *systemd's view of unit files*; `reload myapp` reloads *the service's own config*. Different things.) If `systemctl edit` is how you changed the unit, it runs `daemon-reload` for you.

## Inspecting and troubleshooting

```bash
systemctl status myapp           # health + last log lines (start here)
systemctl cat myapp              # the effective unit file(s), incl. drop-ins
systemctl show myapp             # every resolved property (scriptable)
systemctl list-units --type=service          # what's loaded/active now
systemctl list-units --state=failed          # what's broken ← check this first
systemctl list-unit-files --state=enabled    # what will start at boot
systemctl list-dependencies myapp            # the dependency tree
```

A focused failure-triage flow:

```bash
systemctl --failed                # anything failed?
systemctl status myapp            # why? exit code, signal, recent output
journalctl -u myapp -e            # full logs (next lesson)
```

`status` output is dense but gold — it shows **Active:** state (`active (running)`, `failed`, `inactive`), the **Main PID**, memory/cgroup usage, and the tail of the logs, all in one screen.

## Restarting cleanly vs. forcefully

```bash
systemctl kill myapp                 # send the default signal (SIGTERM) to the unit
systemctl kill -s SIGKILL myapp      # force, if it's wedged
systemctl reset-failed myapp         # clear a 'failed' state after you've fixed it
```

Because systemd tracks every process of a service in its **cgroup**, `systemctl stop` reliably kills the *whole* tree — no orphaned children left behind (a real weakness of old init scripts).

## Targets: switching system states

`.target` units group other units. The common ones replace old "runlevels":

```bash
systemctl get-default                       # usually multi-user.target (or graphical.target)
systemctl isolate multi-user.target         # switch to it now (e.g. drop the GUI)
systemctl set-default multi-user.target     # use it at boot
systemctl reboot | poweroff | suspend       # power control
```

## Check yourself

1. You edit `/etc/systemd/system/myapp.service`. What two commands make the change take effect?
2. A teammate says "I started it, why didn't it survive the reboot?" What did they miss, and what's the one-line fix?
3. Which single command both turns a service on now and ensures it returns after reboot?

## Key takeaways

- Core verbs: **status / start / stop / restart / reload** — and `reload` avoids downtime when supported.
- **`enable` (boot)** and **`start` (now)** are independent; `enable --now` does both.
- **`daemon-reload`** after editing unit files, or systemd won't see your changes.
- Start troubleshooting with `systemctl --failed`, then `status`, then `journalctl -u`; cgroup tracking means `stop` cleans up the whole process tree.
