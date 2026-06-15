# Advanced: TCP Internals, Overlays & the Linux Packet Path

> **The one-sentence version:** Once packets flow, the advanced questions are *how TCP stays fast and fair*, *how virtual networks ride on top of physical ones*, and *how the Linux kernel actually filters and rewrites every packet*.

You know the layered model, CIDR, routing/switching/NAT, TCP/UDP/ports, and a troubleshooting toolkit. This lesson goes deeper into the transport, the overlays that power cloud and Kubernetes, and the netfilter machinery underneath it all.

## TCP, past the handshake

The 3-way handshake (`SYN → SYN-ACK → ACK`) is just the start. Performance comes from two control loops:

- **Flow control** — the receiver advertises a **window** (how much it can buffer); the sender never sends more than that unacked. **Window scaling** (an option) lifts the old 64 KB cap so high-bandwidth, high-latency links ("long fat networks") can stay full.
- **Congestion control** — the *sender's* guess at what the *network* can take. It grows the congestion window on success and backs off on loss. Modern Linux defaults to **CUBIC**; **BBR** models bandwidth/RTT instead of treating loss as the only congestion signal, often improving throughput on lossy paths.

> ⚠️ **MSS, MTU, and PMTUD.** The MTU (typically 1500 bytes on Ethernet) caps frame size; TCP's MSS is set to fit. On tunnels/overlays the usable MTU is *smaller* (encapsulation eats bytes). If Path MTU Discovery is broken (ICMP "fragmentation needed" blocked by an overzealous firewall), you get the classic "handshake works, big transfers hang" **MTU black hole**. Lowering MSS (`mss clamping`) is the common fix.

**TIME_WAIT** — after closing, the initiator holds the socket ~2×MSL so late packets can't corrupt a new connection. Thousands of TIME_WAIT sockets on a busy proxy is normal, not a leak; tune with connection reuse/keepalive, not by disabling it.

## L4 vs L7 load balancing

| | L4 (transport) | L7 (application) |
|---|---|---|
| Sees | IPs + ports | HTTP headers, paths, hostnames, cookies |
| Can do | Fast, protocol-agnostic forwarding | Path routing, TLS termination, retries, header rewrite |
| Examples | IPVS, NLB, `stream` module | Nginx/Envoy, ALB, Ingress controllers |

L4 is faster and works for any TCP/UDP protocol; L7 is smarter but must parse the protocol. Kubernetes Services are essentially L4; Ingress is L7.

## Overlay networks: virtual on top of physical

Cloud and Kubernetes give every workload an IP on a network that may span many physical hosts. **Overlay networks** make this work by **encapsulation** — wrapping each inner packet inside an outer one that travels the real network:

- **VXLAN** wraps Ethernet frames in UDP, creating a virtual L2 segment across L3 — the basis of many container/CNI networks and cloud virtual networks.
- This is exactly the **CNI** problem from Kubernetes: plugins like **Calico** (often pure L3 routing, optionally BGP) or **Cilium** (eBPF-based) give every Pod a routable IP and enforce NetworkPolicy. Remember overlays shrink the effective MTU (encapsulation overhead) — re-read the MTU note above.

## BGP and anycast (briefly)

**BGP** is how independent networks on the internet exchange routes. Inside infrastructure it's also used to advertise service IPs: **anycast** announces the *same* IP from many locations, and BGP steers each client to the nearest — the backbone of global DNS resolvers, CDNs, and DDoS absorption (ties to the DNS topic).

## The Linux packet path: netfilter

Every packet on a Linux box traverses **netfilter** hooks. **iptables** (and its successor **nftables**) define rules at those hooks for filtering and NAT; **conntrack** tracks each connection's state so replies are allowed automatically (stateful firewalling) and so NAT can rewrite both directions consistently.

> 🔑 Kubernetes `kube-proxy` historically programs **iptables/IPVS** rules to implement Service virtual IPs; Cilium replaces much of this with **eBPF** programs in the kernel for lower overhead. When you debug "the Service IP isn't reachable," you're really debugging these netfilter/eBPF rules and conntrack.

## QUIC and HTTP/3

**QUIC** runs over **UDP** and folds TLS 1.3, multiplexed streams, and loss recovery into one protocol — eliminating head-of-line blocking between streams and enabling 0-RTT reconnects. **HTTP/3** is HTTP over QUIC. Because it's UDP, middleboxes and firewalls that only understand TCP can interfere — a real operational consideration.

## Check yourself

1. Distinguish TCP flow control from congestion control — which protects the *receiver* and which protects the *network*?
2. Explain an MTU black hole on an overlay network and a common fix.
3. What does encapsulation (e.g. VXLAN) achieve, and how does it relate to a Kubernetes CNI?
4. When you can't reach a Kubernetes Service IP, which kernel machinery are you actually troubleshooting?

## Key takeaways

- TCP performance rides on **flow control** (receiver window + scaling) and **congestion control** (CUBIC/BBR); **MSS/MTU/PMTUD** mismatches cause hangs, especially on overlays.
- **L4** load balancing is fast/protocol-agnostic; **L7** parses the application for smart routing — Services are L4, Ingress is L7.
- **Overlay networks** use **encapsulation** (VXLAN) to run virtual networks on physical ones — the foundation of cloud networking and Kubernetes **CNIs** (Calico/Cilium), which shrink usable MTU.
- **BGP/anycast** distribute the same IP globally; the **netfilter** stack (iptables/nftables + conntrack, or eBPF) filters, NATs, and implements Service IPs.
- **QUIC/HTTP3** run over UDP with built-in TLS and stream multiplexing — fast, but UDP-aware firewalls matter.
