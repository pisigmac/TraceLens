# Launch Content

## Twitter/X Thread

1/ Introducing TraceLens — distributed tracing built for AI agent workflows. Not APM. Not logging. We show you exactly where your 12-step agent chain broke and why it cost $4.20.

2/ Problem: Generic tracing tools (Jaeger, Datadog) don't understand agents, LLM calls, or token costs. You get a waterfall of HTTP spans. Not helpful when Cursor times out after a BrowserVerify step.

3/ TraceLens schema is custom for agent semantics: agent_type, tool_name, llm_model, input_tokens, output_tokens, cost_usd. Every field answers: "Where did my agent chain break?"

4/ Cost Attribution: "This PR review workflow costs $2.40 on average. 60% Cursor, 30% BrowserVerify, 10% LLM API." Accurate to $0.001 per trace.

5/ Replay Engine: Step through a failed trace. See the prompt, the response, the tool output, and the decision at each step. Debug agent chains like you debug code.

6/ Built on ClickHouse for sub-second queries across millions of spans. Collector handles 100k spans/sec per node. Horizontal scaling via K8s.

7/ SDKs for TypeScript, Python, Go, and Rust. Auto-instrumentation for OpenAI, LangChain, and CrewAI.

8/ Open source. Production-grade. No MVP shortcuts. github.com/yourorg/tracelens

## LinkedIn Post

We built TraceLens because we were tired of generic tracing tools that couldn't tell us why our agent chains failed.

When Cursor times out after BrowserVerify, Jaeger shows you an HTTP span. TraceLens shows you the exact failure signature: "Cursor → BrowserVerify timeout happened 23 times this week."

With cost attribution accurate to $0.001 per trace and a replay engine that reconstructs exact agent state, TraceLens is the observability layer AI teams actually need.

Open source. Production-grade. Built for agent workflows.
