import dotenv from 'dotenv';
import { GuardLoopConfig } from './types';

dotenv.config();

export const config = {
  collector: {
    port: parseInt(process.env.COLLECTOR_PORT || '8080'),
    grpcPort: parseInt(process.env.COLLECTOR_GRPC_PORT || '50051'),
    bufferMs: parseInt(process.env.COLLECTOR_BUFFER_MS || '100'),
    maxSpansPerBatch: parseInt(process.env.COLLECTOR_MAX_SPANS_PER_BATCH || '1000'),
    workers: parseInt(process.env.COLLECTOR_WORKERS || '4'),
  },
  clickhouse: {
    host: process.env.CLICKHOUSE_HOST || 'localhost',
    port: parseInt(process.env.CLICKHOUSE_PORT || '8123'),
    database: process.env.CLICKHOUSE_DB || 'tracelens',
    username: process.env.CLICKHOUSE_USER || 'default',
    password: process.env.CLICKHOUSE_PASSWORD || '',
    maxConcurrentQueries: parseInt(process.env.CLICKHOUSE_MAX_CONCURRENT_QUERIES || '100'),
  },
  auth: {
    jwtSecret: process.env.JWT_SECRET || 'dev-secret-do-not-use-in-production',
    jwtIssuer: process.env.JWT_ISSUER || 'tracelens',
    jwtAudience: process.env.JWT_AUDIENCE || 'tracelens-api',
  },
  guardloop: {
    enabled: process.env.GUARDLOOP_ENABLED === 'true',
    endpoint: process.env.GUARDLOOP_ENDPOINT || '',
    api_key: process.env.GUARDLOOP_API_KEY || '',
    timeout_ms: parseInt(process.env.GUARDLOOP_TIMEOUT_MS || '5000'),
    retry_count: parseInt(process.env.GUARDLOOP_RETRY_COUNT || '3'),
    score_fields: (process.env.GUARDLOOP_SCORE_FIELDS || 'code_quality,security_risk,test_coverage').split(','),
    correlation_window_minutes: parseInt(process.env.GUARDLOOP_CORRELATION_WINDOW_MINUTES || '5'),
  } as GuardLoopConfig,
  storage: {
    hotRetentionDays: parseInt(process.env.HOT_RETENTION_DAYS || '7'),
    warmRetentionDays: parseInt(process.env.WARM_RETENTION_DAYS || '30'),
    coldStorageBucket: process.env.COLD_STORAGE_BUCKET || '',
  },
  alerting: {
    enabled: process.env.ALERT_ENABLED === 'true',
    webhookUrl: process.env.ALERT_WEBHOOK_URL || '',
  },
  features: {
    replay: process.env.FEATURE_REPLAY !== 'false',
    costAttribution: process.env.FEATURE_COST_ATTRIBUTION !== 'false',
    anomalyDetection: process.env.FEATURE_ANOMALY_DETECTION !== 'false',
    guardloopIntegration: process.env.FEATURE_GUARDLOOP === 'true',
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  },
};
