# Database Schema

## ClickHouse Tables

### spans (hot tier)

```sql
CREATE TABLE IF NOT EXISTS tracelens.spans
(
    trace_id LowCardinality(String),
    span_id String,
    parent_id Nullable(String),
    agent_type LowCardinality(String),
    tool_name LowCardinality(String),
    llm_model LowCardinality(Nullable(String)),
    input_tokens UInt32,
    output_tokens UInt32,
    latency_ms UInt32,
    status LowCardinality(String),
    error_message Nullable(String),
    cost_usd Decimal64(6),
    timestamp DateTime64(3),
    attributes String, -- JSON
    guardloop_code_quality Nullable(Float64),
    guardloop_security_risk Nullable(Float64),
    guardloop_test_coverage Nullable(Float64),

    INDEX idx_trace_id trace_id TYPE bloom_filter GRANULARITY 3,
    INDEX idx_agent_type agent_type TYPE bloom_filter GRANULARITY 3,
    INDEX idx_status status TYPE bloom_filter GRANULARITY 3
)
ENGINE = MergeTree()
PARTITION BY toStartOfDay(timestamp)
ORDER BY (trace_id, timestamp, span_id)
TTL timestamp + INTERVAL 7 DAY TO VOLUME 'warm',
    timestamp + INTERVAL 30 DAY TO VOLUME 'cold'
SETTINGS index_granularity = 8192;
```

### traces (aggregated view)

```sql
CREATE TABLE IF NOT EXISTS tracelens.traces
(
    trace_id LowCardinality(String),
    agent_type LowCardinality(String),
    total_spans UInt16,
    total_cost_usd Decimal64(6),
    total_latency_ms UInt32,
    status LowCardinality(String),
    failure_signature Nullable(String),
    started_at DateTime64(3),
    ended_at DateTime64(3),

    INDEX idx_trace_id trace_id TYPE bloom_filter GRANULARITY 3
)
ENGINE = MergeTree()
PARTITION BY toStartOfWeek(started_at)
ORDER BY (trace_id, started_at)
TTL started_at + INTERVAL 30 DAY;
```

### replay_data (hot only)

```sql
CREATE TABLE IF NOT EXISTS tracelens.replay_data
(
    trace_id LowCardinality(String),
    span_id String,
    step_index UInt16,
    prompt Nullable(String),
    response Nullable(String),
    tool_output Nullable(String),
    decision Nullable(String),
    timestamp DateTime64(3)
)
ENGINE = MergeTree()
PARTITION BY toStartOfDay(timestamp)
ORDER BY (trace_id, step_index)
TTL timestamp + INTERVAL 7 DAY;
```

### failure_signatures

```sql
CREATE TABLE IF NOT EXISTS tracelens.failure_signatures
(
    signature_hash String,
    signature_text String,
    agent_type LowCardinality(String),
    tool_name LowCardinality(String),
    count UInt32,
    first_seen DateTime64(3),
    last_seen DateTime64(3)
)
ENGINE = ReplacingMergeTree(last_seen)
ORDER BY signature_hash;
```

### cost_attribution

```sql
CREATE TABLE IF NOT EXISTS tracelens.cost_attribution
(
    trace_id LowCardinality(String),
    agent_type LowCardinality(String),
    tool_name LowCardinality(String),
    llm_model LowCardinality(Nullable(String)),
    cost_usd Decimal64(6),
    input_tokens UInt32,
    output_tokens UInt32,
    timestamp DateTime64(3)
)
ENGINE = MergeTree()
PARTITION BY toStartOfDay(timestamp)
ORDER BY (trace_id, timestamp)
TTL timestamp + INTERVAL 30 DAY;
```

## Materialized Views

```sql
-- Auto-aggregate traces from spans
CREATE MATERIALIZED VIEW tracelens.traces_mv
TO tracelens.traces
AS SELECT
    trace_id,
    agent_type,
    count() as total_spans,
    sum(cost_usd) as total_cost_usd,
    max(latency_ms) as total_latency_ms,
    if(any(status = 'error'), 'error', 'ok') as status,
    groupArrayIf(error_message, error_message IS NOT NULL)[1] as failure_signature,
    min(timestamp) as started_at,
    max(timestamp) as ended_at
FROM tracelens.spans
GROUP BY trace_id, agent_type;
```

## Retention Policies

| Tier | Storage | Retention | Data |
|------|---------|-----------|------|
| Hot | ClickHouse SSD | 7 days | Full spans + replay data |
| Warm | ClickHouse HDD | 30 days | Aggregated traces + cost |
| Cold | S3 (Parquet) | 1 year | Compressed full traces |
