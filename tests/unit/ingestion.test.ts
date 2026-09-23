import { validateSpanBatch, validateSpan } from '../../collector/src/ingestion/validator';

describe('Ingestion Validator', () => {
  test('validates correct batch', () => {
    const result = validateSpanBatch({
      trace_id: 'trace-001',
      spans: [{
        span_id: 'span-1',
        agent_type: 'cursor',
        tool_name: 'refactor',
        status: 'ok',
        timestamp: '2026-08-02T12:00:00Z',
      }],
    });
    expect(result.error).toBeUndefined();
    expect(result.value).toBeDefined();
  });

  test('rejects missing trace_id', () => {
    const result = validateSpanBatch({ spans: [] });
    expect(result.error).toContain('trace_id');
  });

  test('rejects empty spans array', () => {
    const result = validateSpanBatch({ trace_id: 't', spans: [] });
    expect(result.error).toContain('spans');
  });

  test('rejects invalid status', () => {
    const result = validateSpan({
      span_id: 's1',
      agent_type: 'cursor',
      tool_name: 't',
      status: 'invalid',
      timestamp: '2026-08-02T12:00:00Z',
    });
    expect(result.error).toContain('status');
  });

  test('rejects missing span_id', () => {
    const result = validateSpan({
      agent_type: 'cursor',
      tool_name: 't',
      status: 'ok',
      timestamp: '2026-08-02T12:00:00Z',
    });
    expect(result.error).toContain('span_id');
  });
});
