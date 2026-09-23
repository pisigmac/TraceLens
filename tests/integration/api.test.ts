import request from 'supertest';
import express from 'express';
import routes from '../../collector/src/routes';

describe('API Integration', () => {
  let app: express.Express;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use(routes);
  });

  test('POST /v1/spans returns 401 without auth', async () => {
    const res = await request(app)
      .post('/v1/spans')
      .send({ trace_id: 't1', spans: [] });
    expect(res.status).toBe(401);
  });

  test('GET /health returns ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});
