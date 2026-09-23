# Rate Limits

## Ingestion Limits

Per API key:
- **Free tier**: 10,000 spans/minute
- **Pro tier**: 100,000 spans/minute
- **Enterprise**: 1,000,000 spans/minute

## Query Limits

Per API key:
- **Free tier**: 100 queries/minute
- **Pro tier**: 1,000 queries/minute
- **Enterprise**: 10,000 queries/minute

## Implementation

Redis-backed token bucket algorithm:

```typescript
// collector/src/middleware/rate-limit.ts
const limiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: 'rl_ingest',
  points: 100000, // spans per minute
  duration: 60,
});

async function rateLimit(req, res, next) {
  const key = req.headers['x-api-key'];
  try {
    await limiter.consume(key, req.body.spans.length);
    next();
  } catch {
    res.status(429).json({ error: { code: 'RATE_LIMIT_EXCEEDED', retry_after: 60 } });
  }
}
```

## Headers

```
X-RateLimit-Limit: 100000
X-RateLimit-Remaining: 99923
X-RateLimit-Reset: 1699999999
```
