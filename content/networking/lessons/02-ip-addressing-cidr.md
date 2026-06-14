# IP Addressing & CIDR Subnets

Every device on a network needs an address. This lesson is about **IP addresses**, how they're split into **networks and hosts**, and **CIDR** — the notation that trips people up but is essential for cloud, Kubernetes, and firewall work.

## IPv4 addresses

An **IPv4** address is 32 bits, written as four **octets** (0–255): `192.168.1.10`. Each octet is 8 bits, so the whole thing is 4 × 8 = 32 bits. That gives ~4.3 billion addresses — which we've run out of (hence NAT and IPv6, later).

## Network vs. host: the subnet mask

An IP address has two parts: a **network** portion (which network you're on) and a **host** portion (which device on it). The **subnet mask** says where the split is.

```
IP:   192.168.1.10
mask: 255.255.255.0   →  first 24 bits = network, last 8 = host
                          network: 192.168.1.0
                          host:    .10
```

> 🔑 Devices on the **same network** (same network portion) can talk **directly**; to reach a **different** network, traffic must go through a **router/gateway** (next lesson). The mask is what every device uses to decide "is this destination local, or do I send it to the gateway?"

## CIDR notation

Writing masks as `255.255.255.0` is clumsy. **CIDR** (Classless Inter-Domain Routing) writes the mask as the **number of network bits** after a slash:

```
192.168.1.0/24    ← /24 means 24 network bits (= 255.255.255.0)
10.0.0.0/8        ← /8  = 255.0.0.0
172.16.5.0/22     ← /22 = 255.255.252.0
```

> 🔑 **The /N is just "how many leading bits are the network."** Bigger N = more network bits = **fewer hosts** (smaller subnet). `/24` is a common "256-address" block; `/16` is much bigger; `/32` is a single host. This notation is everywhere in cloud VPCs, k8s pod CIDRs, and firewall rules.

### Counting hosts

Host bits = `32 − N`. Usable hosts ≈ `2^(32−N) − 2` (subtract the **network address** and the **broadcast address**, which can't be assigned to hosts).

| CIDR | Host bits | Total addresses | Usable hosts |
|---|---|---|---|
| `/24` | 8 | 256 | 254 |
| `/26` | 6 | 64 | 62 |
| `/30` | 2 | 4 | 2 |
| `/16` | 16 | 65,536 | 65,534 |

> 💡 Quick math: each step **smaller** in /N **doubles** the size (`/25` = 128 addresses, `/24` = 256, `/23` = 512). Each step **larger** halves it. You'll size subnets this way constantly.

## Private vs. public addresses

Some ranges are **private** — reserved for internal networks, not routable on the public internet (your home/office/VPC uses these, and NAT bridges them to the internet — next lesson):

- `10.0.0.0/8` (10.x.x.x)
- `172.16.0.0/12` (172.16–172.31.x.x)
- `192.168.0.0/16` (192.168.x.x)

Plus a couple worth knowing: `127.0.0.0/8` = **loopback** (`127.0.0.1` = localhost — recall the security lesson's loopback bind), and `169.254.0.0/16` = link-local (the "no DHCP" self-assigned address; also cloud metadata at `169.254.169.254`).

> ⚠️ When you design a VPC or a Kubernetes cluster you **choose private CIDR ranges** for it. Overlapping CIDRs (e.g. two VPCs both using `10.0.0.0/16` you later need to peer, or a pod CIDR clashing with a corporate range) cause routing nightmares. Plan non-overlapping ranges up front.

## Subnetting (splitting a network)

Subnetting carves a big block into smaller ones by **borrowing host bits for the network**. Split `10.0.0.0/24` into two `/25`s:

```
10.0.0.0/24  →  10.0.0.0/25   (10.0.0.0   – 10.0.0.127, 126 usable)
                10.0.0.128/25 (10.0.0.128 – 10.0.0.255, 126 usable)
```

This is exactly how you divide a VPC into public/private/database subnets across availability zones.

## A word on IPv6

**IPv6** uses 128-bit addresses (e.g. `2001:db8::1`), written in hex groups separated by colons, with `::` collapsing consecutive zero groups. It exists because IPv4 ran out. The *concepts* transfer — there's still a prefix length (`/64` is the typical subnet), no NAT needed (the address space is enormous), and routing works the same way. You'll mostly work in IPv4 internally, but know IPv6 exists and uses the same layered model.

## Check yourself

1. In `192.168.1.10/24`, which part is the network and which is the host, and how many usable hosts does the subnet have?
2. You need ~60 hosts in a subnet. Which CIDR size fits with least waste, and how many usable addresses does it give?
3. Why must two VPCs you intend to peer use non-overlapping CIDR ranges?

## Key takeaways

- An IPv4 address (32 bits, four octets) splits into a **network** part and a **host** part, defined by the **subnet mask**; same-network hosts talk directly, others go via a router.
- **CIDR `/N`** = number of network bits; bigger N = smaller subnet. Usable hosts ≈ `2^(32−N) − 2`; each ±1 in N halves/doubles the size.
- **Private ranges** (`10/8`, `172.16/12`, `192.168/16`) are for internal networks; plan **non-overlapping** CIDRs for VPCs/clusters. `127.0.0.1` is loopback.
- **Subnetting** borrows host bits to split a block — the basis of VPC subnet design; **IPv6** (128-bit) applies the same concepts at a vastly larger scale.
