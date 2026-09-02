import { ReplayStep, Span } from '../types';
import { getClickHouseClient, insertReplayData, getReplayData } from '../storage/clickhouse';

export class ReplayEngine {
  async buildReplay(traceId: string): Promise<{ steps: ReplayStep[] } | null> {
    const ch = getClickHouseClient();
    const result = await ch.query({
      query: `SELECT * FROM spans WHERE trace_id = {trace_id: String} ORDER BY timestamp`,
      query_params: { trace_id: traceId },
      format: 'JSONEachRow',
    });

    const spans = await result.json<Span>();
    if (spans.length === 0) return null;

    const steps: ReplayStep[] = spans.map((span, idx) => ({
      step_index: idx,
      span_id: span.span_id,
      agent_type: span.agent_type,
      prompt: span.attributes && typeof span.attributes === 'object' ? (span.attributes as any).prompt || null : null,
      response: span.attributes && typeof span.attributes === 'object' ? (span.attributes as any).response || null : null,
      tool_output: span.attributes && typeof span.attributes === 'object' ? (span.attributes as any).tool_output || null : null,
      decision: span.attributes && typeof span.attributes === 'object' ? (span.attributes as any).decision || null : null,
      cost_usd: span.cost_usd,
      latency_ms: span.latency_ms,
    }));

    await insertReplayData(traceId, steps);
    return { steps };
  }

  async getReplay(traceId: string): Promise<{ steps: ReplayStep[] } | null> {
    const steps = await getReplayData(traceId);
    if (steps.length === 0) {
      // Build on demand if not cached
      return this.buildReplay(traceId);
    }
    return { steps };
  }
}
