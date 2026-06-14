# Searching & Querying

Getting data in is half of ELK; getting answers out is the other half. This lesson covers the **Query DSL**, the crucial full-text-vs-exact distinction, and **aggregations** — the feature that turns logs into metrics.

## The Query DSL

Elasticsearch queries are JSON sent to the `_search` endpoint — the **Query DSL**. The two broad families:

- **Full-text queries** (e.g. `match`) — run the search text through the same **analyzer** as the field, so they match *terms* (tokenized, lowercased). Used on `text` fields. Relevance-scored.
- **Term-level queries** (e.g. `term`, `terms`, `range`) — match **exact** values, no analysis. Used on `keyword`, numbers, dates.

```json
GET /app-logs-*/_search
{
  "query": {
    "match": { "message": "connection timeout" }   // full-text on a text field
  }
}
```

```json
{ "query": { "term": { "status": "error" } } }       // exact match on a keyword field
{ "query": { "range": { "@timestamp": { "gte": "now-1h" } } } }   // last hour
```

> ⚠️ Using `term` on a `text` field (or `match` expecting exact equality) is a top beginner bug. **`match` = full-text on `text`; `term` = exact on `keyword`/numbers/dates.** (This is why the mapping lesson's text-vs-keyword distinction matters in practice.)

## bool: combining conditions

Real queries combine clauses with **`bool`**:

```json
{
  "query": {
    "bool": {
      "must":     [ { "match": { "message": "timeout" } } ],   // must match (scored)
      "filter":   [ { "term":  { "service": "payments" } },    // must match (no scoring → cached, fast)
                    { "range": { "@timestamp": { "gte": "now-24h" } } } ],
      "must_not": [ { "term":  { "env": "test" } } ],          // exclude
      "should":   [ { "match": { "message": "retry" } } ]      // boosts relevance if present
    }
  }
}
```

> 💡 Put exact/range conditions in **`filter`** (and `must_not`), not `must`: filter clauses **don't compute relevance scores**, so they're **cacheable and faster**. Reserve `must`/`should` for true full-text relevance. For log analytics, you'll mostly live in `filter`.

## KQL: the friendly query bar

In Kibana you usually type **KQL (Kibana Query Language)** in the search bar instead of raw DSL — far terser:

```
status: 500 and service: "payments" and @timestamp >= "now-1h"
message: *timeout* and not env: test
```

Kibana translates KQL into the Query DSL under the hood. Great for interactive exploration; use raw DSL for complex or programmatic queries.

## Aggregations: logs become metrics

This is Elasticsearch's analytical superpower. **Aggregations** summarize matching documents — counts, stats, groupings, time buckets — so you can answer questions, not just list lines.

- **Bucket aggregations** group documents: `terms` (top values), `date_histogram` (over time), `range`.
- **Metric aggregations** compute numbers per bucket: `avg`, `sum`, `min`/`max`, `percentiles`, `cardinality` (unique count).

```json
GET /app-logs-*/_search
{
  "size": 0,                                  // we want aggregates, not documents
  "query": { "term": { "status": "500" } },
  "aggs": {
    "errors_over_time": {
      "date_histogram": { "field": "@timestamp", "fixed_interval": "5m" },
      "aggs": {
        "by_service": { "terms": { "field": "service" } }   // nested: top services per bucket
      }
    }
  }
}
```

That single query yields "500s per 5-minute bucket, broken down by service" — a chart, derived from raw logs.

> 🔑 **Aggregations turn unstructured logs into structured metrics on the fly.** "Top 10 endpoints by error count in the last hour," "p95 response time by host," "unique users per day" — all are aggregations. This is why ELK is an *analytics* engine, not just a log viewer, and it's exactly what powers Kibana visualizations (next lesson).

## Relevance and pagination (brief)

- **Relevance scoring** (`_score`, BM25) ranks full-text results by how well they match — central to search use cases, mostly ignored for log filtering (where you sort by time).
- **Pagination:** `from`/`size` for shallow paging; **`search_after`** (or PIT) for deep/efficient scrolling — deep `from` pagination is expensive.

## Check yourself

1. When do you use a `match` query vs. a `term` query, and how does it relate to `text` vs. `keyword`?
2. Why put exact filters in a `bool`'s `filter` clause rather than `must`?
3. Give an example of a question only an **aggregation** can answer from raw logs, and which agg types you'd use.

## Key takeaways

- The **Query DSL** (JSON) has **full-text** (`match`, analyzed, scored — for `text`) and **term-level** (`term`/`range`, exact — for `keyword`/numbers/dates) queries; combine with **`bool`**.
- Prefer the **`filter`** clause for exact/range conditions — no scoring, **cacheable and fast**; **KQL** is the terser Kibana bar syntax.
- **Aggregations** (bucket + metric, e.g. `date_histogram` + `terms` + `avg`/`percentiles`) turn logs into **metrics and charts** — ELK's analytical core.
- Mind **relevance scoring** for search and efficient **pagination** (`search_after`) for deep results.
