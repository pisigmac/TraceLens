import { parseOtlpTracePayload } from '../../src/ingestion/otlp-http';

describe('parseOtlpTracePayload', () => {
  const basePayload = {
    resourceSpans: [
      {
        resource: {
          attributes: [
            { key: 'service.name', value: { stringValue: 'test-service' } },
          ],
        },
        scopeSpans: [
          {
            scope: { name: 'test-scope' },
            spans: [
              {
                traceId: 'trace-1',
                spanId: 'span-1',
                parentSpanId: 'parent-1',
                name: 'llm_call',
                startTimeUnixNano: '1724323200000000000',
                endTimeUnixNano: '1724323200120000000',
                attributes: [
                  { key: 'llm.usage.prompt_tokens', value: { intValue: 10 } },
                  { key: 'llm.usage.completion_tokens', value: { intValue: 5 } },
                  { key: 'llm.model', value: { stringValue: 'gpt-4o' } },
                  { key: 'agent.type', value: { stringValue: 'router' } },
                ],
                status: { code: 1 },
              },
            ],
          },
        ],
      },
    ],
  };

  it('parses a valid OTLP payload into SpanBatches', () => {
    const batches = parseOtlpTracePayload(basePayload);
    expect(batches).toHaveLength(1);
    expect(batches[0].trace_id).toBe('trace-1');
    expect(batches[0].spans).toHaveLength(1);

    const span = batches[0].spans[0];
    expect(span.span_id).toBe('span-1');
    expect(span.parent_id).toBe('parent-1');
    expect(span.agent_type).toBe('router');
    expect(span.tool_name).toBe('llm_call');
    expect(span.llm_model).toBe('gpt-4o');
    expect(span.input_tokens).toBe(10);
    expect(span.output_tokens).toBe(5);
    expect(span.status).toBe('ok');
    expect(span.latency_ms).toBe(120);
  });

  it('marks spans as error when OTLP status code is ERROR', () => {
    const payload = JSON.parse(JSON.stringify(basePayload));
    payload.resourceSpans[0].scopeSpans[0].spans[0].status = { code: 2, message: 'timeout' };
    const batches = parseOtlpTracePayload(payload);
    expect(batches[0].spans[0].status).toBe('error');
    expect(batches[0].spans[0].error_message).toBe('timeout');
  });

  it('returns an empty array for missing resourceSpans', () => {
    expect(parseOtlpTracePayload({})).toEqual([]);
    expect(parseOtlpTracePayload(null)).toEqual([]);
    expect(parseOtlpTracePayload({ resourceSpans: [] })).toEqual([]);
  });

  it('uses service.name as agent_type fallback', () => {
    const payload = JSON.parse(JSON.stringify(basePayload));
    payload.resourceSpans[0].scopeSpans[0].spans[0].attributes = [];
    const batches = parseOtlpTracePayload(payload);
    expect(batches[0].spans[0].agent_type).toBe('test-service');
  });
});
