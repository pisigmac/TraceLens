# Code Map

```
tracelens/
├── docs/                    # 20 documentation files
├── ops/                     # 10 operational docs
├── collector/               # Node.js trace ingestion service
│   ├── src/
│   │   ├── index.ts         # Entry point
│   │   ├── server.ts        # HTTP/gRPC server setup
│   │   ├── config.ts        # Environment configuration
│   │   ├── ingestion/       # Span ingestion handlers
│   │   ├── storage/         # ClickHouse writer + schema
│   │   ├── auth/            # JWT validation
│   │   ├── analyzer/        # Anomaly detection + alerts
│   │   ├── cost/            # Cost attribution engine
│   │   └── replay/          # Replay data assembler
│   ├── package.json
│   ├── tsconfig.json
│   └── k8s/                 # Kubernetes manifests
├── dashboard/               # Next.js 14 visualization
│   ├── src/
│   │   ├── app/             # Next.js App Router pages
│   │   ├── components/      # D3.js visualizations + UI
│   │   ├── lib/             # API clients + D3 helpers
│   │   └── types/           # TypeScript types
│   ├── package.json
│   └── Dockerfile
├── sdk/
│   ├── typescript/          # TypeScript SDK
│   ├── python/              # Python SDK
│   ├── go/                  # Go SDK
│   └── rust/                # Rust SDK
├── api/
│   └── openapi.yaml         # OpenAPI 3.1 spec
├── tests/
│   ├── unit/                # Jest unit tests
│   ├── integration/         # API integration tests
│   └── load/                # k6 load tests (1M spans/min)
├── docker-compose.yml       # Local development stack
├── Makefile                 # Build automation
└── .env.example             # Environment template
```
