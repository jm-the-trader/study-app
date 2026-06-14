# Config, Secrets & Storage

Apps need configuration, credentials, and somewhere to keep data. Kubernetes handles each with dedicated objects — and the golden rule is to keep config **out** of your image so the same image runs everywhere.

## ConfigMaps: non-secret configuration

A **ConfigMap** holds non-sensitive config as key/value pairs, decoupled from the image (12-factor again). Same image, different ConfigMap per environment.

```yaml
apiVersion: v1
kind: ConfigMap
metadata: { name: app-config }
data:
  LOG_LEVEL: "info"
  FEATURE_X: "true"
  app.properties: |
    timeout=30
    retries=3
```

Consume it as **environment variables** or as **files** in a mounted volume:

```yaml
# as env vars
envFrom:
  - configMapRef: { name: app-config }
# OR as files at /etc/config/*
volumes:
  - name: cfg
    configMap: { name: app-config }
```

> 💡 Mounting a ConfigMap as a **volume** lets you change config without rebuilding the image — and mounted ConfigMaps update in the Pod over time (env vars do **not** update until the Pod restarts). Choose the mount style to match whether the app reloads config.

## Secrets: sensitive data

A **Secret** is like a ConfigMap but for sensitive values (passwords, tokens, TLS certs). Same consumption model (env vars or mounted files).

```yaml
apiVersion: v1
kind: Secret
metadata: { name: db-creds }
type: Opaque
stringData:                # plaintext here; stored base64-encoded
  DB_PASSWORD: "s3cr3t"
```

> ⚠️ **Base64 is encoding, not encryption.** By default Secrets are only base64-encoded in etcd — anyone with etcd or API access can read them. Harden by enabling **encryption at rest** for Secrets, locking down **RBAC**, and—critically—**never committing real Secret YAML to Git**. For GitOps, use **Sealed Secrets**, **External Secrets Operator**, or a manager like **Vault**.

TLS certs (from the PKI topic) live in a Secret of `type: kubernetes.io/tls` — that's the `secretName` an Ingress references for HTTPS.

## Storage: persistence beyond the Pod

A Pod's filesystem is ephemeral — gone when the Pod is deleted (just like a container's writable layer). For data that must survive, Kubernetes separates *what you ask for* from *what backs it*:

- **PersistentVolume (PV)** — an actual piece of storage (a cloud disk, NFS share, etc.), cluster-level.
- **PersistentVolumeClaim (PVC)** — a Pod's **request** for storage ("I need 10Gi, ReadWriteOnce"). Kubernetes binds it to a suitable PV.
- **StorageClass** — defines a *type* of storage and enables **dynamic provisioning**: a PVC referencing a StorageClass automatically creates a matching PV (e.g. provisions an AWS EBS volume on demand).

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata: { name: data }
spec:
  accessModes: [ReadWriteOnce]
  storageClassName: standard
  resources: { requests: { storage: 10Gi } }
```

> 🔑 **PVC = the request, PV = the supply, StorageClass = the vending machine.** You write a PVC; with a StorageClass, the cluster dynamically provisions the underlying PV. Your Pod just mounts the PVC and never cares what storage backs it.

**Access modes** matter: `ReadWriteOnce` (one node), `ReadWriteMany` (many nodes — needs networked storage like NFS), `ReadOnlyMany`. Picking RWX when your storage only supports RWO is a common stumble.

## Stateful apps: StatefulSets

Databases need **stable identity** and **their own persistent storage per replica**. A **StatefulSet** (from the previous lesson) gives each Pod a stable name (`db-0`, `db-1`) and, via `volumeClaimTemplates`, **its own PVC** that follows it across restarts:

```yaml
kind: StatefulSet
spec:
  serviceName: db
  replicas: 3
  volumeClaimTemplates:
    - metadata: { name: data }
      spec:
        accessModes: [ReadWriteOnce]
        resources: { requests: { storage: 20Gi } }
```

So `db-0` always reattaches to *its* disk — essential for clustered databases.

## The pattern: keep state out of the container

> 🔑 The recurring theme across containers *and* Kubernetes: **the container/Pod is disposable; durable data lives in volumes, config in ConfigMaps, secrets in Secrets.** Build once, configure per-environment, persist externally. This is what lets Kubernetes reschedule, scale, and heal freely.

## Check yourself

1. Why is "Secrets are base64-encoded" not the same as "Secrets are secure," and what hardens them?
2. Explain the roles of PVC, PV, and StorageClass.
3. Why do databases use a StatefulSet with `volumeClaimTemplates` rather than a Deployment?

## Key takeaways

- **ConfigMaps** (non-secret) and **Secrets** (sensitive) decouple config from the image; consume as env vars or mounted files (mounted files can update live).
- **Base64 ≠ encryption** — enable encryption at rest, tighten RBAC, keep real Secrets out of Git (use Sealed Secrets/External Secrets/Vault).
- Storage splits into **PVC (request) → PV (supply) → StorageClass (dynamic provisioning)**; mind **access modes** (RWO vs RWX).
- **StatefulSets** give stateful apps stable identity and **per-Pod persistent volumes** — keep durable state in volumes, never in the Pod.
