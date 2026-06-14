# Container Security & Best Practices

Containers share the host kernel, so a weak container is a foothold on the host. The good news: a handful of disciplined defaults eliminate most risk. This lesson is your hardening checklist, building on everything so far.

## The threat model in one picture

Because there's **no guest kernel** (Lesson 1), the isolation between a container and the host is "only" namespaces + cgroups + kernel security modules. So the goals are: (1) keep the container from being compromised, and (2) if it is, keep the blast radius tiny.

> 🔑 **Defense in depth:** minimize what's *in* the image, minimize what the container is *allowed to do*, and verify the *supply chain*. No single control is enough; layered defaults are.

## 1. Run as non-root

By default, a container's process runs as **root** — and container-root maps to host-root unless you use user namespaces. If that process is exploited, the attacker has powerful capabilities.

```dockerfile
RUN useradd -r -u 10001 appuser
USER appuser
```
```bash
docker run --user 10001 myapp        # also enforceable at runtime
```

> ⚠️ **Running as root is the most common container security mistake.** Almost no app needs it. Set a non-root `USER` in the Dockerfile and enforce it at runtime. (Rootless engines like Podman go further by running the *whole* daemon unprivileged.)

## 2. Drop capabilities and privileges

Linux splits root's power into ~40 **capabilities**. Containers get a subset by default — drop what you don't need:

```bash
docker run --cap-drop=ALL --cap-add=NET_BIND_SERVICE myapp
docker run --security-opt=no-new-privileges myapp   # block privilege escalation
```

> ⚠️ **Never use `--privileged` unless you truly must** (it disables most isolation — full device access, all capabilities). It's a frequent foot-gun; prefer adding the *specific* capability or device you need.

## 3. Read-only root filesystem

If your app doesn't write to its own filesystem, make it immutable — an attacker then can't drop a payload:

```bash
docker run --read-only --tmpfs /tmp myapp
```

## 4. Minimal images = minimal attack surface

Everything from the Dockerfile lesson pays security dividends: a **multi-stage, distroless/slim** image has **no shell, no package manager, fewer libraries → fewer CVEs and nothing for an attacker to pivot with**. You can't `exec sh` into distroless because there's no `sh` — and neither can an intruder.

## 5. Scan, sign, and track (supply chain)

- **Scan** images for CVEs in CI (Trivy, Grype, `docker scout`); fail builds on critical findings and rebuild on base-image updates.
- **Sign** images with **cosign** and verify signatures at deploy time.
- **SBOM** — generate and keep a software bill of materials so you can answer "are we affected by CVE-X?" instantly.
- **Pin bases** by digest and use trusted sources.

## 6. Never bake in secrets

Secrets `COPY`'d or `ENV`'d into an image live in a layer **forever** and are visible to anyone who pulls it. Instead:

- Inject at runtime via environment or mounted files.
- Use a secrets manager (Vault, cloud secret stores) or orchestrator secrets.
- For build-time needs, use `RUN --mount=type=secret` (not persisted in layers).

## 7. Set resource limits

Always cap memory and CPU (`--memory`, `--cpus`). Beyond stability, this **contains denial-of-service** — a compromised or buggy container can't exhaust the host. (These are cgroups, from the Linux topic.)

## 8. Keep the host and runtime patched

The shared kernel means **host kernel vulnerabilities can enable container escapes**. Patch the host, the container runtime (containerd/runc), and rebuild images regularly to pick up base-image security fixes. An old base image is the silent, most common vulnerability.

## Hardening checklist

- [ ] Non-root `USER`; `--security-opt=no-new-privileges`
- [ ] `--cap-drop=ALL`, add back only what's needed; **never `--privileged`**
- [ ] `--read-only` rootfs + `tmpfs` for writable scratch
- [ ] Minimal base (distroless/slim), multi-stage build
- [ ] CVE scan in CI; sign (cosign) + verify; SBOM
- [ ] No secrets in images; inject at runtime
- [ ] Memory/CPU limits set
- [ ] Host, runtime, and base images patched/rebuilt regularly

## Check yourself

1. Why is "container shares the host kernel" the root of the container threat model, and what two goals follow?
2. What's wrong with `--privileged`, and what should you do instead when a container needs one extra capability?
3. Why does a distroless image improve security beyond just being small?

## Key takeaways

- Containers share the kernel, so practice **defense in depth**: minimal image, least privilege, verified supply chain.
- **Run non-root**, **drop capabilities**, **avoid `--privileged`**, use a **read-only rootfs**, and set **resource limits**.
- **Minimal/distroless images** shrink the attack surface (no shell to pivot with); **scan, sign, and SBOM** your supply chain.
- **Never bake secrets** into images, and **patch the host, runtime, and base images** — an outdated base is the most common vulnerability.
