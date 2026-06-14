# Elasticsearch Fundamentals

Elasticsearch is the engine everything else feeds and queries. Understand its data model and how it distributes data, and the rest of the stack — and most operational issues — make sense.

## The data model: documents and indices

Elasticsearch is **document-oriented**, not relational:

- A **document** is a JSON object — your unit of data (one log line, one order, one product). It has an `_id` and lives in an index.
- An **index** is a collection of similar documents — roughly analogous to a table or a database. Logs are typically grouped into time-based indices (e.g. `logs-2026.06.13`).
- A **mapping** is the index's schema — the fields and their **types** (`text`, `keyword`, `date`, `long`, `boolean`, `ip`…). Elasticsearch can infer it ("dynamic mapping"), but defining it matters (next section).

Rough mental translation from SQL: **index ≈ table, document ≈ row, field ≈ column** — but documents are schema-flexible JSON.

## Why search is fast: the inverted index

A normal database, to find rows containing "timeout," scans every row. Elasticsearch instead builds an **inverted index**: for every **term**, it stores the list of documents that contain it — like the index at the back of a book.

```
term        → documents
"timeout"   → [12, 88, 421, ...]
"payment"   → [12, 305, ...]
"error"     → [12, 88, 421, 305, ...]
```

> 🔑 **The inverted index is why full-text search is instant.** Searching for "timeout" is a direct lookup of a pre-built term→documents list, not a scan. This is the core trick that makes Elasticsearch fast over huge volumes — and it's why it's a *search engine*, not just a datastore.

### text vs keyword (the mapping gotcha)

Two string field types behave very differently:

- **`text`** is **analyzed**: broken into terms (tokenized, lowercased) for **full-text search**. `"Payment Failed"` → terms `payment`, `failed`. Great for searching *within* messages; you **can't** sort/aggregate on it well.
- **`keyword`** is **not analyzed**: stored as one exact value. Perfect for **exact matches, sorting, and aggregations** (`status:"error"`, group-by `host`).

> ⚠️ A classic confusion: you try to aggregate or sort on a `text` field and it fails or behaves oddly. Use **`keyword`** for fields you filter/sort/aggregate on (IDs, statuses, hostnames) and **`text`** for human messages you full-text search. Elastic often maps strings as both (`message` + `message.keyword`).

## How it scales: shards, replicas, nodes

Elasticsearch is **distributed by design**:

- A **node** is one Elasticsearch instance; multiple nodes form a **cluster**.
- An index is split into **shards** — each shard is a self-contained piece (a Lucene index) holding a subset of the documents. Sharding lets one index span many nodes and parallelizes search.
- Each shard can have **replicas** — copies on *other* nodes for **high availability** (survive a node failure) and **read throughput** (queries can hit replicas).

```
index "logs"  →  shard 0 (node A)  + replica on node B
              →  shard 1 (node B)  + replica on node C
              →  shard 2 (node C)  + replica on node A
```

> 🔑 **Primary shards = how the data is split (scale + parallelism); replica shards = copies for resilience + read capacity.** A search fans out to all shards in parallel and merges the results — which is how Elasticsearch searches terabytes quickly.

> ⚠️ **Sharding is a trap if overdone.** Each shard has overhead; thousands of tiny shards ("oversharding") hurt performance and memory more than they help. The number of *primary* shards is fixed at index creation (you can't change it later without reindexing), so size shards deliberately — a common rule of thumb is tens of GB per shard. (More in the operations lesson.)

## Talking to Elasticsearch: the REST API

Everything is HTTP + JSON:

```bash
# Index a document
PUT /orders/_doc/1
{ "item": "widget", "qty": 3, "status": "shipped" }

# Get it back
GET /orders/_doc/1

# Search
GET /orders/_search
{ "query": { "match": { "status": "shipped" } } }

# Cluster health (green / yellow / red) ← check this first when troubleshooting
GET /_cluster/health
GET /_cat/indices?v          # human-readable index list + sizes
```

Cluster health is **green** (all shards assigned), **yellow** (primaries OK, some replicas unassigned), or **red** (some primary shards unassigned — data unavailable). Red means investigate now.

## Check yourself

1. Map Elasticsearch's index/document/field to their rough SQL equivalents — and what's fundamentally different?
2. Why is the inverted index fast, and when should a string field be `keyword` vs `text`?
3. What's the difference between a primary shard and a replica shard, and why is oversharding harmful?

## Key takeaways

- Elasticsearch is **document-oriented** (JSON **documents** in **indices** with a typed **mapping**); index≈table, doc≈row.
- The **inverted index** (term → documents) makes full-text search instant; use **`keyword`** for exact-match/sort/aggregate fields and **`text`** for searchable messages.
- It scales via **primary shards** (split data, parallelize) and **replica shards** (HA + read throughput) across **nodes**; avoid **oversharding**, and primary count is fixed at creation.
- It's driven by a **REST/JSON API**; watch **cluster health** (green/yellow/**red**).
