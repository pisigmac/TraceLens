import { SpanBuffer } from '../../collector/src/ingestion/buffer';

describe('SpanBuffer', () => {
  test('batches spans and flushes', (done) => {
    const flushed: any[] = [];
    const buffer = new SpanBuffer(async (batches) => {
      flushed.push(...batches);
    });

    buffer.add({ trace_id: 't1', spans: [{ span_id: 's1' } as any] });
    buffer.add({ trace_id: 't1', spans: [{ span_id: 's2' } as any] });

    setTimeout(() => {
      buffer.stop();
      expect(flushed.length).toBeGreaterThan(0);
      done();
    }, 200);
  });
});
