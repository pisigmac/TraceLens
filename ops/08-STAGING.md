# Staging Parity Checklist

## Infrastructure

- [ ] Same ClickHouse version as production
- [ ] Same Node.js version as production
- [ ] Same K8s HPA configuration (scaled down replicas)
- [ ] Same Redis version for rate limiting
- [ ] Same JWT secret rotation policy

## Data

- [ ] Synthetic trace data (1M spans) loaded
- [ ] GuardLoop mock server responding
- [ ] Stripe test mode enabled

## Tests

- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Load test at 10% of production target (100K spans/min)
- [ ] Failover test: kill one ClickHouse replica

## Sign-Off

- [ ] Performance budget met
- [ ] No P0/P1 bugs open
- [ ] Security scan clean
- [ ] Rollback plan documented
