import { validateSpanBatch, validateSpan } from '../../src/ingestion/validator';

const validSpan = {
  span_id: 'span-1',
  parent_id: null,
  agent_type: 'router',
  tool_name: 'llm_call',
  llm_model: 'gpt-4o-mini',
  input_tokens: 10,
  output_tokens: 5,
  latency_ms: 120,
  status: 'ok',
  error_message: null,
  cost_usd: 0.001,
  timestamp: '2026-08-22T10:00:00.000Z',
  attributes: { model: 'gpt-4o-mini' },
};

const validBatch = {
  trace_id: 'trace-1',
  spans: [validSpan],
};

describe('validateSpanBatch', () => {
  it('accepts a valid batch', () => {
    const result = validateSpanBatch(validBatch);
    expect(result.error).toBeUndefined();
    expect(result.value).toBeDefined();
    expect(result.value!.spans).toHaveLength(1);
  });

  it('rejects a batch missing trace_id', () => {
    const result = validateSpanBatch({ spans: [validSpan] });
    expect(result.error).toContain('trace_id');
  });

  it('rejects an empty spans array', () => {
    const result = validateSpanBatch({ trace_id: 'trace-1', spans: [] });
    expect(result.error).toContain('spans');
  });

  it('rejects a span with an invalid status', () => {
    const result = validateSpanBatch({
      trace_id: 'trace-1',
      spans: [{ ...validSpan, status: 'unknown' }],
    });
    expect(result.error).toContain('status');
  });

  it('rejects a span with a non-ISO timestamp', () => {
    const result = validateSpanBatch({
      trace_id: 'trace-1',
      spans: [{ ...validSpan, timestamp: 'not-a-date' }],
    });
    expect(result.error).toContain('timestamp');
  });

  it('strips unknown fields from spans', () => {
    const result = validateSpanBatch({
      trace_id: 'trace-1',
      spans: [{ ...validSpan, extra_field: 'should-be-removed' }],
    });
    expect(result.error).toBeUndefined();
    expect(result.value!.spans[0]).not.toHaveProperty('extra_field');
  });
});

describe('validateSpan', () => {
  it('accepts a valid span', () => {
    const result = validateSpan(validSpan);
    expect(result.error).toBeUndefined();
    expect(result.value).toBeDefined();
  });

  it('rejects a span missing required fields', () => {
    const result = validateSpan({ span_id: 'span-1' });
    expect(result.error).toContain('agent_type');
    expect(result.error).toContain('tool_name');
    expect(result.error).toContain('status');
    expect(result.error).toContain('timestamp');
  });
});
