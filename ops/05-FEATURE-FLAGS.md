# Feature Flags

## Flags

| Flag | Default | Description |
|------|---------|-------------|
| `replay_mode` | true | Enable replay engine |
| `cost_attribution` | true | Enable cost breakdown |
| `anomaly_detection` | true | Enable background analyzer |
| `guardloop_integration` | false | Enable GuardLoop correlation |
| `stripe_billing` | false | Enable usage-based billing |
| `advanced_viz` | false | Enable 3D trace graphs (experimental) |

## Implementation

Environment-based with override API:

```typescript
// collector/src/config/features.ts
const features = {
  replay_mode: process.env.FEATURE_REPLAY !== 'false',
  cost_attribution: process.env.FEATURE_COST_ATTRIBUTION !== 'false',
  anomaly_detection: process.env.FEATURE_ANOMALY_DETECTION !== 'false',
  guardloop_integration: process.env.FEATURE_GUARDLOOP === 'true',
};

export function isEnabled(flag: string): boolean {
  return features[flag] ?? false;
}
```

## Rollout Strategy

- Internal: 100% on staging
- Canary: 5% of production traffic
- GA: 100% after 48h stability
