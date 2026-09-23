# Events

## Event Types

### Anomaly Alerts

```json
{
  "event": "anomaly_detected",
  "trace_id": "trace-001",
  "severity": "high",
  "type": "latency_spike",
  "description": "BrowserVerify took 8.2s (p99: 1.2s)",
  "timestamp": "2026-08-02T12:00:00Z"
}
```

### Quota Warnings

```json
{
  "event": "quota_warning",
  "api_key": "tk_xxx",
  "tier": "pro",
  "usage_percent": 85,
  "reset_at": "2026-08-02T12:00:00Z"
}
```

### Webhook Payload

```json
{
  "event_type": "anomaly_detected",
  "payload": { ... },
  "signature": "sha256=..."
}
```

## Event Bus

Redis Pub/Sub for internal events.
Webhook dispatch for external notifications.
