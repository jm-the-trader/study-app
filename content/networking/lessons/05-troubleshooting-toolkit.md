# The Troubleshooting Toolkit

"The site is down" / "I can't connect." This lesson turns the layered model into a **diagnostic method** and the commands that go with it. The skill isn't memorizing flags — it's knowing *which layer to suspect* and which tool answers that question.

## The method: work up the layers

When connectivity breaks, check from the bottom up — each step assumes the one below works (recall the layers lesson):

```
1. Link/IP    Do I have an IP? Is the interface up?        → ip addr
2. Routing    Can I reach the gateway / route out?         → ip route, ping gateway
3. DNS        Does the name resolve to an IP?              → dig / nslookup
4. Reachability  Can I reach the host at all?              → ping, traceroute
5. Port/Transport  Is the port open / service listening?  → ss, nc, telnet
6. Application  Does the app respond correctly?            → curl -v
```

> 🔑 **Resolve which layer is broken before reaching for fixes.** Most "it's down" reports are one specific layer — name resolution, a closed port, a routing issue, or an app error. Bisecting by layer turns guesswork into a five-minute diagnosis.

## The essential commands

### See your own config (link/IP)
```bash
ip addr            # interfaces + their IP addresses (is eth0 up? do I have an IP?)
ip route           # routing table (is there a default route / gateway?)
```

### Reachability (layer 3)
```bash
ping 1.1.1.1       # can I reach this IP at all? (ICMP round-trip + loss + latency)
ping google.com    # if the IP pings but the name doesn't → it's a DNS problem
traceroute google.com   # the path hop-by-hop; shows WHERE it stops/slows
```
> 💡 `ping` an **IP** vs. a **name** is a fast DNS bisection: if `ping 1.1.1.1` works but `ping google.com` fails, the network is fine and **DNS** is the culprit. `traceroute` (which exploits TTL from the routing lesson) shows the last hop reached — pinpointing where the path breaks. (Some hosts/firewalls block ICMP, so a ping timeout isn't always "down".)

### Name resolution (DNS — full topic next)
```bash
dig google.com           # the modern DNS query tool (answer, TTL, which server)
dig +short google.com    # just the IP(s)
nslookup google.com      # simpler/older alternative
```

### Ports & services (layer 4)
```bash
ss -tlnp                       # what's listening locally? (is my service even up?)
nc -vz host 443                # can I open TCP to host:443? (open/refused/timeout)
curl -v telnet://host:443      # alternative port check
```
> ⚠️ Read the failure mode: **"connection refused"** = reached the host but **nothing is listening** on that port (service down, or bound to loopback only — recall the security lesson). **"timeout"** = packets aren't getting there/back (a **firewall** dropping them, or wrong route). These point at very different fixes.

### The application (layer 7)
```bash
curl -v https://example.com/health     # see the full request/response, headers, status
curl -I https://example.com            # headers only
curl --resolve example.com:443:1.2.3.4 https://example.com   # test a specific server, bypassing DNS
```
`curl -v` is the swiss-army knife: it shows DNS resolution, the TCP connect, the **TLS handshake** (recall PKI — `Verify return code: 0 (ok)`), and the HTTP exchange — often telling you the layer *and* the cause in one command.

### Packet-level (when all else fails)
```bash
sudo tcpdump -i any -n port 443        # watch actual packets to/from port 443
sudo tcpdump -i any -n host 10.0.0.5
```
`tcpdump` (or Wireshark) shows the raw truth — are SYNs being sent? are replies coming back? Use it when higher-level tools disagree with reality.

## Worked examples

**"My app can't reach the database."**
1. `dig db.internal` → resolves? (DNS) 2. `ping <db-ip>` → reachable? (routing) 3. `nc -vz <db-ip> 5432` → refused vs timeout? (port/firewall) 4. `ss -tlnp` *on the DB host* → is Postgres actually listening, and on the right interface (loopback vs 0.0.0.0)? Four commands isolate it.

**"Site loads for me but not for a colleague."** Likely DNS (stale cache / different resolver — `dig` from both) or a CDN/Geo issue, not the server itself.

**"Intermittent timeouts."** `mtr host` (continuous traceroute + loss per hop) reveals a flaky hop; `tcpdump` shows retransmissions.

## A note on names vs. layers

Tie it together: a request can fail at **DNS** (name→IP), **routing** (no path), **transport** (port closed/filtered), **TLS** (bad cert — PKI topic), or the **app** (500). Each has a tool above. Knowing *which* is 90% of fixing it fast.

## Check yourself

1. `ping 1.1.1.1` succeeds but `ping example.com` fails. Which layer is broken and which tool confirms it?
2. What's the difference in meaning between "connection refused" and "connection timed out", and what does each suggest you check?
3. Which single command shows DNS resolution, the TCP connect, the TLS handshake, and the HTTP response together?

## Key takeaways

- Troubleshoot by **working up the layers**: IP → route → DNS → reachability → port → app; identify the broken layer *before* fixing.
- Core tools: **`ip addr`/`ip route`** (config), **`ping`/`traceroute`** (reachability, and a DNS bisection), **`dig`** (names), **`ss`/`nc`** (ports), **`curl -v`** (the app + TLS), **`tcpdump`** (raw packets).
- **"Refused" = nothing listening** (service/bind issue); **"timeout" = packets blocked** (firewall/route) — different root causes.
- `curl -v` and the layer method together resolve most "it's down" reports in minutes.
