import { Span, TraceAnalysis, Anomaly, GuardLoopConfig } from '../types';
import { getClickHouseClient } from '../storage/clickhouse';
import { config } from '../config';
import { request } from 'undici';

export class TraceAnalyzer {
  async analyze(traceId: string): Promise<TraceAnalysis> {
    const ch = getClickHouseClient();

    const result = await ch.query({
      query: `SELECT * FROM spans WHERE trace_id = {trace_id: String} ORDER BY timestamp`,
      query_params: { trace_id: traceId },
      format: 'JSONEachRow',
    });

    const spans = await result.json<Span>();
    const anomalies: Anomaly[] = [];
    let failureSignature: string | null = null;

    // Latency anomaly detection
    const latencies = spans.map(s => s.latency_ms);
    const mean = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    const std = Math.sqrt(latencies.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / latencies.length);

    for (const span of spans) {
      if (span.latency_ms > mean + 3 * std) {
        anomalies.push({
          type: 'latency_spike',
          span_id: span.span_id,
          severity: 'high',
          description: `${span.agent_type} → ${span.tool_name} took ${span.latency_ms}ms (mean: ${Math.round(mean)}ms)`,
        });
      }

      if (span.status === 'error') {
        anomalies.push({
          type: 'failure',
          span_id: span.span_id,
          severity: 'critical',
          description: `${span.agent_type} → ${span.tool_name} failed: ${span.error_message || 'unknown error'}`,
        });

        failureSignature = `${span.agent_type} → ${span.tool_name} ${span.error_message || 'failure'}`;
      }

      if (span.cost_usd > 1.0) {
        anomalies.push({
          type: 'cost_spike',
          span_id: span.span_id,
          severity: 'medium',
          description: `${span.agent_type} cost $${span.cost_usd.toFixed(2)}`,
        });
      }
    }

    // GuardLoop correlation
    let guardloopScores: Record<string, number> | null = null;
    if (config.features.guardloopIntegration && config.guardloop.enabled) {
      guardloopScores = await this.queryGuardLoop(spans[0]?.agent_type || '');
    }

    return {
      trace_id: traceId,
      anomalies,
      failure_signature: failureSignature,
      guardloop_scores: guardloopScores,
    };
  }

  private async queryGuardLoop(agentType: string): Promise<Record<string, number> | null> {
    try {
      const glConfig = config.guardloop;
      const { statusCode, body } = await request(
        `${glConfig.endpoint}/scores?agent_type=${encodeURIComponent(agentType)}&window=${glConfig.correlation_window_minutes}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${glConfig.api_key}`,
            'Content-Type': 'application/json',
          },
          headersTimeout: glConfig.timeout_ms,
        }
      );

      if (statusCode !== 200) return null;

      const data = await body.json() as Record<string, number>;
      return data;
    } catch {
      return null;
    }
  }
}
