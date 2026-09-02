import { SpanBuffer } from '../../src/ingestion/buffer';

describe('SpanBuffer', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('buffers spans and flushes on timer', async () => {
    const flush = jest.fn().mockResolvedValue(undefined);
    const buffer = new SpanBuffer(flush);

    buffer.add({ trace_id: 'trace-1', spans: [{ span_id: 's1' } as any] });
    expect(flush).not.toHaveBeenCalled();

    jest.advanceTimersByTime(200);
    await Promise.resolve();

    expect(flush).toHaveBeenCalledTimes(1);
    const batches = flush.mock.calls[0][0];
    expect(batches).toHaveLength(1);
    expect(batches[0].spans).toHaveLength(1);

    buffer.stop();
  });

  it('merges spans for the same trace_id', async () => {
    const flush = jest.fn().mockResolvedValue(undefined);
    const buffer = new SpanBuffer(flush);

    buffer.add({ trace_id: 'trace-1', spans: [{ span_id: 's1' } as any] });
    buffer.add({ trace_id: 'trace-1', spans: [{ span_id: 's2' } as any] });

    jest.advanceTimersByTime(200);
    await Promise.resolve();

    const batches = flush.mock.calls[0][0];
    expect(batches).toHaveLength(1);
    expect(batches[0].spans).toHaveLength(2);

    buffer.stop();
  });

  it('flushes immediately when max batch size is reached', () => {
    const flush = jest.fn().mockResolvedValue(undefined);
    const buffer = new SpanBuffer(flush);

    // Default maxSpansPerBatch is 1000; add enough to trigger flush.
    for (let i = 0; i < 1000; i++) {
      buffer.add({ trace_id: `trace-${i}`, spans: [{ span_id: `s${i}` } as any] });
    }

    expect(flush).toHaveBeenCalledTimes(1);
    buffer.stop();
  });

  it('flushes remaining spans on stop', async () => {
    const flush = jest.fn().mockResolvedValue(undefined);
    const buffer = new SpanBuffer(flush);

    buffer.add({ trace_id: 'trace-1', spans: [{ span_id: 's1' } as any] });
    buffer.stop();

    expect(flush).toHaveBeenCalledTimes(1);
  });

  it('swallows flush errors to avoid crashing the collector', async () => {
    const flush = jest.fn().mockRejectedValue(new Error('downstream unavailable'));
    const buffer = new SpanBuffer(flush);

    buffer.add({ trace_id: 'trace-1', spans: [{ span_id: 's1' } as any] });
    buffer.stop();

    expect(flush).toHaveBeenCalledTimes(1);
  });
});
