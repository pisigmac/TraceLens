# SDK Guide

## TypeScript

```typescript
import { TraceLens } from '@tracelens/sdk';

const tl = new TraceLens({
  endpoint: 'http://localhost:8080',
  apiKey: process.env.TRACELENS_API_KEY,
  service: 'my-agent-service'
});

const span = tl.startSpan({
  traceId: 'trace-001',
  parentId: null,
  agent: 'cursor',
  task: 'refactor-auth'
});

span.setAttribute('llm.model', 'claude-3-5-sonnet');
span.setAttribute('llm.input_tokens', 4200);
span.setAttribute('llm.output_tokens', 890);
span.setAttribute('cost.usd', 0.12);
span.end({ status: 'ok' });
```

## Python

```python
from tracelens import TraceLens

tl = TraceLens(
    endpoint="http://localhost:8080",
    api_key=os.environ["TRACELENS_API_KEY"],
    service="my-agent-service"
)

span = tl.start_span(
    trace_id="trace-001",
    agent="cursor",
    task="refactor-auth"
)
span.set_attribute("llm.model", "claude-3-5-sonnet")
span.set_attribute("llm.input_tokens", 4200)
span.set_attribute("cost.usd", 0.12)
span.end(status="ok")
```

## Go

```go
import "github.com/tracelens/go-sdk"

tl := tracelens.New(tracelens.Config{
    Endpoint: "http://localhost:8080",
    APIKey:   os.Getenv("TRACELENS_API_KEY"),
    Service:  "my-agent-service",
})

span := tl.StartSpan(tracelens.SpanConfig{
    TraceID: "trace-001",
    Agent:   "cursor",
    Task:    "refactor-auth",
})
span.SetAttribute("llm.model", "claude-3-5-sonnet")
span.SetAttribute("cost.usd", 0.12)
span.End(tracelens.EndConfig{Status: "ok"})
```

## Rust

```rust
use tracelens::TraceLens;

let tl = TraceLens::new(Config {
    endpoint: "http://localhost:8080".to_string(),
    api_key: std::env::var("TRACELENS_API_KEY").unwrap(),
    service: "my-agent-service".to_string(),
})?;

let mut span = tl.start_span(StartSpanOpts {
    trace_id: "trace-001".to_string(),
    agent: "cursor".to_string(),
    task: "refactor-auth".to_string(),
});

span.set_attribute("llm.model", "claude-3-5-sonnet");
span.set_attribute("cost.usd", 0.12);
span.end(EndOpts { status: "ok".to_string() });
```

## Auto-Instrumentation

All SDKs support optional auto-instrumentation hooks:
- OpenAI client interceptor
- LangChain callback handler
- CrewAI wrapper
