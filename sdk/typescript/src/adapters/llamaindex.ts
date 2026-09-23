import { TraceLens } from '../tracer';
import { Span } from '../span';

export class TraceLensLlamaIndexHandler {
  private tracer: TraceLens;
  private activeSpans: Map<string, { span: Span; traceId: string }> = new Map();
  private defaultTraceId: string;

  constructor(options: { tracer: TraceLens; traceId?: string }) {
    this.tracer = options.tracer;
    this.defaultTraceId = options.traceId || `llamaindex-${Date.now()}`;
  }

  onRetrieveStart(query: string, eventId: string): void {
    const span = this.tracer.startSpan({
      traceId: this.defaultTraceId,
      agent: 'llamaindex',
      task: 'vector_retrieval',
    });
    span.setAttribute('query', query);
    span.setAttribute('framework', 'llamaindex');
    this.activeSpans.set(eventId, { span, traceId: this.defaultTraceId });
  }

  onRetrieveEnd(nodes: any[], eventId: string): void {
    const item = this.activeSpans.get(eventId);
    if (!item) return;

    item.span.setAttribute('retrieved_chunks_count', nodes?.length || 0);
    item.span.end({ status: 'ok' });
    this.activeSpans.delete(eventId);
  }

  onQueryStart(query: string, eventId: string): void {
    const span = this.tracer.startSpan({
      traceId: this.defaultTraceId,
      agent: 'llamaindex',
      task: 'rag_query_execution',
    });
    span.setAttribute('query', query);
    span.setAttribute('framework', 'llamaindex');
    this.activeSpans.set(eventId, { span, traceId: this.defaultTraceId });
  }

  onQueryEnd(response: any, eventId: string): void {
    const item = this.activeSpans.get(eventId);
    if (!item) return;

    item.span.setAttribute('response', String(response).slice(0, 1000));
    item.span.end({ status: 'ok' });
    this.activeSpans.delete(eventId);
  }
}
