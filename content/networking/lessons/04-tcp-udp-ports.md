# Transport: TCP, UDP & Ports

The Internet layer (last lesson) gets a packet to the right *host*. The **transport layer** gets it to the right *program* on that host, and decides whether delivery is **reliable** (TCP) or **fast and loose** (UDP).

## Ports: addressing the program

A host runs many network programs at once — a web server, SSH, a database. **Ports** (16-bit numbers, 0–65535) identify *which program* a segment is for. The combination that uniquely identifies one end of a connection is the **socket**: `IP:port`.

> 🔑 An IP address gets you to the **host**; the **port** gets you to the **program** on it. A connection is identified by the **4-tuple**: `(source IP, source port, dest IP, dest port)` — which is how a server handles thousands of simultaneous clients on the *same* port 443: each connection's tuple is unique.

### Well-known ports

| Port | Service |
|---|---|
| 22 | SSH |
| 53 | DNS |
| 80 | HTTP |
| 443 | HTTPS |
| 25/587 | SMTP (email) |
| 5432 | PostgreSQL |
| 6379 | Redis |
| 3306 | MySQL |

Ports 0–1023 are "well-known" (privileged — binding them needs root, recall the Linux topic); higher ports are used for ephemeral client sockets and custom services.

## TCP: reliable, ordered, connection-oriented

**TCP (Transmission Control Protocol)** guarantees your data arrives **completely, in order, without duplicates** — or you're told it failed. It achieves this with sequence numbers, acknowledgements, retransmission of lost segments, and flow/congestion control.

### The three-way handshake

Before any data flows, TCP establishes a connection in three steps:

```
client ──  SYN       ──►  server     "let's talk; my sequence # is X"
client ◄── SYN-ACK   ──   server     "ok; ack X, my sequence # is Y"
client ──  ACK       ──►  server     "ack Y; connected"
        ── data flows both ways ──
```

> 🔑 The **SYN → SYN-ACK → ACK** handshake is why TCP connections have setup cost (a round trip before data) — and why you'll see "SYN" in firewall/troubleshooting contexts. (Recall the **TLS** handshake from the PKI topic happens *after* this TCP handshake completes — TLS rides on top of TCP.) Closing uses a similar FIN exchange.

TCP is the right choice when **correctness matters**: web (HTTP/HTTPS), SSH, databases, file transfer. A dropped byte in a web page or DB query is unacceptable, so TCP's overhead is worth it.

## UDP: fast, connectionless, best-effort

**UDP (User Datagram Protocol)** just fires **datagrams** with no handshake, no ordering, no retransmission, no guarantee of arrival. It's tiny and fast.

> 🔑 **TCP = reliability with overhead; UDP = speed without guarantees.** Use UDP when **low latency beats perfect delivery**, or when the application handles reliability itself.

UDP fits: **DNS** queries (one small request/response — recall DNS uses 53/udp), live video/voice (a lost frame is better than a delayed one), gaming, and metrics/telemetry (`statsd`). Notably, **HTTP/3** runs over **QUIC**, which is built on UDP but adds its own reliability + encryption — getting TCP-like guarantees with less latency.

| | TCP | UDP |
|---|---|---|
| Connection | Yes (handshake) | No |
| Reliable / ordered | Yes | No |
| Overhead/latency | Higher | Lower |
| Use for | Web, SSH, DB, files | DNS, voice/video, gaming, metrics |

## Connection state & what you'll see

A TCP connection moves through states (`LISTEN`, `ESTABLISHED`, `TIME_WAIT`, `CLOSE_WAIT`, …). Two you'll meet:
- **LISTEN** — a server waiting for connections on a port.
- **TIME_WAIT** — a recently-closed connection held briefly to catch stray packets (lots of these is usually normal under load).

```bash
ss -tlnp        # TCP (t) listening (l) sockets, numeric (n), with process (p)
ss -tan         # all TCP sockets + their states
```

`ss` (and the older `netstat`) is how you answer "is my service actually listening on that port?" — the first check when "connection refused" appears (troubleshooting lesson).

## Ports, firewalls, and security

Firewalls largely work at this layer: "allow inbound 443, deny everything else." Recall:
- The Nginx topic's `listen 443` and the Linux topic's "ports < 1024 need root."
- The security review's loopback bind = "listen only on `127.0.0.1`, so no one off-host can reach the port."

Understanding ports is what makes firewall rules, security groups, and "why can't I connect?" make sense.

## Check yourself

1. What does a port identify that an IP address does not, and what 4 values uniquely identify a single TCP connection?
2. Walk through the TCP three-way handshake and say why it adds latency before data flows.
3. Give two services that use UDP and explain why "best-effort" is acceptable for them.

## Key takeaways

- **Ports** (with IP, forming a **socket**) direct data to the right **program**; a TCP connection is identified by the **4-tuple** (src IP/port, dst IP/port).
- **TCP** is connection-oriented, **reliable and ordered** (via the **SYN/SYN-ACK/ACK** handshake) — for web, SSH, databases; **TLS rides on top of it**.
- **UDP** is connectionless, **fast but best-effort** — for DNS, voice/video, gaming, metrics (and QUIC/HTTP-3 builds reliability on UDP).
- Use **`ss -tlnp`** to see what's listening — the go-to check for connectivity problems and the basis for firewall reasoning.
