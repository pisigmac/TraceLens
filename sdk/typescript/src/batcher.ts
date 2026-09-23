import { request, Dispatcher } from 'undici';
import { SpanData } from './types';

export class Batcher {
  private buffer: SpanData[] = [];
  private timer: NodeJS.Timeout;
  private traceId: string;
  private flushing = false;

  constructor(
    private endpoint: string,
    private apiKey: string,
    traceId: string,
    private windowMs: number = 100,
    private maxBatchSize: number = 100
  ) {
    this.traceId = traceId;
    this.timer = setInterval(() => this.flush(), this.windowMs);
  }

  add(span: SpanData): void {
    if (this.flushing) return;
    this.buffer.push(span);
    if (this.buffer.length >= this.maxBatchSize) {
      this.flush();
    }
  }

  private async flush(): Promise<void> {
    if (this.buffer.length === 0 || this.flushing) return;
    this.flushing = true;
    const batch = this.buffer.splice(0, this.buffer.length);

    try {
      const { statusCode } = await request(`${this.endpoint}/v1/spans`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ trace_id: this.traceId, spans: batch }),
      });

      if (statusCode !== 201) {
        console.error(`TraceLens ingest failed: ${statusCode}`);
      }
    } catch (err) {
      console.error('TraceLens flush error:', err);
    } finally {
      this.flushing = false;
    }
  }

  async stop(): Promise<void> {
    clearInterval(this.timer);
    await this.flush();
  }
}
