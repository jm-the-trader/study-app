# Logs with journald

systemd captures the output of every service into a structured log called the **journal**. `journalctl` is how you read it — and it's far more powerful than tailing text files.

## What the journal is

Anything a service writes to **stdout/stderr** (plus syslog and kernel messages) is captured by **`systemd-journald`** into a single, indexed, binary store. Each entry carries structured **fields** — which unit, which PID, which priority, the timestamp, the boot ID — so you can *query* logs instead of grepping flat files.

> 🔑 **Just write to stdout/stderr.** A service under systemd doesn't need to manage log files, rotation, or syslog — print to standard output and the journal captures it with full metadata. This is the same "log to stdout" contract containers use, which is no coincidence.

## Reading logs

```bash
journalctl -u myapp                 # all logs for one unit
journalctl -u myapp -e              # jump to the end (most recent)
journalctl -u myapp -f              # follow live (like tail -f)
journalctl -u myapp -n 100          # last 100 lines
journalctl -u myapp --since "1 hour ago"
journalctl -u myapp --since today --until "10:30"
```

`-u <unit>` is the one you'll type most. Combine freely with time and count filters.

## Filtering like a database

Because entries are structured, you filter by **field**, not just text:

```bash
journalctl -p err                       # priority err and worse (see scale below)
journalctl -p warning..err              # a priority range
journalctl _PID=1234                    # by PID
journalctl _UID=1000                    # by user
journalctl -k                           # kernel messages only (dmesg-style)
journalctl -u myapp -p err --since today   # combine: errors from one unit today
journalctl -u myapp -o json-pretty      # full structured output (for tooling)
```

**Priority scale** (syslog levels, low number = more severe): `0 emerg, 1 alert, 2 crit, 3 err, 4 warning, 5 notice, 6 info, 7 debug`. `-p warning` means "warning and more severe."

## Logs across reboots

```bash
journalctl --list-boots      # every boot the journal remembers, with an index
journalctl -b                # this boot only
journalctl -b -1             # the PREVIOUS boot ← gold for "it died overnight"
```

Being able to read the *previous* boot's logs is invaluable for diagnosing crashes and unclean shutdowns.

## Persistence (a common gotcha)

By default some distros keep the journal **only in memory** (`/run/log/journal`), so it's **wiped on reboot**. To keep history on disk:

```bash
sudo mkdir -p /var/log/journal
sudo systemctl restart systemd-journald
# or set Storage=persistent in /etc/systemd/journald.conf
```

> ⚠️ If `journalctl -b -1` returns "Specified boot ID … not found," your journal is volatile. Enable **persistent** storage *before* the incident — you can't read logs you didn't keep.

## Disk usage and rotation

The journal self-manages size, but you can inspect and prune it:

```bash
journalctl --disk-usage              # how big is it?
sudo journalctl --vacuum-time=2weeks # delete entries older than 2 weeks
sudo journalctl --vacuum-size=500M   # cap total size
```

Limits also live in `journald.conf` (`SystemMaxUse=`, `MaxRetentionSec=`).

## Relationship to centralized logging

On a single host the journal is enough. At fleet scale you **ship** journal entries to a central store (Loki, Elasticsearch, a SIEM) — but the *source* contract is the same: services log to stdout, the journal structures it, a shipper forwards it. You'll see this again in the Observability topic.

## Check yourself

1. What's the single most-used `journalctl` invocation for inspecting one service, and how do you follow it live?
2. After a reboot, `journalctl -b -1` says the boot isn't found. What's wrong, and what should have been configured beforehand?
3. How do you show only error-level entries for `myapp` since this morning?

## Key takeaways

- The **journal** captures every service's **stdout/stderr** as **structured, queryable** entries — no manual log files needed.
- `journalctl -u <unit>` with `-e/-f/-n/--since` covers daily use; filter by **priority** (`-p`) and **fields** for precision.
- Read across reboots with `-b`, `-b -1`, and `--list-boots` — but only if **persistent storage** is enabled (`/var/log/journal`).
- Manage size with `--disk-usage` and `--vacuum-*`; at scale, ship the journal to a central system.
