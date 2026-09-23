# Payments

## Stripe Integration

Usage-based billing via Stripe Metered Billing.

### Products

- **Span Ingestion**: $0.50 per 1M spans
- **Query Operations**: $0.10 per 1K queries
- **Warm Storage**: $0.20 per GB/month
- **Cold Storage**: $0.05 per GB/month

### Webhook Handlers

```typescript
// collector/src/payments/stripe.ts
app.post('/webhooks/stripe', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);

  if (event.type === 'invoice.payment_failed') {
    await suspendApiKey(event.data.object.subscription);
  }
});
```

### Invoice Generation

Monthly aggregation per API key:
- Total spans ingested
- Total query operations
- Average storage GB

### Grace Period

72-hour grace period on payment failure before API key suspension.
