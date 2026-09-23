# Data Retention

## Tiering Strategy

### Hot Tier (ClickHouse SSD)
- **Retention**: 7 days
- **Data**: Full spans + replay data (prompts, responses)
- **Query**: Real-time, sub-second
- **Cost**: Highest

### Warm Tier (ClickHouse HDD)
- **Retention**: 30 days
- **Data**: Aggregated traces, cost attribution, failure signatures
- **Query**: Fast for aggregations, no replay
- **Cost**: Medium

### Cold Tier (S3 Parquet)
- **Retention**: 1 year
- **Data**: Compressed full traces
- **Query**: Batch retrieval only (~5 min)
- **Cost**: Lowest

## Automation

```sql
-- ClickHouse TTL handles hot → warm → cold automatically
ALTER TABLE tracelens.spans
MODIFY TTL
    timestamp + INTERVAL 7 DAY TO VOLUME 'warm',
    timestamp + INTERVAL 30 DAY TO VOLUME 'cold';
```

## S3 Archive

```bash
# Daily batch job archives expired warm data to S3
clickhouse-client --query "SELECT * FROM tracelens.spans WHERE timestamp < now() - INTERVAL 30 DAY FORMAT Parquet" > archive.parquet
aws s3 cp archive.parquet s3://tracelens-cold/$(date +%Y/%m/%d)/
```

## Compliance

GDPR/CCPA deletion requests: purge from all 3 tiers within 72 hours.
