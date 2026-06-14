# The Layered Model & Encapsulation

> **The one-sentence version:** Networking is built in **layers**, each solving one problem and trusting the layer below — and a message is wrapped in headers on the way out and unwrapped on the way in (encapsulation). Get this model and everything else has a place to live.

## Why layers?

Getting a cat photo from a server in another country to your phone involves an absurd number of concerns: electrical signals, finding the right machine, not losing data, knowing which *app* the data is for. Trying to solve all of that at once is impossible. So networking splits it into **layers**, each with a single job and a clean interface to its neighbors.

> 🔑 **Each layer does one job and relies on the layer below without caring how it works.** TCP doesn't care if you're on WiFi or fiber; HTTP doesn't care how packets are routed. This separation is why you can swap WiFi for Ethernet and your browser doesn't notice.

## Two models: OSI and TCP/IP

You'll hear two layer models. **OSI** is the 7-layer teaching model; **TCP/IP** is the 4-layer model the internet actually runs on. Learn the mapping:

| TCP/IP (real) | OSI layer(s) | Job | Examples |
|---|---|---|---|
| **Application** | 5–7 | What the data *means* to apps | HTTP, DNS, SSH, TLS |
| **Transport** | 4 | End-to-end delivery between programs | **TCP**, **UDP** |
| **Internet** | 3 | Getting packets across networks | **IP**, ICMP, routing |
| **Link** | 1–2 | One physical hop | Ethernet, WiFi, MAC, ARP |

> 💡 People casually say "layer 3" (IP/routing), "layer 4" (TCP/UDP ports), and "layer 7" (HTTP) — those OSI numbers are industry shorthand (e.g. "layer 7 load balancer" = routes by HTTP, "layer 4 LB" = routes by IP/port). Memorize 3 = IP, 4 = TCP/UDP, 7 = application.

## Encapsulation: wrapping the gift

Data doesn't travel as-is. As it goes *down* the stack on the sender, each layer **wraps it in its own header** (and the link layer adds a trailer). On the receiver it travels *up*, each layer **stripping its header**. The names change as it's wrapped:

```
send (down the stack)                          receive (up the stack)
  HTTP request (data)                             ▲ HTTP request
   └ + TCP header  → "segment"                    │ strip TCP
      └ + IP header  → "packet"                    │ strip IP
         └ + Ethernet header/trailer → "frame"     │ strip Ethernet
            └ bits on the wire ───────────────────►┘ bits in
```

> 🔑 The unit's **name tells you the layer**: **segment** (TCP) / datagram (UDP) → **packet** (IP) → **frame** (Ethernet). Each layer only reads *its own* header and treats everything inside as opaque payload — like nested envelopes, each post office reading only its own label.

## What each layer contributes (the headers)

- **Link (Ethernet/WiFi):** source + destination **MAC** addresses — for one hop on the local network.
- **Internet (IP):** source + destination **IP** addresses — for the journey across networks (next lessons).
- **Transport (TCP/UDP):** source + destination **ports** — so the right *program* gets the data, plus reliability info for TCP.
- **Application:** the actual request/response (HTTP, etc.).

This is why a single web request carries, simultaneously, a MAC (this hop), an IP (the destination host), and a port (the destination program) — three addresses for three different jobs.

## Why this matters for platform engineers

Almost every networking tool and concept maps to a layer:
- A **firewall** rule on "port 443" is layer 4; a WAF inspecting URLs is layer 7.
- `ping` works at layer 3 (ICMP); `curl` at layer 7; a MAC address problem is layer 2.
- When something's broken, **work up the layers**: is the link up? does it have an IP? can it route? is the port open? does the app respond? (You'll use exactly this in the troubleshooting lesson.)

## Check yourself

1. Why split networking into layers instead of solving everything at once?
2. Put these in order from outermost to innermost as a packet leaves your machine: TCP header, application data, Ethernet header, IP header.
3. What do "layer 3", "layer 4", and "layer 7" each refer to, and give a load-balancer example of two of them.

## Key takeaways

- Networking is **layered**: each layer does one job and trusts the one below; the real-world model is **TCP/IP** (Link → Internet → Transport → Application), mapped onto OSI's 7 layers.
- **Encapsulation** wraps data in a header per layer on the way out and unwraps on the way in; the unit name signals the layer (**segment → packet → frame**).
- A request carries three addresses at once: **MAC** (this hop, L2), **IP** (the host, L3), and **port** (the program, L4).
- Troubleshoot by **working up the layers** — the mental model the rest of this topic builds on.
