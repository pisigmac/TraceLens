import request from 'supertest';
import express from 'express';
import routes from '../src/routes';
import { generateToken } from '../src/auth/jwt';

const mockInsert = jest.fn().mockResolvedValue(undefined);
const mockQuery = jest.fn().mockResolvedValue({ json: async () => [] });

jest.mock('@clickhouse/client', () => ({
  createClient: jest.fn(() => ({
    insert: mockInsert,
    query: mockQuery,
    exec: jest.fn().mockResolvedValue(undefined),
  })),
}));

const app = express();
app.use(express.json());
app.use(routes);

describe('Ingestion routes', () => {
  const token = generateToken({ sub: 'workspace-1', api_key: 'key-1', tier: 'metadata-only' });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects unauthenticated span ingestion', async () => {
    const res = await request(app).post('/v1/spans').send({ trace_id: 't1', spans: [] });
    expect(res.status).toBe(401);
  });

  it('rejects an invalid span batch', async () => {
    const res = await request(app)
      .post('/v1/spans')
      .set('Authorization', `Bearer ${token}`)
      .send({ trace_id: 't1', spans: [{ span_id: 's1' }] });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_SPAN_SCHEMA');
  });

  it('accepts a valid span batch', async () => {
    const span = {
      span_id: 's1',
      agent_type: 'router',
      tool_name: 'llm_call',
      status: 'ok',
      timestamp: '2026-08-22T10:00:00.000Z',
    };
    const res = await request(app)
      .post('/v1/spans')
      .set('Authorization', `Bearer ${token}`)
      .send({ trace_id: 't1', spans: [span] });
    expect(res.status).toBe(201);
    expect(res.body.ingested).toBe(1);
  });

  it('accepts a valid OTLP trace payload', async () => {
    const payload = {
      resourceSpans: [
        {
          resource: { attributes: [{ key: 'service.name', value: { stringValue: 'test' } }] },
          scopeSpans: [
            {
              spans: [
                {
                  traceId: 't1',
                  spanId: 's1',
                  name: 'call',
                  startTimeUnixNano: '1724323200000000000',
                  endTimeUnixNano: '1724323200100000000',
                  status: { code: 1 },
                },
              ],
            },
          ],
        },
      ],
    };
    const res = await request(app)
      .post('/v1/traces')
      .set('Authorization', `Bearer ${token}`)
      .send(payload);
    expect(res.status).toBe(201);
    expect(res.body.batches).toBe(1);
  });

  it('rejects an empty OTLP payload', async () => {
    const res = await request(app)
      .post('/v1/traces')
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_OTLP_PAYLOAD');
  });
});
