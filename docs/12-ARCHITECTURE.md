# Architecture

## System Design

```mermaid
graph TB
    subgraph "Agent Workflows"
        A1[TypeScript Agent]
        A2[Python Agent]
        A3[Go Agent]
        A4[Rust Agent]
    end

    subgraph "SDKs"
        S1[TS SDK]
        S2[Py SDK]
        S3[Go SDK]
        S4[Rust SDK]
    end

    subgraph "Collector Cluster"
        LB[Load Balancer]
        C1[Collector Node 1]
        C2[Collector Node 2]
        C3[Collector Node N]
        BUF[Memory Buffer 100ms]
    end

    subgraph "Storage"
        CH[ClickHouse Cluster]
        S3[Cold Storage S3]
    end

    subgraph "Analysis"
        AN[Trace Analyzer]
        GL[GuardLoop API]
        AL[Alert Webhook]
    end

    subgraph "Dashboard"
        NX[Next.js 14]
        D3[D3.js Visualizations]
    end

    A1 --> S1 --> LB
    A2 --> S2 --> LB
    A3 --> S3 --> LB
    A4 --> S4 --> LB
    LB --> C1 & C2 & C3
    C1 --> BUF --> CH
    C2 --> BUF --> CH
    C3 --> BUF --> CH
    CH --> AN
    AN --> GL
    AN --> AL
    CH --> NX
    NX --> D3
    CH --> S3
```

## Data Flow

1. Agent emits spans via SDK
2. SDK batches spans (100ms window or 100 spans)
3. Collector receives via OTLP/gRPC or HTTP JSON
4. Collector validates schema, enriches with metadata
5. Buffer flushes to ClickHouse every 100ms
6. Trace Analyzer runs background jobs on new traces
7. Dashboard queries ClickHouse via REST API
8. Cold data archived to S3 after 30 days

## Component Responsibilities

| Component | Language | Responsibility |
|-----------|----------|--------------|
| Collector | Node.js | Ingestion, buffering, auth, schema validation |
| ClickHouse | SQL | Storage, time-series queries, aggregations |
| Analyzer | Node.js | Anomaly detection, failure signatures, alerts |
| Dashboard | Next.js + D3 | Visualization, search, replay |
| SDKs | TS/Py/Go/Rust | Client-side span creation and batching |
