# API Reference

## Authentication
All endpoints require a JWT Bearer token in the `Authorization` header.

## Endpoints

### POST /v1/spans
Ingest a batch of spans.

**Request:**
```json
{
  "trace_id": "string (uuid)",
  "spans": [
    {
      "span_id": "string",
      "parent_id": "string | null",
      "agent_type": "string",
      "tool_name": "string",
      "llm_model": "string | null",
      "input_tokens": "integer",
      "output_tokens": "integer",
      "latency_ms": "integer",
      "status": "ok | error",
      "error_message": "string | null",
      "cost_usd": "float",
      "timestamp": "ISO8601",
      "attributes": "object | null"
    }
  ]
}
```

**Response:** `201 Created`
```json
{ "ingested": 12, "trace_id": "trace-001" }
```

### GET /v1/traces/{trace_id}
Retrieve full trace with all spans.

**Response:** `200 OK`
```json
{
  "trace_id": "trace-001",
  "spans": [...],
  "total_cost_usd": 4.20,
  "total_latency_ms": 45000,
  "status": "error"
}
```

### GET /v1/traces/search
Query traces with filters.

**Query Parameters:**
- `agent_type` — filter by agent
- `status` — `ok` or `error`
- `from` — ISO8601 start time
- `to` — ISO8601 end time
- `min_cost` — minimum cost in USD
- `limit` — default 50, max 1000
- `offset` — default 0

**Response:** `200 OK`
```json
{
  "traces": [...],
  "total": 1420,
  "limit": 50,
  "offset": 0
}
```

### POST /v1/traces/analyze
Run anomaly detection on a trace.

**Request:** `{ "trace_id": "trace-001" }`

**Response:** `200 OK`
```json
{
  "trace_id": "trace-001",
  "anomalies": [
    {
      "type": "latency_spike",
      "span_id": "span-7",
      "severity": "high",
      "description": "BrowserVerify took 8.2s (p99: 1.2s)"
    }
  ],
  "failure_signature": "Cursor → BrowserVerify timeout",
  "guardloop_scores": { "security_risk": 0.87 }
}
```

### GET /v1/traces/{trace_id}/replay
Step-by-step replay data.

**Response:** `200 OK`
```json
{
  "steps": [
    {
      "step_index": 0,
      "span_id": "span-1",
      "agent_type": "cursor",
      "prompt": "Refactor the auth module...",
      "response": "Here's the refactored code...",
      "tool_output": null,
      "decision": "proceed",
      "cost_usd": 0.12,
      "latency_ms": 1200
    }
  ]
}
```

### GET /v1/metrics
Aggregated metrics.

**Query Parameters:**
- `from`, `to` — time range
- `group_by` — `agent_type`, `tool_name`, `llm_model`

**Response:** `200 OK`
```json
{
  "latency_p50": 450,
  "latency_p95": 3200,
  "latency_p99": 8900,
  "failure_rate": 0.03,
  "total_cost_usd": 1420.50,
  "total_spans": 4500000
}
```

### GET /v1/agents/{agent_type}/performance
Per-agent performance dashboard data.

**Response:** `200 OK`
```json
{
  "agent_type": "cursor",
  "total_traces": 12000,
  "avg_latency_ms": 1200,
  "p99_latency_ms": 8900,
  "failure_rate": 0.04,
  "avg_cost_per_trace": 2.40,
  "top_failure_signature": "Cursor → BrowserVerify timeout"
}
```
