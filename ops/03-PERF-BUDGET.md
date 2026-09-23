# Performance Budget

## Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| Collector p50 | < 5ms | Span ingestion latency |
| Collector p99 | < 50ms | Span ingestion latency |
| Query p95 | < 500ms | Trace search |
| Query p99 | < 2000ms | Complex aggregation |
| Waterfall render | < 100ms | 200-span trace in dashboard |
| Anomaly detection | < 2min | Time from failure to alert |

## Monitoring

Prometheus metrics:
- `tracelens_collector_ingest_latency_seconds`
- `tracelens_collector_spans_ingested_total`
- `tracelens_query_duration_seconds`
- `tracelens_clickhouse_lag_seconds`

## Alerting

If p50 > 5ms for 5 minutes → PagerDuty
If p99 > 50ms for 2 minutes → Slack
If ClickHouse lag > 5s → PagerDuty
