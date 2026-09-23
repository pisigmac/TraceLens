# Email

## Templates

### Weekly Cost Report

Subject: Your TraceLens Weekly Report — $142.50 spent

```
Hi {{name}},

This week your agents processed 2.4M spans.

Top costs:
- Cursor: $85.50 (60%)
- BrowserVerify: $42.75 (30%)
- LLM API: $14.25 (10%)

Top failure: Cursor → BrowserVerify timeout (23 times)

View dashboard: https://app.tracelens.io/agents/cursor
```

### Anomaly Alert

Subject: [ALERT] High latency detected on BrowserVerify

```
Anomaly detected:
- Agent: BrowserVerify
- Trace: trace-001
- Latency: 8.2s (p99: 1.2s)
- Time: 2026-08-02 12:00 UTC

View trace: https://app.tracelens.io/traces/trace-001
```

## Provider

SendGrid API for transactional emails.
