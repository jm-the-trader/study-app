# Storage and Configuration

> **The one-sentence version:** Pods are disposable, so anything that must survive a restart lives in a **PersistentVolume** claimed by a **PVC**, while configuration and secrets are injected at runtime from **ConfigMaps** and **Secrets** rather than baked into the image.

Containers have an ephemeral, writable layer that vanishes when the Pod is replaced — which, on OpenShift, happens constantly (rollouts, node drains, rescheduling). This lesson is about the two things you must *not* lose: persistent data and configuration.

## Why it matters

Bake config into your image and you need a rebuild to change a setting — and you'll be tempted to commit secrets. Write data to the container filesystem and a routine rollout silently deletes it. Both are common, painful mistakes that OpenShift gives you clean primitives to avoid.

## Persistent storage: PV, PVC, StorageClass

Three objects, a clean separation of concerns:

- **PersistentVolume (PV)** — a piece of actual storage in the cluster (a cloud disk, an NFS export, a Ceph volume). Provisioned by an admin or, more often, automatically.
- **PersistentVolumeClaim (PVC)** — a Pod's *request* for storage: "I need 10Gi, ReadWriteOnce." The Pod mounts the PVC; it neither knows nor cares which PV satisfies it.
- **StorageClass** — the template for **dynamic provisioning**: when a PVC asks for class `fast-ssd`, the matching **CSI driver** creates a PV on demand.

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata: { name: data }
spec:
  accessModes: ["ReadWriteOnce"]
  storageClassName: fast-ssd
  resources: { requests: { storage: 10Gi } }
```

> 🔑 The PVC is a level of indirection that decouples your app from the storage backend. The same manifest runs on AWS (EBS), bare metal (Ceph), or vSphere — only the **StorageClass** changes. **CSI** (Container Storage Interface) is the plugin standard that makes that possible.

### Access modes (a frequent gotcha)

| Mode | Short | Meaning |
|---|---|---|
| **ReadWriteOnce** | RWO | Mounted read-write by **one node** at a time |
| **ReadWriteMany** | RWX | Mounted read-write by **many nodes** simultaneously |
| **ReadOnlyMany** | ROX | Read-only by many nodes |

> ⚠️ RWO is per-**node**, not per-Pod — and it's the most common cloud-disk mode. If you scale a Deployment that mounts an RWO volume across nodes, the new Pods get stuck `ContainerCreating` because the disk can't attach twice. Stateful, replicated apps need **RWX** storage *or* a **StatefulSet** giving each replica its own volume.

## Configuration: ConfigMaps and Secrets

The **Twelve-Factor** principle: keep config in the environment, not the code. OpenShift injects it two ways.

- **ConfigMap** — non-sensitive key/value config (feature flags, URLs, tuning).
- **Secret** — sensitive values (passwords, tokens, TLS keys). Same shape, but base64-encoded and handled with more care (and connected to the **PKI** topic for TLS material).

Both can be surfaced as **environment variables** or **mounted as files**:

```yaml
spec:
  containers:
    - name: app
      envFrom:
        - configMapRef: { name: app-config }   # every key → an env var
        - secretRef:    { name: app-secrets }
      volumeMounts:
        - { name: tls, mountPath: /etc/tls, readOnly: true }
  volumes:
    - name: tls
      secret: { secretName: app-tls }          # mount cert/key as files
```

> 💡 Prefer **file mounts** for multi-line values like certificates, and for secrets you'd rather not expose in `env`/process listings. A mounted Secret can even update in place without a restart — handy for cert rotation. Remember the previous lesson's UID rule: mounted paths must be **group-0 readable** for the arbitrary UID to read them.

A subtle but important point: **Secrets are base64-encoded, not encrypted** at rest by default. Treat the manifest as sensitive, gate it with RBAC, never commit real values to Git, and for serious needs layer on the **External Secrets Operator** or Vault.

## Check yourself

1. Why does writing important data to a container's own filesystem lose it, and what's the fix?
2. You scaled a Deployment to 3 replicas across nodes and two Pods are stuck `ContainerCreating` on volume attach. What's the likely cause?
3. When would you mount a Secret as a file rather than inject it as an environment variable?

## Key takeaways

- Persist data with a **PVC** (the request) bound to a **PV** (the storage), usually auto-created from a **StorageClass** via a **CSI** driver — the PVC decouples your app from the backend.
- **Access modes** matter: **RWO** is one-node-at-a-time (most cloud disks); scaling across nodes needs **RWX** or a **StatefulSet** with per-replica volumes.
- Keep config out of images: **ConfigMaps** for plain config, **Secrets** for sensitive values, injected as **env vars or mounted files**.
- **Secrets are base64, not encrypted** — protect with RBAC, keep them out of Git, and consider Vault/External Secrets for real secret management.
