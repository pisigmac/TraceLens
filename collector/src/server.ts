// TraceLens Collector Server v1.0.0 (Updated 2026-08-02)
import express from 'express';
import http from 'http';
import { config } from './config';
import routes from './routes';
import { startGrpcServer } from './ingestion/otlp-grpc';
import { TraceWebSocketServer } from './ingestion/websocket';
import { initSchema } from './storage/clickhouse';
import { collectDefaultMetrics } from 'prom-client';

const app = express();
app.use(express.json({ limit: '10mb' }));

// Routes
app.use(routes);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', version: '1.0.0' });
});

// Error handler
app.use((err: any, _req: any, res: any, _next: any) => {
  console.error(err);
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
});

async function main() {
  await initSchema();
  collectDefaultMetrics();

  const server = http.createServer(app);
  const wsServer = new TraceWebSocketServer(server);

  server.listen(config.collector.port, () => {
    console.log(`HTTP/WS collector listening on port ${config.collector.port} (WebSocket at /v1/stream)`);
  });

  startGrpcServer(config.collector.grpcPort);
}

main().catch(console.error);
