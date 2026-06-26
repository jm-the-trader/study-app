# Security: SCCs and the Arbitrary-UID Contract

> **The one-sentence version:** OpenShift refuses to run your container as root and hands it a *random* UID instead — so the single most important OpenShift skill is building images that run happily as **any** non-root user.

This is the lesson that separates people who've *seen* OpenShift from people who can *ship* on it. The classic war story: "my image runs fine on Docker and on a kind cluster, but on OpenShift it `CrashLoopBackOff`s with permission denied." Almost always, this lesson is the reason.

## Why it matters

Running containers as root is a real security risk: a container escape as UID 0 is far more dangerous than as an unprivileged user. OpenShift's default posture is **deny-by-default, non-root-by-default**, enforced by **Security Context Constraints (SCCs)**.

## What an SCC is

A **Security Context Constraint** is an OpenShift admission-policy object that decides **what a Pod is allowed to do**: can it run as root? use the host network or host PID? mount `hostPath` volumes? add Linux capabilities? what UID/GID range may it use?

When a Pod is created, OpenShift finds the SCCs available to the Pod's **ServiceAccount**, picks the most restrictive one that admits it, and uses it to *both* validate the Pod and **fill in defaults** (like the UID it runs as).

The built-in SCCs, from strict to permissive:

| SCC | What it allows | Use for |
|---|---|---|
| `restricted-v2` | **Default.** Non-root, random UID, drops most capabilities, no host access | Almost everything |
| `nonroot-v2` | Lets the image pick its own non-root UID | Images needing a *specific* non-root UID |
| `anyuid` | Run as any UID, including the one the image declares (even 0) | Legacy images that insist on a fixed UID |
| `hostnetwork` / `hostmount-anyuid` | Host networking / host mounts | Infra and node-level agents |
| `privileged` | Essentially unconstrained | Trusted cluster components only |

> ⚠️ Reaching for `anyuid` or `privileged` to "make it work" is the wrong instinct 95% of the time. It's a security regression, it often won't pass review, and it papers over an image that simply isn't cloud-native. Fix the image instead.

## The arbitrary-UID contract

Under `restricted-v2`, OpenShift assigns your Pod a **random high UID** from the Project's allocated range (e.g. `1000680000`). Crucially:

- The UID is **not** one your image's filesystem knows about — there's no matching entry in `/etc/passwd`.
- But the process's **primary group is always GID 0** (the `root` group — group membership, *not* root privileges).

So an image runs on OpenShift if, and only if, it tolerates an unknown UID whose group is 0. Four rules:

```dockerfile
# 1. Don't hardcode a numeric USER your files depend on.
#    USER 1001 is fine as a *default*, but nothing may REQUIRE that exact uid.

# 2. Make everything the app reads/writes group-0 owned and group-writable,
#    because the random UID WILL be a member of group 0.
RUN chgrp -R 0 /app && chmod -R g=u /app   # "give the group the same perms as the owner"

# 3. Listen on an unprivileged port. A non-root process can't bind <1024.
EXPOSE 8080                                # not 80; 8443 not 443

# 4. Don't assume a writable $HOME or a passwd entry. Write to /tmp or a
#    mounted volume, not to paths only root can touch.
```

> 🔑 **"Group 0, group-writable, high port."** Burn those three into memory. An image that (a) doesn't need a specific UID, (b) gives group 0 the owner's permissions on everything it writes, and (c) binds a port ≥1024 will run unchanged on OpenShift *and* is more secure on plain Kubernetes too. Red Hat's UBI base images (e.g. `ubi9/python-311`) already follow this.

You can verify your image the way OpenShift will, by forcing a random UID locally:

```bash
podman run --user 1000680000 -p 8080:8080 myimage:dev   # mimic OpenShift's arbitrary uid
```

If that errors with "permission denied" or "can't bind," OpenShift would too. Fix it before you push.

## ServiceAccounts, RBAC, and Secrets

- Every Pod runs as a **ServiceAccount** (the `default` one if unspecified); SCCs and RBAC are granted *to* that account, not to the Pod directly.
- **RBAC** (`Role`/`RoleBinding`, `ClusterRole`/`ClusterRoleBinding`) controls *who can do what* to the API. SCCs control *what a running Pod may do*. Different axes — you need both.
- **Secrets** hold credentials/TLS material. They're base64-encoded, **not encrypted at rest by default** — pair them with proper RBAC, and for real secrets management many shops add the **External Secrets Operator** or HashiCorp Vault. (Certificates and trust here connect to the **PKI** topic.)
- SCCs are OpenShift's stricter superset of upstream **Pod Security Admission** standards; both push the same non-root, least-privilege defaults.

## Check yourself

1. An image runs locally but `CrashLoopBackOff`s with "permission denied" on OpenShift. Name two image changes likely to fix it *without* using `anyuid`.
2. Your process needs to listen for web traffic. Why is `EXPOSE 80` a problem, and what do you do instead?
3. What's the difference in responsibility between an SCC and an RBAC Role?

## Key takeaways

- **SCCs** decide what a Pod may do; the default **`restricted-v2`** runs containers **non-root with a random UID** and **GID 0**.
- Build for the **arbitrary-UID contract**: don't require a specific UID, make files **group-0 owned and group-writable** (`chgrp -R 0 && chmod -R g=u`), and **bind ports ≥1024**.
- Reaching for **`anyuid`/`privileged`** is usually a security regression that hides a non-cloud-native image — fix the image instead.
- **SCC ≠ RBAC**: one governs Pod runtime privileges, the other governs API permissions; both attach via the **ServiceAccount**.
