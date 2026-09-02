import {
  insertSpans,
  getTrace,
  searchTraces,
  getMetrics,
} from '../../src/storage/clickhouse';

const mockInsert = jest.fn().mockResolvedValue(undefined);
const mockQuery = jest.fn();
const mockExec = jest.fn().mockResolvedValue(undefined);

jest.mock('@clickhouse/client', () => ({
  createClient: jest.fn(() => ({
    insert: mockInsert,
    query: mockQuery,
    exec: mockExec,
  })),
}));

describe('ClickHouse storage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const span = {
    span_id: 'span-1',
    parent_id: null,
    agent_type: 'router',
    tool_name: 'llm_call',
    llm_model: 'gpt-4o-mini',
    input_tokens: 10,
    output_tokens: 5,
    latency_ms: 120,
    status: 'ok' as const,
    error_message: null,
    cost_usd: 0.001,
    timestamp: '2026-08-22T10:00:00.000Z',
    attributes: { model: 'gpt-4o-mini' },
  };

  describe('insertSpans', () => {
    it('inserts spans and cost attribution', async () => {
      await insertSpans([{ trace_id: 'trace-1', spans: [span] }]);
      expect(mockInsert).toHaveBeenCalledTimes(2);

      const spansCall = mockInsert.mock.calls[0][0];
      expect(spansCall.table).toBe('spans');
      expect(spansCall.values).toHaveLength(1);
      expect(spansCall.values[0].span_id).toBe('span-1');
      expect(spansCall.values[0].attributes).toBe(JSON.stringify({ model: 'gpt-4o-mini' }));

      const costCall = mockInsert.mock.calls[1][0];
      expect(costCall.table).toBe('cost_attribution');
    });

    it('serializes string attributes as-is', async () => {
      await insertSpans([{ trace_id: 'trace-1', spans: [{ ...span, attributes: '{"raw": true}' as any }] }]);
      const spansCall = mockInsert.mock.calls[0][0];
      expect(spansCall.values[0].attributes).toBe('{"raw": true}');
    });
  });

  describe('getTrace', () => {
    it('uses a parameterized query for trace_id', async () => {
      mockQuery.mockResolvedValue({ json: async () => [] });
      await getTrace('trace-1');

      const call = mockQuery.mock.calls[0][0];
      expect(call.query).toContain('{trace_id: String}');
      expect(call.query_params).toEqual({ trace_id: 'trace-1' });
    });
  });

  describe('searchTraces', () => {
    it('parameterizes filter values instead of interpolating them', async () => {
      mockQuery.mockResolvedValueOnce({ json: async () => [{ total: 0 }] });

      const injectionAttempt = "router' OR '1'='1";
      await searchTraces({ agent_type: injectionAttempt, status: 'ok' });

      const countCall = mockQuery.mock.calls[0][0];
      expect(countCall.query).toContain('agent_type = {agent_type: String}');
      expect(countCall.query).not.toContain(injectionAttempt);
      expect(countCall.query_params).toEqual({ agent_type: injectionAttempt, status: 'ok' });
    });

    it('parameterizes trace_id list for IN clause', async () => {
      mockQuery
        .mockResolvedValueOnce({ json: async () => [{ total: 1 }] })
        .mockResolvedValueOnce({ json: async () => [{ trace_id: 'trace-1' }] })
        .mockResolvedValueOnce({ json: async () => [] });

      await searchTraces({ agent_type: 'router' });

      const spansCall = mockQuery.mock.calls[2][0];
      expect(spansCall.query).toContain('{trace_ids: Array(String)}');
      expect(spansCall.query_params).toEqual({ trace_ids: ['trace-1'] });
    });

    it('clamps limit to a safe range', async () => {
      mockQuery.mockResolvedValueOnce({ json: async () => [{ total: 0 }] });
      await searchTraces({ limit: 10000 });

      const idsCall = mockQuery.mock.calls[0][0];
      // Limit is interpolated as an integer after clamping; verify it is not 10000.
      expect(idsCall.query).not.toContain('10000');
    });
  });

  describe('getMetrics', () => {
    it('parameterizes date range filters', async () => {
      mockQuery.mockResolvedValue({ json: async () => [{}] });

      const injectionAttempt = "2026-01-01' OR '1'='1";
      await getMetrics({ from: injectionAttempt });

      const call = mockQuery.mock.calls[0][0];
      expect(call.query).toContain('timestamp >= {from: String}');
      expect(call.query).not.toContain(injectionAttempt);
      expect(call.query_params).toHaveProperty('from');
      expect(typeof call.query_params.from).toBe('string');
    });

    it('passes valid ISO timestamps through formatTimestamp', async () => {
      mockQuery.mockResolvedValue({ json: async () => [{}] });

      await getMetrics({ from: '2026-01-01T00:00:00.000Z' });

      const call = mockQuery.mock.calls[0][0];
      expect(call.query_params).toEqual({ from: '2026-01-01 00:00:00.000' });
    });
  });
});
