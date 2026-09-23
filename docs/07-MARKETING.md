# Marketing Positioning

## TraceLens vs. The Market

### vs. Jaeger / Zipkin
Jaeger is generic distributed tracing. It does not understand agents, LLM calls, or token costs. TraceLens schema is purpose-built for agent semantics.

### vs. Datadog APM
Datadog charges per host and per span. It has no concept of "agent handoff" or "LLM token burn." TraceLens cost attribution is accurate to $0.001 per trace.

### vs. New Relic
New Relic is slow for high-cardinality agent trace queries. TraceLens uses ClickHouse for sub-second queries across millions of spans.

### vs. ELK Stack
ELK is logging, not tracing. You cannot reconstruct a 12-step agent chain from logs. TraceLens Replay Engine shows exact state at each step.

## Unique Value Propositions

1. **Agent-Aware Schema**: LLM models, token counts, tool names, and agent types are first-class fields — not buried in tags.
2. **Cost Attribution**: Know exactly which agent burned $4.20 and why.
3. **Failure Signatures**: "This pattern happened 23 times this week" — not just one alert.
4. **Replay Engine**: Debug agent chains like debugging code — step through each decision.
5. **GuardLoop Integration**: Correlate trace failures with code quality scores.

## Target Personas

- **AI Platform Engineer**: Needs to know why agent chains fail at 2 AM.
- **Solo Founder**: Needs to control agent costs before they burn runway.
- **Enterprise AI Team**: Needs compliance, audit trails, and cost attribution across teams.
