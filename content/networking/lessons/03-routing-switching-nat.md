# Routing, Switching & NAT

You have addresses (last lesson); now how does a packet actually *travel* from your laptop to a server across the world? Three mechanisms: **switching** (within a network), **routing** (between networks), and **NAT** (bridging private and public).

## Switching: moving frames within a local network

On a single local network (a LAN), devices are connected by a **switch**. Switches operate at **layer 2** and forward **frames** by **MAC address**. A switch learns which MAC lives on which physical port and sends frames only where they need to go.

### ARP: finding the MAC for an IP

But the sender knows the destination *IP*, not its MAC. **ARP (Address Resolution Protocol)** bridges that gap: "Who has `192.168.1.10`? Tell me your MAC." The owner replies, the sender caches it, and now it can build the frame.

> 🔑 On the local network, delivery is by **MAC** (layer 2); **ARP** translates a local **IP → MAC** so the frame can be addressed. This only works *within* one network — for anything beyond it, you need routing.

```bash
arp -a          # see the IP↔MAC cache
ip neigh        # Linux: the neighbor (ARP) table
```

## Routing: moving packets between networks

When the destination is on a **different** network (per the subnet mask check from last lesson), the host sends the packet to its **default gateway** — a **router**. Routers operate at **layer 3**, forwarding **packets** by **IP address**, hop by hop, until the packet reaches the destination network.

> 🔑 **Switches forward by MAC within a network (L2); routers forward by IP between networks (L3).** Your "default gateway" is the router that's your exit to everywhere else. Each router along the path consults its **routing table** to pick the next hop — the packet is relayed gateway-to-gateway across the internet.

### The routing table

Every host and router has a routing table answering "for this destination, where do I send it next?"

```bash
ip route                 # Linux routing table
# default via 192.168.1.1 dev eth0      ← anything unknown → the gateway
# 192.168.1.0/24 dev eth0              ← this network → deliver directly (local)
```

The `default` route (a.k.a. `0.0.0.0/0`) is the catch-all: "if no more specific route matches, send it to the gateway." Most specific (longest-prefix) match wins.

> 💡 At internet scale, routers exchange reachability with **BGP** (Border Gateway Protocol) — the protocol that stitches the world's networks together. You rarely run BGP yourself, but know it's how "the internet knows where your network is."

## The TTL: packets don't loop forever

Each IP packet has a **TTL (Time To Live)** that each router **decrements**; at 0 the packet is dropped (and an ICMP error returned). This prevents misrouted packets from circling forever — and it's exactly what `traceroute` exploits to map the path (troubleshooting lesson).

## NAT: many private hosts, one public IP

Recall private ranges (`10/8`, `192.168/16`) aren't routable on the internet. So how does your laptop on `192.168.1.10` reach a public server? **NAT (Network Address Translation)** — usually on your router — rewrites the **private source IP** to the router's **public IP** on the way out, remembers the mapping, and rewrites replies back on the way in.

```
laptop 192.168.1.10:51000  ──►  router rewrites to  203.0.113.5:51000  ──►  server
                          ◄──  router maps reply back to 192.168.1.10  ◄──
```

> 🔑 **NAT lets many private hosts share one public IP** (the standard form is PAT/"NAT overload", multiplexing by port). It's why your home network's devices all browse the internet through one address — and a big reason IPv4 hasn't fully collapsed despite address exhaustion.

### Consequences of NAT you'll hit

- **Inbound connections don't work by default** — outside hosts can't initiate to a private IP. You need **port forwarding** (map a public port → an internal host) or a reverse proxy. This is why self-hosting a server behind home NAT needs setup.
- In the cloud, the same idea appears as a **NAT gateway** (private subnets reach the internet outbound while staying unreachable inbound) and **Elastic/Public IPs** + load balancers for inbound.

## Putting it together: a packet's journey

```
1. Is the destination on my subnet? (mask check)
   ├─ yes → ARP for its MAC, switch delivers the frame locally
   └─ no  → send to default gateway (router)
2. Router decrements TTL, looks up routing table, forwards to next hop
3. ... repeated hop by hop (NAT applied at the boundary to the public internet) ...
4. Destination network's router delivers to the host (ARP for final MAC)
```

## Check yourself

1. What's the difference between a switch and a router, and at which layer does each operate?
2. What does ARP do, and why is it only relevant within a single network?
3. In one sentence, what problem does NAT solve, and what limitation does it introduce for inbound connections?

## Key takeaways

- **Switches** forward **frames by MAC within** a network (L2); **ARP** resolves a local **IP → MAC**.
- **Routers** forward **packets by IP between** networks (L3) using **routing tables**; your **default gateway** is the exit, and **TTL** stops loops.
- **NAT** lets many private hosts share one public IP (rewriting source IP/port), which is why **inbound** connections need port forwarding / a load balancer.
- A packet's path is: local-or-not check → switch (local) or gateway → hop-by-hop routing → delivery — the foundation for VPC routing and troubleshooting.
