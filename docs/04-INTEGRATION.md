# GuardLoop Integration

TraceLens correlates trace anomalies with GuardLoop quality scores to enrich failure analysis.

## Configuration

GuardLoop is configured as an external service. Update `GUARDLOOP_ENDPOINT` and `GUARDLOOP_API_KEY` in your environment.

```yaml
# config/guardloop.yaml
enabled: true
endpoint: https://guardloop.internal/api/v1
api_key: ${GUARDLOOP_API_KEY}
timeout_ms: 5000
retry_count: 3
score_fields:
  - code_quality
  - security_risk
  - test_coverage
correlation_window_minutes: 5
```

## How It Works

1. Trace Analyzer detects an anomalous trace (latency spike, failure, cost spike)
2. Analyzer queries GuardLoop for scores associated with the same workflow/agent in the last 5 minutes
3. GuardLoop scores are attached to trace metadata as `guardloop.code_quality`, `guardloop.security_risk`
4. Failure signatures include GuardLoop context: "Cursor → BrowserVerify timeout (security_risk: 0.87)"

## Schema Mapping

| TraceLens Field | GuardLoop Field | Type |
|-----------------|-----------------|------|
| `guardloop.code_quality` | `scores.code_quality` | Float64 |
| `guardloop.security_risk` | `scores.security_risk` | Float64 |
| `guardloop.test_coverage` | `scores.test_coverage` | Float64 |
| `guardloop.correlated_at` | `timestamp` | DateTime |

## Fallback

If GuardLoop is unreachable, traces are stored without enrichment. Alerts fire on collector health, not GuardLoop availability.
