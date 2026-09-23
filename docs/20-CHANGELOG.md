# Changelog

## 1.0.0 — 2026-08-02

### Added
- Collector: OTLP/gRPC + HTTP JSON ingestion
- ClickHouse storage with hot/warm/cold tiers
- TypeScript, Python, Go, Rust SDKs
- Waterfall diagrams, token burn chart, failure heatmap
- Replay engine with full state reconstruction
- Cost attribution accurate to $0.001 per trace
- Anomaly detection with failure signatures
- GuardLoop integration (config-driven)
- JWT authentication
- Rate limiting per API key
- Kubernetes HPA deployment manifests
- 30 deliverables (20 docs + 10 ops)

### Metrics
- Collector: 1M spans/min ingestion, p50 < 5ms
- Dashboard: 200-span waterfall render < 100ms
- Anomaly detection: 95% failure flag within 2 minutes
