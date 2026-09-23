# Pricing

## Model: Usage-Based

### Ingestion
- $0.50 per 1M spans ingested
- First 10M spans/month free

### Queries
- $0.10 per 1,000 query operations
- Dashboard queries counted separately from API queries

### Retention Tiers
- Hot (7d): included in ingestion price
- Warm (30d): $0.20 per GB/month
- Cold (S3, 1y): $0.05 per GB/month

## Example

Team ingesting 50M spans/month:
- Ingestion: 50M × $0.50/M = $25
- Queries: 500K × $0.10/K = $50
- Storage: 200GB warm × $0.20 = $40
- **Total: $115/month**

## Enterprise
- Custom contracts for >1B spans/month
- Dedicated ClickHouse cluster
- SSO + RBAC
- SOC 2 audit support
