import { SpanConfig, EndConfig, SpanData } from './types';
import { v4 as uuidv4 } from 'uuid';

export class Span {
  private config: SpanConfig;
  private attrs: Record<string, unknown> = {};
  private startTime: number;
  private ended = false;
  public data: SpanData | null = null;

  constructor(config: SpanConfig) {
    this.config = config;
    this.startTime = Date.now();
  }

  setAttribute(key: string, value: unknown): void {
    if (this.ended) return;
    this.attrs[key] = value;
  }

  setAttributes(attrs: Record<string, unknown>): void {
    if (this.ended) return;
    Object.assign(this.attrs, attrs);
  }

  end(config: EndConfig): SpanData {
    if (this.ended) {
      throw new Error('Span already ended');
    }
    this.ended = true;
    const latency = Date.now() - this.startTime;

    this.data = {
      span_id: uuidv4(),
      parent_id: this.config.parentId || null,
      agent_type: this.config.agent,
      tool_name: this.config.task,
      llm_model: (this.attrs['llm.model'] as string) || null,
      input_tokens: (this.attrs['llm.input_tokens'] as number) || 0,
      output_tokens: (this.attrs['llm.output_tokens'] as number) || 0,
      latency_ms: latency,
      status: config.status,
      error_message: config.errorMessage || null,
      cost_usd: (this.attrs['cost.usd'] as number) || 0,
      timestamp: new Date().toISOString(),
      attributes: this.attrs,
    };

    return this.data;
  }

  isEnded(): boolean {
    return this.ended;
  }
}
