import { Span, SpanBatch } from '../types';
import { config } from '../config';

interface BufferedBatch {
  trace_id: string;
  spans: Span[];
  receivedAt: number;
}

export class SpanBuffer {
  private buffer: Map<string, BufferedBatch> = new Map();
  private flushTimer: NodeJS.Timeout | null = null;
  private onFlush: (batches: BufferedBatch[]) => Promise<void>;

  constructor(onFlush: (batches: BufferedBatch[]) => Promise<void>) {
    this.onFlush = onFlush;
    this.startFlushTimer();
  }

  add(batch: SpanBatch): void {
    const existing = this.buffer.get(batch.trace_id);
    if (existing) {
      existing.spans.push(...batch.spans);
    } else {
      this.buffer.set(batch.trace_id, {
        trace_id: batch.trace_id,
        spans: [...batch.spans],
        receivedAt: Date.now(),
      });
    }

    // Immediate flush if batch is large
    const totalSpans = Array.from(this.buffer.values()).reduce((sum, b) => sum + b.spans.length, 0);
    if (totalSpans >= config.collector.maxSpansPerBatch) {
      this.flush();
    }
  }

  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flush();
    }, config.collector.bufferMs);
  }

  private flush(): void {
    if (this.buffer.size === 0) return;
    const batches = Array.from(this.buffer.values());
    this.buffer.clear();
    this.onFlush(batches).catch(err => {
      console.error('Flush failed:', err);
    });
  }

  stop(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    this.flush();
  }
}
