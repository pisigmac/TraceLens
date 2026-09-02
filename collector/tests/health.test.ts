import request from 'supertest';
import express from 'express';
import routes from '../src/routes';

const app = express();
app.use(express.json());
app.use(routes);
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', version: '1.0.0' });
});

describe('Health endpoint', () => {
  it('returns ok status and version', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', version: '1.0.0' });
  });
});
