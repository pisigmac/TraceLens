# Analytics

## Pre-Built Queries

### 1. Traces where BrowserVerify failed after Cursor edit

```sql
SELECT trace_id
FROM tracelens.spans
WHERE trace_id IN (
    SELECT trace_id FROM tracelens.spans
    WHERE agent_type = 'cursor' AND status = 'ok'
)
AND agent_type = 'browser_verify'
AND status = 'error'
AND timestamp > now() - INTERVAL 24 HOUR;
```

### 2. Agent with highest p99 latency this week

```sql
SELECT
    agent_type,
    quantileExact(0.99)(latency_ms) as p99_latency
FROM tracelens.spans
WHERE timestamp > now() - INTERVAL 7 DAY
GROUP BY agent_type
ORDER BY p99_latency DESC
LIMIT 1;
```

### 3. Cost breakdown by agent type (today)

```sql
SELECT
    agent_type,
    sum(cost_usd) as total_cost,
    sum(input_tokens) as total_input_tokens,
    sum(output_tokens) as total_output_tokens
FROM tracelens.spans
WHERE toStartOfDay(timestamp) = toStartOfDay(now())
GROUP BY agent_type
ORDER BY total_cost DESC;
```

### 4. Failure signature frequency (this week)

```sql
SELECT
    failure_signature,
    count() as occurrences,
    uniq(trace_id) as affected_traces
FROM tracelens.traces
WHERE status = 'error'
  AND started_at > now() - INTERVAL 7 DAY
GROUP BY failure_signature
ORDER BY occurrences DESC;
```

### 5. Token burn trend (hourly)

```sql
SELECT
    toStartOfHour(timestamp) as hour,
    sum(input_tokens + output_tokens) as total_tokens,
    sum(cost_usd) as total_cost
FROM tracelens.spans
WHERE timestamp > now() - INTERVAL 24 HOUR
GROUP BY hour
ORDER BY hour;
```

## Dashboard JSON Exports

Dashboard configurations are exportable as JSON for Grafana/Metabase import.
