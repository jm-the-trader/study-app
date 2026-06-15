# Advanced: Mappings, Analyzers, Data Tiers & Scale

> **The one-sentence version:** The advanced Elastic skill set is controlling *how* fields are indexed (mappings and analyzers), placing data on the right *hardware tier* for its age, and stretching a cluster across data centers safely.

You know the data model, ingestion, querying, Kibana, and operating ILM/rollover. This lesson is about the decisions that make search fast, storage cheap, and the cluster resilient at scale.

## Mappings: the schema that controls everything

A **mapping** defines each field's type and how it's indexed — and it's mostly **immutable** once data is written (you can add fields, not change existing ones; changing type means reindex).

The classic gotcha is **`text` vs `keyword`**:

| Type | Indexed as | Use for |
|---|---|---|
| **text** | Analyzed into tokens (full-text search) | Free-form prose: log messages, descriptions |
| **keyword** | Stored whole, exact | Aggregations, sorting, exact filters: status, host, level |

Most string fields default to a **multi-field** (`field` as text + `field.keyword` as keyword) so you get both. Aggregating on a `text` field requires `fielddata` (memory-heavy) — almost always a sign you wanted `.keyword`.

> 💡 **Dynamic mapping** auto-detects types from the first document — convenient but dangerous: a number arriving as a string locks the field to `text`, and a mapping explosion from arbitrary keys can destabilize a cluster. For production, use **explicit mappings** via **index templates** (composed from reusable **component templates**), and disable dynamic mapping for untrusted fields.

## Analyzers: how text becomes searchable tokens

A **text** field is run through an **analyzer** at index time (and query time): a **character filter** → a **tokenizer** (split into terms) → **token filters** (lowercase, stop-words, stemming, synonyms). That's why a search for "running" can match "run" — the stemmer normalized both.

```json
"analyzer": { "my_en": { "tokenizer": "standard",
  "filter": ["lowercase", "english_stop", "english_stemmer"] } }
```

**Runtime fields** are the escape hatch: compute a field at *query time* (via a script) without reindexing — flexible, but slower than an indexed field. Use them for occasional/late-defined fields.

## Data tiers: match hardware to data age

Logs are written once and read often-then-rarely. Tiering puts each phase on appropriate (cheaper) hardware, driven by **ILM**:

| Tier | Hardware | Role |
|---|---|---|
| **Hot** | Fast SSD/CPU | Active writes + recent queries |
| **Warm** | Cheaper disk | Read-only, still on local disk |
| **Cold** | Slower/denser | Infrequent access, often single replica |
| **Frozen** | Object storage (S3) via **searchable snapshots** | Searched directly from the snapshot — huge retention at low cost, slower queries |

> 🔑 **Searchable snapshots** are the unlock for cheap long retention: data lives in object storage but is still queryable, so you can keep months of logs for the price of S3 instead of SSD.

## Stretching the cluster: CCR and CCS

- **Cross-Cluster Search (CCS)** queries multiple clusters from one place — a global view without merging them.
- **Cross-Cluster Replication (CCR)** replicates indices from a leader cluster to follower clusters — for disaster recovery or serving reads closer to a region.

For resilience *within* a cluster, **shard allocation awareness** spreads primary/replica shards across racks or availability zones so one zone failure never takes out both copies.

## Aggregations and query performance, deeper

- **Pipeline aggregations** compute on the *output* of other aggregations — e.g. a **derivative** (rate of change), **moving average**, or **cumulative sum** over a date histogram. This is how you turn counts into trends.
- **`cardinality`** (unique counts, approximate via HyperLogLog) and **`percentiles`** (approximate, e.g. p99 latency) are the workhorses for SLO-style analysis.
- Prefer **filter context** (yes/no, cacheable) over **query context** (scored) whenever you don't need relevance ranking — it's faster and cached.

## Security at the document level

Beyond cluster RBAC, the Elastic security model supports **field-level** (hide columns like SSN) and **document-level** security (a role only sees docs matching a query, e.g. its own team's). This lets one index serve many tenants safely.

## Check yourself

1. You can't aggregate cleanly on a log field — what's the likely mapping mistake and the fix?
2. Walk a string through an analyzer. Why does searching "running" match "ran"?
3. What problem do searchable snapshots solve, and on what storage do they rely?
4. When would you reach for a pipeline aggregation rather than a plain `summarize`/terms agg?

## Key takeaways

- **Mappings** are near-immutable; choose **text** (analyzed, full-text) vs **keyword** (exact, aggregations), and prefer **explicit mappings via index/component templates** over risky dynamic mapping.
- **Analyzers** (char filter → tokenizer → token filters) turn text into matchable tokens; **runtime fields** add query-time fields without reindexing.
- **Data tiers** (hot/warm/cold/frozen) driven by **ILM** match hardware to age; **searchable snapshots** make long retention cheap by querying object storage.
- Scale across clusters with **CCS** (search) and **CCR** (replication); use **shard allocation awareness** for zone resilience.
- Use **pipeline aggregations** for trends, **cardinality/percentiles** for SLOs, **filter context** for speed, and **field/document-level security** for multi-tenancy.
