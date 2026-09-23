# TraceLens

TraceLens records an AI agent run as a tree of spans: which agent ran, which tool or model it called, how long it took, how many tokens it used, what it cost, and whether it failed. A collector stores those spans in ClickHouse. A dashboard reads them back as traces, metrics, replay steps, and simple anomaly signals.

This repository is the local stack plus SDKs. The Python package name is `tracelens-sdk` (`import tracelens`). PyPI already has `tracelens`, and it treats `trace-lens` as the same name.

## What you can do with it

- Record a trace by hand, or from a LangChain-style callback.
- Send spans to `POST /v1/spans` in batches. OpenTelemetry HTTP traces can go to `POST /v1/traces`.
- Look up a trace, search recent traces, and read per-agent latency and cost.
- Replay the stored prompt, response, and tool output for a trace.
- Flag a span that failed, cost more than $1, or was far slower than the other spans in the same trace.

TraceLens does not replace a general APM product. It stores the agent fields above. It does not sample production traffic, manage users, or price tokens from a provider bill. LangChain cost figures are a fixed estimate, not an invoice.

## Stack

| Piece | What it is | Host port |
|---|---|---|
| Collector | Node.js HTTP API, OTLP/HTTP, OTLP/gRPC, WebSocket `/v1/stream` | `8080`, gRPC `50051` |
| Storage | ClickHouse (`tracelens` database) | `8123`, native `9000` |
| Dashboard | Next.js | `43000` |
| Python SDK | `sdk/python`, package name `tracelens-sdk` | — |
| Other SDKs | TypeScript (`sdk/typescript`), Go (`sdk/go`), Rust (`sdk/rust`) | — |

The dashboard talks to the collector at `http://localhost:8080`. In Compose that URL is set with `NEXT_PUBLIC_API_URL`.

## Run the stack

Docker and a JWT are required. Every collector route except `GET /health` and `GET /metrics` expects `Authorization: Bearer <jwt>`.

The development token is an HS256 JWT signed with the Compose secret `dev-secret-change-in-production`. Claims must include `iss=tracelens` and `aud=tracelens-api`. A random string will be rejected.

```bash
docker compose up -d --build
curl -s http://localhost:8080/health
```

Open the dashboard at [http://localhost:43000](http://localhost:43000). It mints its own development token in the browser with that same secret.

Mint a token for the SDK or for curl:

```python
import base64, hashlib, hmac, json, time

def dev_token(secret="dev-secret-change-in-production", ttl=86400):
    def b64(raw: bytes) -> str:
        return base64.urlsafe_b64encode(raw).rstrip(b"=").decode()

    header = b64(json.dumps({"alg": "HS256", "typ": "JWT"}, separators=(",", ":")).encode())
    payload = b64(json.dumps({
        "sub": "local-dev",
        "api_key": "local-dev",
        "tier": "dev",
        "iss": "tracelens",
        "aud": "tracelens-api",
        "iat": int(time.time()),
        "exp": int(time.time()) + ttl,
    }, separators=(",", ":")).encode())
    signing = f"{header}.{payload}".encode()
    sig = b64(hmac.new(secret.encode(), signing, hashlib.sha256).digest())
    return f"{header}.{payload}.{sig}"

print(dev_token())
```

ClickHouse in Compose uses database `tracelens`, user `default`, password `tracelens`. Change `JWT_SECRET` before any shared deployment. The dashboard currently has the development secret in its client code, so this Compose file is for local use.

## Record a trace

```bash
pip install tracelens-sdk
```

```python
import asyncio
from tracelens import TraceLens

tl = TraceLens(
    endpoint="http://localhost:8080",
    api_key=dev_token(),  # the helper above
    service="my-agent",
)

async def main():
    parent = tl.start_span(trace_id="trace-001", agent="planner", task="plan")
    parent.set_attribute("llm.model", "claude-3-5-sonnet")
    parent.set_attribute("llm.input_tokens", 1200)
    parent.set_attribute("llm.output_tokens", 300)
    parent.set_attribute("cost.usd", 0.04)
    parent_data = parent.end(status="ok")

    child = tl.start_span(
        trace_id="trace-001",
        agent="planner",
        task="search",
        parent_id=parent_data.span_id,
    )
    child.end(status="ok")
    await tl.flush()

asyncio.run(main())
```

`start_span` does not open a network call. `end()` measures latency and queues the span. `await flush()` posts the batch and closes the client. The same pattern is documented in [sdk/python/README.md](sdk/python/README.md), including the LangChain callback.

These attribute names are copied onto the span columns. Anything else stays in `attributes`.

| Attribute | Column |
|---|---|
| `llm.model` | `llm_model` |
| `llm.input_tokens` | `input_tokens` |
| `llm.output_tokens` | `output_tokens` |
| `cost.usd` | `cost_usd` |

`status` is `ok` or `error`. A second `end()` raises `RuntimeError`.

## HTTP API

All of these, except health and Prometheus, require the bearer JWT.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/health` | Liveness, no auth |
| `GET` | `/metrics` | Prometheus metrics, no auth |
| `POST` | `/v1/spans` | JSON batch: `{trace_id, spans[]}`. 201 when stored |
| `POST` | `/v1/traces` | OTLP/HTTP trace payload |
| `GET` | `/v1/traces/search` | Filter by agent, status, time, minimum cost |
| `GET` | `/v1/traces/:trace_id` | One trace and its spans |
| `GET` | `/v1/traces/:trace_id/replay` | Ordered prompt, response, and tool output |
| `POST` | `/v1/traces/analyze` | Latency, failure, and cost checks for one trace |
| `GET` | `/v1/metrics` | Aggregated product metrics |
| `GET` | `/v1/agents/:agent_type/performance` | One agent type |
| `GET` | `/v1/traces/:trace_id/optimize-prompts` | Prompt notes derived from the stored trace |
| `POST` | `/v1/analytics/ab-compare` | Compare two variant payloads |
| `GET`, `POST` | `/v1/remediation/rules` | In-memory remediation rules |
| `POST` | `/v1/remediation/trigger` | Run rules against one analysis |

A span batch accepts 1 to 1000 spans. Each span needs `span_id`, `agent_type`, `tool_name`, `status`, and an ISO-8601 `timestamp`. `parent_id` may be null.

## Dashboard

| Page | What it shows |
|---|---|
| `/` | Recent traces and summary metrics |
| `/traces` | Search |
| `/traces/[trace_id]` | One trace |
| `/live` | Live view |
| `/metrics` | Metrics |
| `/agents` | Agent performance |
| `/replay/[trace_id]` | Stored replay steps |
| `/optimize` | Prompt notes |
| `/ab-testing` | Variant comparison |
| `/remediation` | Rules and logs |

## Tests

```bash
cd sdk/python && python3 -m pytest
cd collector && npm test
```

## License

MIT. Copyright (c) 2026 pisigmac.
