# Deployment

## Local Development

```bash
docker-compose up -d
```

Services:
- ClickHouse: port 8123
- Collector: port 8080 (HTTP), 50051 (gRPC)
- Dashboard: port 3000

## Kubernetes Production

```bash
kubectl apply -f collector/k8s/
```

Manifests:
- `deployment.yaml` — 3 replicas, resource limits
- `hpa.yaml` — scale 3-20 replicas based on CPU/memory
- `service.yaml` — ClusterIP + LoadBalancer
- `configmap.yaml` — non-sensitive config

## ClickHouse Cluster Setup

```sql
-- Single node (dev)
CREATE DATABASE IF NOT EXISTS tracelens;

-- Cluster (prod)
CREATE DATABASE IF NOT EXISTS tracelens ON CLUSTER 'tracelens_cluster';
```

See `docs/16-DB-SCHEMA.md` for full schema.

## Monitoring

- Prometheus metrics on `:9090/metrics`
- Grafana dashboard for collector health
- ClickHouse lag monitor
