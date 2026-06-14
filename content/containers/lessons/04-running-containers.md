# Running Containers

Building images is half the job; running them well is the other half. This lesson covers the container lifecycle and the four things you almost always configure: **ports, storage, environment, and networking**.

## The lifecycle

```bash
docker run nginx                 # create + start a container from an image
docker ps                        # running containers
docker ps -a                     # include stopped ones
docker stop <id>                 # graceful: SIGTERM, then SIGKILL after a grace period
docker start <id>                # restart a stopped container
docker rm <id>                   # delete a stopped container
docker logs -f <id>              # stream its stdout/stderr
docker exec -it <id> sh          # get a shell INSIDE a running container
```

> 🔑 A container runs **as long as its main process (PID 1) runs**. When that process exits, the container stops. This is why "my container exits immediately" almost always means the `CMD` finished or crashed — a container isn't a VM that stays up; it *is* the process.

`docker stop` sends **SIGTERM** (graceful shutdown — recall the Linux signals lesson), waits ~10s, then **SIGKILL**. Your app should handle SIGTERM to drain cleanly.

## Ports: publishing to the host

`EXPOSE` only documents a port. To actually reach a container from outside, **publish** it with `-p host:container`:

```bash
docker run -p 8080:80 nginx      # host :8080 → container :80
docker run -P nginx              # publish all EXPOSEd ports to random host ports
```

> 💡 Read `-p 8080:80` as **host-port : container-port**. Getting these backwards ("connection refused") is one of the most common container mistakes.

## Storage: containers are ephemeral

The container's writable layer is **destroyed when the container is removed**. For anything that must survive — databases, uploads — use a **volume** or **bind mount**:

```bash
# Named volume (Docker-managed; the right choice for app data)
docker run -v pgdata:/var/lib/postgresql/data postgres

# Bind mount (a host path → container path; great for local dev)
docker run -v "$(pwd)":/app node:20 npm run dev

# tmpfs (in-memory, never hits disk; for secrets/scratch)
docker run --tmpfs /tmp myapp
```

> ⚠️ **Treat containers as disposable.** Never store important state in the container's writable layer — `docker rm` deletes it. Persistent data belongs in a **named volume** (or an external service). This "cattle, not pets" mindset is essential for orchestration.

| Type | Lives | Use for |
|---|---|---|
| **Named volume** | Managed by Docker, survives `rm` | Databases, app data |
| **Bind mount** | A specific host directory | Local dev (live-edit source) |
| **tmpfs** | RAM only | Secrets, scratch, fast temp |

## Configuration: environment variables

The standard way to configure a container (the **12-factor** approach): inject config via environment, not baked-in files.

```bash
docker run -e LOG_LEVEL=debug -e DB_HOST=db myapp
docker run --env-file ./prod.env myapp
```

Same image, different config per environment — dev/staging/prod differ only by their env vars and mounted secrets.

## Networking basics

Docker gives containers their own network namespace and connects them via **networks**:

```bash
docker network create appnet
docker run -d --name db --network appnet postgres
docker run -d --name api --network appnet -e DB_HOST=db myapi
```

> 🔑 On a **user-defined network**, containers reach each other **by name** via Docker's built-in DNS — `api` connects to `db` simply using the hostname `db`. (The default `bridge` network lacks this name resolution, which is why creating your own network is recommended.)

Network driver types worth knowing: **bridge** (default, single-host private network), **host** (share the host's network stack — no isolation, max performance), and **none** (no networking).

## Resource limits (cgroups again)

Cap what a container can consume — these become cgroup limits on the host:

```bash
docker run --memory=512m --cpus=1.5 myapp
```

Exceed `--memory` and the container is **OOMKilled** by its cgroup (the exact mechanism from the Linux topic).

## Docker Compose: multi-container, declaratively

For an app with several services, declare them in `docker-compose.yml` and bring them up together:

```yaml
services:
  api:
    build: .
    ports: ["8080:3000"]
    environment: { DB_HOST: db }
    depends_on: [db]
  db:
    image: postgres:16
    volumes: ["pgdata:/var/lib/postgresql/data"]
volumes:
  pgdata:
```

```bash
docker compose up -d      # start the whole stack
docker compose down       # stop + remove it
```

Compose is the bridge from "one container" to "an app" — and a gentle on-ramp to the declarative thinking Kubernetes formalizes.

## Check yourself

1. Why does a container stop "by itself," and how does that explain "my container exits immediately"?
2. You need a Postgres container's data to survive `docker rm`. What do you use, and why not the writable layer?
3. On a user-defined network, how does the `api` container reach the `db` container?

## Key takeaways

- A container lives exactly as long as its **PID 1 process**; `docker stop` sends **SIGTERM** then SIGKILL — handle it for graceful shutdown.
- **Publish ports** with `-p host:container`; **persist data** in **named volumes** (containers are disposable — never trust the writable layer).
- **Configure via environment variables** (same image, per-env config); on a **user-defined network**, containers resolve each other **by name**.
- `--memory`/`--cpus` map to **cgroups**; **Compose** declares multi-container apps and previews Kubernetes-style thinking.
