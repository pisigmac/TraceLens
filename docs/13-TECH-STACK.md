# Tech Stack

## Collector: Node.js + TypeScript

**Why Node.js:**
- Event-driven I/O matches burst pattern of agent traces
- Agents emit spans in spikes. Node.js handles I/O-bound ingestion better than Go for this pattern.
- Native gRPC support via `@grpc/grpc-js`
- Single-threaded event loop + worker threads for CPU-bound tasks (anomaly detection)

**Trade-offs:**
- CPU-intensive tasks offloaded to worker threads
- Cluster mode for multi-core utilization

## Storage: ClickHouse

**Why ClickHouse:**
- Columnar storage = 10x compression for trace data
- Time-series optimized: `MergeTree` engine with `toStartOfHour()` partitioning
- Sub-second aggregation on billions of rows
- Native support for nested structures (span attributes)

**Trade-offs:**
- Not ideal for high-frequency updates (immutable inserts only)
- Requires careful primary key design for trace queries

## Dashboard: Next.js 14 + D3.js

**Why Next.js 14:**
- App Router for server-side data fetching from ClickHouse
- React Server Components reduce client JS bundle
- API routes for custom aggregation endpoints

**Why D3.js (not Chart.js/Recharts):**
- Custom agent semantics require custom visual shapes
- Waterfall diagrams need precise control over x/y positioning
- Token burn overlay requires composite rendering

**Trade-offs:**
- Steeper learning curve than chart libraries
- Manual optimization for 200-span traces in <100ms

## SDKs

| Language | HTTP Client | Batching Strategy |
|----------|-------------|-------------------|
| TypeScript | fetch/undici | 100ms window or 100 spans |
| Python | httpx | Async batcher with asyncio |
| Go | net/http | Channel-based batcher |
| Rust | reqwest | Tokio runtime + mpsc channel |
