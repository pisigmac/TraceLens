import { TraceLens } from './tracer';
import { Span } from './span';

describe('TraceLens SDK', () => {
  const tl = new TraceLens({
    endpoint: 'http://localhost:8080',
    apiKey: 'test-key',
    service: 'test-service',
  });

  test('creates and ends a span', () => {
    const span = tl.startSpan({ traceId: 'trace-001', agent: 'cursor', task: 'refactor' });
    span.setAttribute('llm.model', 'claude-3-5-sonnet');
    span.setAttribute('llm.input_tokens', 4200);
    span.setAttribute('cost.usd', 0.12);
    const data = span.end({ status: 'ok' });

    expect(data.agent_type).toBe('cursor');
    expect(data.tool_name).toBe('refactor');
    expect(data.llm_model).toBe('claude-3-5-sonnet');
    expect(data.input_tokens).toBe(4200);
    expect(data.cost_usd).toBe(0.12);
    expect(data.status).toBe('ok');
    expect(data.latency_ms).toBeGreaterThanOrEqual(0);
  });

  test('span cannot be ended twice', () => {
    const span = tl.startSpan({ traceId: 'trace-002', agent: 'browser', task: 'verify' });
    span.end({ status: 'ok' });
    expect(() => span.end({ status: 'ok' })).toThrow('Span already ended');
  });

  test('parent_id propagation', () => {
    const parent = tl.startSpan({ traceId: 'trace-003', agent: 'cursor', task: 'edit' });
    const parentData = parent.end({ status: 'ok' });

    const child = tl.startSpan({
      traceId: 'trace-003',
      parentId: parentData.span_id,
      agent: 'browser',
      task: 'verify',
    });
    const childData = child.end({ status: 'ok' });
    expect(childData.parent_id).toBe(parentData.span_id);
  });
});
