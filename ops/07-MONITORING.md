# Monitoring

## Collector Health

```yaml
# Prometheus scrape config
- job_name: 'tracelens-collector'
  static_configs:
    - targets: ['collector:9090']
  metrics_path: /metrics
```

Key metrics:
- `tracelens_collector_up` — binary health
- `tracelens_collector_ingest_latency_seconds` — p50/p95/p99
- `tracelens_collector_spans_ingested_total` — throughput
- `tracelens_collector_errors_total` — error rate by code

## ClickHouse Lag

```sql
SELECT
    max(now() - timestamp) as lag_seconds
FROM tracelens.spans;
```

Alert if lag > 5 seconds.

## Query Performance

```sql
SELECT
    query,
    duration_ms,
    read_rows
FROM system.query_log
WHERE event_time > now() - INTERVAL 5 MINUTE
ORDER BY duration_ms DESC
LIMIT 10;
```

## Dashboards

Grafana dashboards:
1. Collector Overview
2. ClickHouse Cluster Health
3. TraceLens Business Metrics (cost, spans, failures)
