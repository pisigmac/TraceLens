# Tests

## Unit Tests

```bash
cd collector
npm test
```

Coverage targets:
- Ingestion handlers: 95%
- Storage writer: 90%
- Auth middleware: 100%
- Cost attribution: 95%

## Integration Tests

```bash
docker-compose -f docker-compose.test.yml up --abort-on-container-exit
```

Tests:
- Full trace ingestion → query → replay pipeline
- JWT auth flow
- ClickHouse schema migration
- GuardLoop correlation fallback

## Load Tests

Target: 1M spans/minute sustained ingestion.

```bash
cd tests/load
k6 run ingest-load.js
```

Metrics:
- Collector p50 latency < 5ms
- Collector p99 latency < 50ms
- ClickHouse write lag < 2s
- Zero dropped spans at 1M/min

## Load Test Script (k6)

```javascript
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 1000 },
    { duration: '5m', target: 5000 },
    { duration: '10m', target: 17000 }, // ~1M spans/min
    { duration: '2m', target: 0 },
  ],
};

export default function () {
  const payload = JSON.stringify({
    trace_id: `trace-${__VU}-${__ITER}`,
    spans: Array.from({ length: 10 }, (_, i) => ({
      span_id: `span-${i}`,
      parent_id: i > 0 ? `span-${i-1}` : null,
      agent_type: 'cursor',
      tool_name: 'refactor-auth',
      llm_model: 'claude-3-5-sonnet',
      input_tokens: 4200,
      output_tokens: 890,
      latency_ms: 1200,
      status: 'ok',
      cost_usd: 0.12,
      timestamp: new Date().toISOString(),
    })),
  });

  const res = http.post('http://localhost:8080/v1/spans', payload, {
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer test-token' },
  });

  check(res, {
    'status is 201': (r) => r.status === 201,
    'p50 < 5ms': (r) => r.timings.waiting < 5,
  });
}
```
