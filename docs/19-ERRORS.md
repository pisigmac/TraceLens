# Error Codes

## HTTP Status Codes

| Code | Meaning | When |
|------|---------|------|
| 200 | OK | Successful GET/POST |
| 201 | Created | Span batch ingested |
| 400 | Bad Request | Invalid span schema |
| 401 | Unauthorized | Missing/invalid JWT |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Trace ID does not exist |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Collector/ClickHouse failure |
| 503 | Service Unavailable | ClickHouse unreachable |

## Error Body

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Ingestion rate limit of 100k spans/min exceeded for API key tk_xxx",
    "retry_after": 60,
    "docs": "https://docs.tracelens.io/errors/RATE_LIMIT_EXCEEDED"
  }
}
```

## Error Codes

- `INVALID_SPAN_SCHEMA` — Missing required field (span_id, agent_type, status)
- `TRACE_NOT_FOUND` — trace_id does not exist in storage
- `RATE_LIMIT_EXCEEDED` — Per-API-key ingestion limit hit
- `CLICKHOUSE_UNAVAILABLE` — Storage layer timeout
- `GUARDLOOP_TIMEOUT` — External GuardLoop API timeout (non-blocking)
- `REPLAY_DATA_EXPIRED` — Replay data past 7-day hot retention
- `ANALYSIS_FAILED` — Anomaly detection engine error
