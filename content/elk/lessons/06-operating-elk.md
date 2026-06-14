# Operating ELK at Scale

A demo ELK on a laptop is easy; a production cluster ingesting terabytes a day is where the real skills live. This lesson covers the operational concerns that keep Elasticsearch fast, available, and affordable — the things platform engineers actually get paged about.

## The volume problem

Logs are *huge* and *time-series* in nature: you write a lot, you mostly query recent data, and old data gets queried rarely (but may need retention for compliance). Naively dumping everything into one giant index and keeping it forever will blow up storage cost and degrade performance. The answer is **lifecycle management**.

## Index Lifecycle Management (ILM)

**ILM** automates an index's life through phases as it ages:

- **Hot** — actively written and frequently queried; on fast (SSD) hardware.
- **Warm** — no longer written, queried occasionally; cheaper hardware, maybe fewer replicas.
- **Cold / Frozen** — rarely queried; very cheap storage (frozen can even keep data searchable on object storage).
- **Delete** — removed after the retention period.

> 🔑 **ILM matches storage cost to data value over time.** Recent logs sit on fast/expensive nodes; week-old logs roll to cheap nodes; month-old logs are deleted or frozen. You define the policy once; Elasticsearch moves and deletes indices automatically. This is the single biggest lever on an ELK cluster's cost and performance.

## Rollover and data streams

Rather than fixed daily indices, modern Elastic uses **rollover**: keep writing to an index until it hits a size/age/doc-count threshold, then automatically start a new one. **Data streams** wrap this up — you write to one logical name (`logs-app`) and Elasticsearch manages the backing indices and ILM behind it.

> 💡 Rollover by **size** (e.g. ~50 GB per shard) is healthier than rigid daily indices: a quiet day and a flood day both produce well-sized shards, avoiding tiny or giant ones.

## Shard sizing — the perennial pitfall

From the fundamentals lesson: too many tiny shards ("oversharding") wastes memory and slows everything; too few giant shards limit parallelism and make recovery slow.

> ⚠️ Rules of thumb (not laws): aim for shards in the **tens of GB** (often quoted ~10–50 GB), keep total shards per node within sane limits (heap-dependent), and remember **primary shard count is fixed at creation** — to change it you **reindex**. Plan shard count from expected daily volume × retention, not by guessing.

## Cluster health, capacity & resilience

- **Watch cluster health** (green/yellow/**red**) and **heap usage**. Elasticsearch is heap-hungry; set JVM heap to ~50% of RAM and **under ~32 GB** (so the JVM keeps compressed object pointers). Leave the other half for the OS filesystem cache (which makes searches fast).
- **Dedicated roles** at scale: separate **master-eligible** nodes (cluster coordination — use an odd number, e.g. 3, to avoid split-brain), **data** nodes, and **ingest/coordinating** nodes.
- **Replicas** give HA and read throughput, at the cost of storage — at least 1 replica in production so a node loss doesn't lose data or go red.
- **Snapshots** — back up indices to object storage (S3/GCS) regularly; snapshots are your disaster recovery.

## Security

Don't run an open cluster (early Elasticsearch had no auth by default, leading to countless public data leaks). In production:

- **Authentication & RBAC** — users/roles, least privilege per index.
- **TLS everywhere** — encrypt node-to-node and client traffic (recall the PKI/Nginx topics).
- **Network isolation** — never expose Elasticsearch directly to the internet; front it and lock it down.

## Performance & cost tips

- **Use ingest-time parsing** and good mappings; disable indexing on fields you never search (`index: false`) and `_source` tricks where appropriate.
- **Avoid mapping explosions** — dynamically mapping high-cardinality/arbitrary JSON keys can create thousands of fields ("mapping explosion") and destabilize the cluster; constrain dynamic mapping.
- **Tier and delete** aggressively with ILM — retention is a cost decision, not "keep everything."
- **Right-size before scaling out** — often a sharding/heap/ILM misconfiguration, not lack of hardware, is the real problem.

## Check yourself

1. What does ILM do, and why is it the biggest lever on ELK cost and performance?
2. Why is oversharding harmful, and what determines whether you can change the primary shard count later?
3. Give two production hardening steps for an Elasticsearch cluster (security or resilience).

## Key takeaways

- Logs are high-volume time-series; **ILM** (hot → warm → cold/frozen → delete) **matches storage cost to data value** and automates retention.
- Use **rollover / data streams** to keep shards well-sized; target shards in the **tens of GB** and remember **primary count is fixed** (changing it means reindexing).
- Operate for resilience: watch **cluster health & heap** (≤~32 GB, ~50% RAM), use **dedicated node roles** (odd master count), keep **replicas**, and take **snapshots**.
- **Secure it** (auth/RBAC, TLS, no public exposure) and avoid **mapping explosions**; tune config before throwing hardware at it.
