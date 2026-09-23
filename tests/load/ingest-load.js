import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 1000 },
    { duration: '5m', target: 5000 },
    { duration: '10m', target: 17000 },
    { duration: '2m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(50)<5', 'p(99)<50'],
    http_req_failed: ['rate<0.001'],
  },
};

function generateSpans(count) {
  const spans = [];
  for (let i = 0; i < count; i++) {
    spans.push({
      span_id: `span-${__VU}-${__ITER}-${i}`,
      parent_id: i > 0 ? `span-${__VU}-${__ITER}-${i-1}` : null,
      agent_type: ['cursor', 'browser_verify', 'llm'][i % 3],
      tool_name: ['refactor', 'verify', 'generate'][i % 3],
      llm_model: i % 3 === 2 ? 'claude-3-5-sonnet' : null,
      input_tokens: 1000 + (i * 100),
      output_tokens: 500 + (i * 50),
      latency_ms: 500 + (i * 10),
      status: i % 20 === 0 ? 'error' : 'ok',
      error_message: i % 20 === 0 ? 'timeout' : null,
      cost_usd: 0.05 + (i * 0.01),
      timestamp: new Date().toISOString(),
    });
  }
  return spans;
}

export default function () {
  const payload = JSON.stringify({
    trace_id: `trace-${__VU}-${__ITER}`,
    spans: generateSpans(10),
  });

  const res = http.post('http://localhost:8080/v1/spans', payload, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer test-token',
    },
  });

  check(res, {
    'status is 201': (r) => r.status === 201,
    'p50 < 5ms': (r) => r.timings.waiting < 5,
    'p99 < 50ms': (r) => r.timings.waiting < 50,
  });

  sleep(0.01);
}
