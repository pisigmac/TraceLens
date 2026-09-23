# tracelens-sdk

Python client for [TraceLens](https://github.com/pisigmac/tracelens), a local tracing stack for AI agent runs.

The package name on PyPI is `tracelens-sdk`. The import name is `tracelens`. `tracelens` is already another project, and PyPI rejects `trace-lens` as too similar to it.

```bash
pip install tracelens-sdk
```

Requires Python 3.9+ and `httpx`.

A `TraceLens` client turns a unit of work into a span, batches completed spans, and posts them to a TraceLens collector at `POST /v1/spans`. The collector stores the batch in ClickHouse. The dashboard reads it back.

You bring the collector. This package does not start one. The repository `docker-compose.yml` runs ClickHouse, the collector on port `8080`, and the dashboard on port `43000`.

## Authentication

`api_key` is sent as `Authorization: Bearer <api_key>`. The collector treats that value as a JWT, not as an opaque string.

For the Compose stack the signing secret is `dev-secret-change-in-production`. The token must use HS256 and include `iss=tracelens` and `aud=tracelens-api`.

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
```

Use your own secret outside local Compose. Do not ship the development secret.

## Record spans

```python
import asyncio
from tracelens import TraceLens

tl = TraceLens(
    endpoint="http://localhost:8080",
    api_key=dev_token(),
    service="support-agent",
    buffer_ms=100,
    max_batch_size=100,
)

async def main():
    span = tl.start_span(
        trace_id="trace-001",
        agent="support-agent",
        task="draft-reply",
    )
    span.set_attribute("llm.model", "claude-3-5-sonnet")
    span.set_attribute("llm.input_tokens", 4200)
    span.set_attribute("llm.output_tokens", 890)
    span.set_attribute("cost.usd", 0.12)
    span.set_attribute("prompt", "Summarise the ticket")
    ended = span.end(status="ok")

    follow_up = tl.start_span(
        trace_id="trace-001",
        agent="support-agent",
        task="send-reply",
        parent_id=ended.span_id,
    )
    follow_up.end(status="error", error_message="smtp timeout")
    await tl.flush()

asyncio.run(main())
```

`start_span` returns a `Span` immediately. `end(status="ok")` or `end(status="error", error_message=...)` freezes the span, sets `latency_ms` from the wall clock, and queues it. Calling `end()` twice raises `RuntimeError`.

`await flush()` sends every queued batch and closes the HTTP client. Call it before the process exits. Spans left in the buffer are not delivered.

`service` is accepted on the client and is not written onto the span. Identity in the stored trace comes from `trace_id`, `agent`, and `task`.

`buffer_ms` is how long a batch waits before a flush when an event loop is already running. `max_batch_size` flushes early once that many spans are queued. The collector rejects a batch larger than 1000 spans.

## Fields the collector indexes

`end()` copies four attributes onto dedicated columns. Other attributes are stored on the span as JSON.

| `set_attribute` key | Stored column | Default |
|---|---|---|
| `llm.model` | `llm_model` | `null` |
| `llm.input_tokens` | `input_tokens` | `0` |
| `llm.output_tokens` | `output_tokens` | `0` |
| `cost.usd` | `cost_usd` | `0.0` |

`agent` is stored as `agent_type`. `task` is stored as `tool_name`. `status` must be `ok` or `error`.

Useful free-form attributes, if you want replay to show them, are `prompt`, `response`, `tool_output`, and `decision`. Replay reads those keys and ignores the rest.

## Parent spans

Pass the parent id yourself. The span id exists only after `end()`.

```python
parent = tl.start_span(trace_id="trace-001", agent="planner", task="plan")
parent_data = parent.end(status="ok")
child = tl.start_span(
    trace_id="trace-001",
    agent="planner",
    task="search",
    parent_id=parent_data.span_id,
)
```

## LangChain callback

`TraceLensLangChainHandler` implements the callback method names LangChain uses for chains, chat models, and tools: `on_chain_start`, `on_chain_end`, `on_chain_error`, `on_llm_start`, `on_llm_end`, `on_llm_error`, `on_tool_start`, `on_tool_end`, `on_tool_error`. It is not a subclass of LangChain's `BaseCallbackHandler`. Pass it where a callback object with those methods is accepted.

```python
from tracelens import TraceLens, TraceLensLangChainHandler

tl = TraceLens(endpoint="http://localhost:8080", api_key=dev_token(), service="support-agent")
handler = TraceLensLangChainHandler(tl, trace_id="trace-lc-001", agent_name="support-agent")
```

On `on_llm_end`, token counts are read from `response.llm_output["token_usage"]` (`prompt_tokens` and `completion_tokens`). Cost is then estimated as `$3 / 1M` input tokens and `$15 / 1M` output tokens. That estimate is not provider pricing. Prompts, outputs, and tool payloads are truncated to 1000 characters.

One handler shares a single `trace_id`. Create a new handler per run if each run should be its own trace.

## LlamaIndex helper

`TraceLensLlamaIndexHandler` is a small helper you call yourself. It is not a LlamaIndex `CallbackHandler` and it does not register with a callback manager.

```python
from tracelens import TraceLens, TraceLensLlamaIndexHandler

tl = TraceLens(endpoint="http://localhost:8080", api_key=dev_token(), service="rag")
rag = TraceLensLlamaIndexHandler(tl, trace_id="trace-rag-001")

rag.on_retrieve_start("quarterly revenue", event_id="ret-1")
rag.on_retrieve_end(nodes, event_id="ret-1")

rag.on_query_start("quarterly revenue", event_id="q-1")
rag.on_query_end(response, event_id="q-1")
await tl.flush()
```

`on_retrieve_end` records `retrieved_chunks_count`. `on_query_end` records `response`, truncated to 1000 characters.

## What the client does not do

- It does not create the collector, the database, or the dashboard.
- It does not retry a failed post. A non-201 response or a connection error is printed and the batch is dropped.
- It does not generate `trace_id`. You pass one per run.
- It does not read traces back. Search, replay, and metrics are collector routes. See the repository README.

## Development

From `sdk/python`, with `pytest` installed:

```bash
python3 -m pip install -e .
python3 -m pytest
python3 -m build
```

The package metadata lives in `pyproject.toml`. Tests live in `tests/` and are not part of the installed package.

## License

MIT. Copyright (c) 2026 pisigmac.
