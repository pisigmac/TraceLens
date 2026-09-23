# TraceLens

Distributed tracing for AI agent workflows. Not APM. Not logging. Purpose-built for agent chains.

## What It Does

TraceLens shows you exactly where a 12-step agent chain broke, why it burned $4.20 in tokens, and which step was the bottleneck. It understands agents, tools, and LLM calls as first-class citizens.

## Quickstart

```bash
# Clone
git clone https://github.com/yourorg/tracelens.git
cd tracelens

# Start stack
docker-compose up -d

# Ingest a trace
curl -X POST http://localhost:8080/v1/spans \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "trace_id": "trace-001",
    "spans": [{
      "span_id": "span-1",
      "parent_id": null,
      "agent_type": "cursor",
      "tool_name": "refactor-auth",
      "llm_model": "claude-3-5-sonnet",
      "input_tokens": 4200,
      "output_tokens": 890,
      "latency_ms": 1200,
      "status": "ok",
      "cost_usd": 0.12
    }]
  }'

# View dashboard
open http://localhost:3000
```

## Architecture

- **Collector**: Node.js/TypeScript — OTLP/gRPC + HTTP JSON ingestion, 100k spans/sec/node
- **Storage**: ClickHouse — columnar, time-series optimized for agent trace queries
- **Query Engine**: ClickHouse + pre-built SQL templates
- **Analyzer**: Background anomaly detection, failure signatures, GuardLoop correlation
- **Replay Engine**: Full state reconstruction for any failed trace step
- **Dashboard**: Next.js 14 + D3.js — agent-aware waterfall, token burn, failure heatmap

## SDKs

- [TypeScript SDK](./sdk/typescript)
- [Python SDK](./sdk/python)
- [Go SDK](./sdk/go)
- [Rust SDK](./sdk/rust)

## License

MIT
