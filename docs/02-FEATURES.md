# Features

## 1. Distributed Tracing
- OTLP/gRPC and HTTP JSON ingestion
- 100ms in-memory buffering with automatic flush
- 100k spans/sec per collector node
- Horizontal scaling via Kubernetes HPA
- JWT authentication per API key

## 2. Trace Analysis
- Anomaly detection on latency spikes, cost spikes, failure cascades
- Failure signature generation: "Cursor → BrowserVerify timeout happened 23 times this week"
- GuardLoop score correlation (config-driven external integration)
- Webhook alerts to Slack/PagerDuty

## 3. Replay Engine
- Reconstruct exact agent state at any trace step
- Show prompt sent, response received, tool output, decision made
- Hot storage (7d) for full replay data
- Cold archive (S3, 1y) for compliance

## 4. Cost Attribution
- Per-trace, per-agent, per-workflow cost breakdown
- Accuracy to $0.001 per trace
- "This PR review workflow costs $2.40 on average"
- Weekly cost report emails

## 5. Alerting
- Anomaly alerts via webhook
- Quota warning events
- PagerDuty/Slack integration
- Configurable thresholds per agent type

## 6. Visualization
- Waterfall diagrams: LLM calls, tool calls, agent handoffs in distinct colors
- Token burn chart overlays cost on latency waterfall
- Failure heatmap: red dots on most-failed steps
- Replay mode: step through failed traces
- Dark mode default for trace viewer

## 7. Data Retention
- Hot tier: 7 days in ClickHouse (full spans + replay data)
- Warm tier: 30 days in ClickHouse (summarized + metadata)
- Cold tier: 1 year in S3 (compressed Parquet)
