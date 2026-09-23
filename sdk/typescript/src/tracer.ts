import { SDKConfig, SpanConfig } from './types';
import { Span } from './span';
import { Batcher } from './batcher';

export class TraceLens {
  private config: SDKConfig;
  private batchers: Map<string, Batcher> = new Map();

  constructor(config: SDKConfig) {
    this.config = {
      bufferMs: 100,
      maxBatchSize: 100,
      ...config,
    };
  }

  startSpan(cfg: SpanConfig): Span {
    const span = new Span(cfg);
    let batcher = this.batchers.get(cfg.traceId);
    if (!batcher) {
      batcher = new Batcher(
        this.config.endpoint,
        this.config.apiKey,
        cfg.traceId,
        this.config.bufferMs,
        this.config.maxBatchSize
      );
      this.batchers.set(cfg.traceId, batcher);
    }

    const originalEnd = span.end.bind(span);
    span.end = (endCfg) => {
      const data = originalEnd(endCfg);
      batcher!.add(data);
      return data;
    };

    return span;
  }

  async flush(): Promise<void> {
    await Promise.all(Array.from(this.batchers.values()).map(b => b.stop()));
    this.batchers.clear();
  }
}
