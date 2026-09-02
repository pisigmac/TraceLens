import { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { insertSpans } from '../storage/clickhouse';
import { validateSpanBatch } from './validator';
import { SpanBatch } from '../types';

export class TraceWebSocketServer {
  private wss: WebSocketServer | null = null;
  private clients: Set<WebSocket> = new Set();

  constructor(server: HttpServer) {
    this.wss = new WebSocketServer({ server, path: '/v1/stream' });

    this.wss.on('connection', (ws: WebSocket) => {
      this.clients.add(ws);
      console.log(`[WebSocket] Client connected. Total active streams: ${this.clients.size}`);

      ws.on('message', async (data: Buffer | string) => {
        try {
          const payload = JSON.parse(data.toString());
          if (payload.type === 'ingest' && payload.batch) {
            const validation = validateSpanBatch(payload.batch);
            if (validation.value) {
              await insertSpans([validation.value]);
              this.broadcastSpanBatch(validation.value);
            }
          }
        } catch (err) {
          console.error('[WebSocket] Message parsing error:', err);
        }
      });

      ws.on('close', () => {
        this.clients.delete(ws);
        console.log(`[WebSocket] Client disconnected. Total active streams: ${this.clients.size}`);
      });

      ws.on('error', (err: Error) => {
        console.error('[WebSocket] Connection error:', err);
        this.clients.delete(ws);
      });
    });
  }

  broadcastSpanBatch(batch: SpanBatch): void {
    const message = JSON.stringify({ type: 'span_ingested', batch });
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    }
  }

  stop(): void {
    if (this.wss) {
      this.wss.close();
    }
  }
}
