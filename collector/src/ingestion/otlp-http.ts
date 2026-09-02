import { Span, SpanBatch } from '../types';

export interface OtlpAttributeValue {
  stringValue?: string;
  intValue?: number | string;
  doubleValue?: number;
  boolValue?: boolean;
}

export interface OtlpAttribute {
  key: string;
  value: OtlpAttributeValue;
}

export interface OtlpSpan {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  name: string;
  startTimeUnixNano: string | number;
  endTimeUnixNano: string | number;
  attributes?: OtlpAttribute[];
  status?: {
    code?: number | string;
    message?: string;
  };
}

export interface OtlpScopeSpan {
  scope?: { name?: string; version?: string };
  spans?: OtlpSpan[];
}

export interface OtlpResourceSpan {
  resource?: {
    attributes?: OtlpAttribute[];
  };
  scopeSpans?: OtlpScopeSpan[];
}

export interface OtlpExportPayload {
  resourceSpans?: OtlpResourceSpan[];
}

function getAttrValue(attr?: OtlpAttributeValue): any {
  if (!attr) return null;
  if (attr.stringValue !== undefined) return attr.stringValue;
  if (attr.doubleValue !== undefined) return attr.doubleValue;
  if (attr.intValue !== undefined) return Number(attr.intValue);
  if (attr.boolValue !== undefined) return attr.boolValue;
  return null;
}

function extractAttrMap(attributes?: OtlpAttribute[]): Record<string, any> {
  const map: Record<string, any> = {};
  if (!attributes) return map;
  for (const attr of attributes) {
    map[attr.key] = getAttrValue(attr.value);
  }
  return map;
}

export function parseOtlpTracePayload(payload: OtlpExportPayload | null | undefined): SpanBatch[] {
  if (!payload || !Array.isArray(payload.resourceSpans)) {
    return [];
  }

  const batchesMap = new Map<string, Span[]>();

  for (const resSpan of payload.resourceSpans) {
    const resourceAttrs = extractAttrMap(resSpan.resource?.attributes);
    const serviceName = resourceAttrs['service.name'] || resourceAttrs['agent.type'] || 'otlp-agent';

    if (!Array.isArray(resSpan.scopeSpans)) continue;

    for (const scopeSpan of resSpan.scopeSpans) {
      if (!Array.isArray(scopeSpan.spans)) continue;

      for (const otlpSpan of scopeSpan.spans) {
        const traceId = otlpSpan.traceId || `otlp-${Date.now()}`;
        const spanAttrs = extractAttrMap(otlpSpan.attributes);

        const startNano = BigInt(otlpSpan.startTimeUnixNano || '0');
        const endNano = BigInt(otlpSpan.endTimeUnixNano || '0');
        const diffMs = endNano > startNano ? Number(endNano - startNano) / 1000000 : 0;

        const agentType = spanAttrs['agent.type'] || spanAttrs['agent_type'] || serviceName;
        const toolName = otlpSpan.name || spanAttrs['tool.name'] || 'llm_call';
        const llmModel = spanAttrs['llm.model'] || spanAttrs['gen_ai.request.model'] || spanAttrs['model'] || null;
        const inputTokens = Number(spanAttrs['llm.usage.prompt_tokens'] || spanAttrs['gen_ai.usage.input_tokens'] || spanAttrs['input_tokens']) || 0;
        const outputTokens = Number(spanAttrs['llm.usage.completion_tokens'] || spanAttrs['gen_ai.usage.output_tokens'] || spanAttrs['output_tokens']) || 0;
        const costUsd = Number(spanAttrs['llm.cost_usd'] || spanAttrs['cost_usd']) || 0;

        const statusCode = otlpSpan.status?.code;
        const isError = statusCode === 2 || statusCode === 'STATUS_CODE_ERROR' || statusCode === '2' || Boolean(otlpSpan.status?.message);

        const startTimeMs = Number(startNano / BigInt(1000000));
        const timestamp = startTimeMs > 0 ? new Date(startTimeMs).toISOString() : new Date().toISOString();

        const span: Span = {
          span_id: otlpSpan.spanId,
          parent_id: otlpSpan.parentSpanId || null,
          agent_type: String(agentType),
          tool_name: String(toolName),
          llm_model: llmModel ? String(llmModel) : null,
          input_tokens: inputTokens,
          output_tokens: outputTokens,
          latency_ms: Math.round(diffMs),
          status: isError ? 'error' : 'ok',
          error_message: otlpSpan.status?.message || null,
          cost_usd: costUsd,
          timestamp,
          attributes: {
            ...resourceAttrs,
            ...spanAttrs,
          },
        };

        const existing = batchesMap.get(traceId) || [];
        existing.push(span);
        batchesMap.set(traceId, existing);
      }
    }
  }

  const result: SpanBatch[] = [];
  for (const [trace_id, spans] of batchesMap.entries()) {
    result.push({ trace_id, spans });
  }

  return result;
}
