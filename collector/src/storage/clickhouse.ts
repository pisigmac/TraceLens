import { createClient, ClickHouseClient } from '@clickhouse/client';
import { config } from '../config';
import { Span, Trace, ReplayStep } from '../types';

let client: ClickHouseClient | null = null;

export function getClickHouseClient(): ClickHouseClient {
  if (!client) {
    client = createClient({
      url: `http://${config.clickhouse.host}:${config.clickhouse.port}`,
      database: config.clickhouse.database,
      username: config.clickhouse.username,
      password: config.clickhouse.password,
      request_timeout: 30000,
      max_open_connections: 10,
    });
  }
  return client;
}

export async function initSchema(): Promise<void> {
  const ch = getClickHouseClient();

  await ch.exec({
    query: `
      CREATE DATABASE IF NOT EXISTS ${config.clickhouse.database}
      `,
  });

  await ch.exec({
    query: `
      CREATE TABLE IF NOT EXISTS ${config.clickhouse.database}.spans
      (
        trace_id LowCardinality(String),
        span_id String,
        parent_id Nullable(String),
        agent_type LowCardinality(String),
        tool_name LowCardinality(String),
        llm_model LowCardinality(Nullable(String)),
        input_tokens UInt32,
        output_tokens UInt32,
        latency_ms UInt32,
        status LowCardinality(String),
        error_message Nullable(String),
        cost_usd Decimal64(6),
        timestamp DateTime64(3),
        attributes String,
        guardloop_code_quality Nullable(Float64),
        guardloop_security_risk Nullable(Float64),
        guardloop_test_coverage Nullable(Float64),
        INDEX idx_trace_id trace_id TYPE bloom_filter GRANULARITY 3,
        INDEX idx_agent_type agent_type TYPE bloom_filter GRANULARITY 3,
        INDEX idx_status status TYPE bloom_filter GRANULARITY 3
      )
      ENGINE = MergeTree()
      PARTITION BY toStartOfDay(timestamp)
      ORDER BY (trace_id, timestamp, span_id)
      TTL toDateTime(timestamp) + INTERVAL ${config.storage.hotRetentionDays} DAY
      SETTINGS index_granularity = 8192
    `,
  });

  await ch.exec({
    query: `
      CREATE TABLE IF NOT EXISTS ${config.clickhouse.database}.traces
      (
        trace_id LowCardinality(String),
        agent_type LowCardinality(String),
        total_spans UInt16,
        total_cost_usd Decimal64(6),
        total_latency_ms UInt32,
        status LowCardinality(String),
        failure_signature Nullable(String),
        started_at DateTime64(3),
        ended_at DateTime64(3)
      )
      ENGINE = MergeTree()
      PARTITION BY toStartOfWeek(started_at)
      ORDER BY (trace_id, started_at)
      TTL toDateTime(started_at) + INTERVAL ${config.storage.warmRetentionDays} DAY
    `,
  });

  await ch.exec({
    query: `
      CREATE TABLE IF NOT EXISTS ${config.clickhouse.database}.replay_data
      (
        trace_id LowCardinality(String),
        span_id String,
        step_index UInt16,
        prompt Nullable(String),
        response Nullable(String),
        tool_output Nullable(String),
        decision Nullable(String),
        timestamp DateTime64(3)
      )
      ENGINE = MergeTree()
      PARTITION BY toStartOfDay(timestamp)
      ORDER BY (trace_id, step_index)
      TTL toDateTime(timestamp) + INTERVAL ${config.storage.hotRetentionDays} DAY
    `,
  });

  await ch.exec({
    query: `
      CREATE TABLE IF NOT EXISTS ${config.clickhouse.database}.failure_signatures
      (
        signature_hash String,
        signature_text String,
        agent_type LowCardinality(String),
        tool_name LowCardinality(String),
        count UInt32,
        first_seen DateTime64(3),
        last_seen DateTime64(3)
      )
      ENGINE = ReplacingMergeTree(last_seen)
      ORDER BY signature_hash
    `,
  });

  await ch.exec({
    query: `
      CREATE TABLE IF NOT EXISTS ${config.clickhouse.database}.cost_attribution
      (
        trace_id LowCardinality(String),
        agent_type LowCardinality(String),
        tool_name LowCardinality(String),
        llm_model LowCardinality(Nullable(String)),
        cost_usd Decimal64(6),
        input_tokens UInt32,
        output_tokens UInt32,
        timestamp DateTime64(3)
      )
      ENGINE = MergeTree()
      PARTITION BY toStartOfDay(timestamp)
      ORDER BY (trace_id, timestamp)
      TTL toDateTime(timestamp) + INTERVAL ${config.storage.warmRetentionDays} DAY
    `,
  });
}

function formatTimestamp(ts?: string | null): string {
  if (!ts) return new Date().toISOString().replace('T', ' ').replace('Z', '');
  const d = new Date(ts);
  if (isNaN(d.getTime())) return new Date().toISOString().replace('T', ' ').replace('Z', '');
  return d.toISOString().replace('T', ' ').replace('Z', '');
}

export async function insertSpans(batches: { trace_id: string; spans: Span[] }[]): Promise<number> {
  const ch = getClickHouseClient();
  let total = 0;

  const values = batches.flatMap(batch =>
    batch.spans.map(span => ({
      trace_id: batch.trace_id,
      span_id: span.span_id,
      parent_id: span.parent_id,
      agent_type: span.agent_type,
      tool_name: span.tool_name,
      llm_model: span.llm_model,
      input_tokens: span.input_tokens,
      output_tokens: span.output_tokens,
      latency_ms: span.latency_ms,
      status: span.status,
      error_message: span.error_message,
      cost_usd: span.cost_usd,
      timestamp: formatTimestamp(span.timestamp),
      attributes: span.attributes ? (typeof span.attributes === 'string' ? span.attributes : JSON.stringify(span.attributes)) : '{}',
    }))
  );

  if (values.length === 0) return 0;

  await ch.insert({
    table: 'spans',
    values,
    format: 'JSONEachRow',
    clickhouse_settings: {
      date_time_input_format: 'best_effort',
    },
  });

  total = values.length;

  // Also insert cost attribution
  const costValues = values.map(v => ({
    trace_id: v.trace_id,
    agent_type: v.agent_type,
    tool_name: v.tool_name,
    llm_model: v.llm_model,
    cost_usd: v.cost_usd,
    input_tokens: v.input_tokens,
    output_tokens: v.output_tokens,
    timestamp: v.timestamp,
  }));

  await ch.insert({
    table: 'cost_attribution',
    values: costValues,
    format: 'JSONEachRow',
    clickhouse_settings: {
      date_time_input_format: 'best_effort',
    },
  });

  return total;
}

export async function getTrace(traceId: string): Promise<Trace | null> {
  const ch = getClickHouseClient();
  const result = await ch.query({
    query: `
      SELECT * FROM spans WHERE trace_id = {trace_id: String} ORDER BY timestamp
    `,
    query_params: { trace_id: traceId },
    format: 'JSONEachRow',
  });

  const rows = await result.json<Span>();
  if (rows.length === 0) return null;

  rows.forEach(s => {
    if (typeof s.attributes === 'string') {
      try {
        s.attributes = JSON.parse(s.attributes);
      } catch {
        s.attributes = {};
      }
    }
    s.cost_usd = Number(s.cost_usd) || 0;
    s.latency_ms = Number(s.latency_ms) || 0;
    s.input_tokens = Number(s.input_tokens) || 0;
    s.output_tokens = Number(s.output_tokens) || 0;
  });

  const totalCost = rows.reduce((sum, s) => sum + (s.cost_usd || 0), 0);
  const totalLatency = Math.max(0, ...rows.map(s => s.latency_ms || 0));
  const hasError = rows.some(s => s.status === 'error');

  return {
    trace_id: traceId,
    spans: rows,
    total_cost_usd: totalCost,
    total_latency_ms: totalLatency,
    status: hasError ? 'error' : 'ok',
  };
}

export async function searchTraces(filters: {
  agent_type?: string;
  status?: string;
  from?: string;
  to?: string;
  min_cost?: number;
  limit?: number;
  offset?: number;
}): Promise<{ traces: Trace[]; total: number }> {
  const ch = getClickHouseClient();
  const limit = Math.max(1, Math.min(filters.limit || 50, 1000));
  const offset = Math.max(0, filters.offset || 0);
  const queryParams: Record<string, unknown> = {};

  let whereClauses = ['1=1'];
  if (filters.agent_type) {
    whereClauses.push('agent_type = {agent_type: String}');
    queryParams.agent_type = filters.agent_type;
  }
  if (filters.status) {
    whereClauses.push('status = {status: String}');
    queryParams.status = filters.status;
  }
  if (filters.from) {
    whereClauses.push('timestamp >= {from: String}');
    queryParams.from = formatTimestamp(filters.from);
  }
  if (filters.to) {
    whereClauses.push('timestamp <= {to: String}');
    queryParams.to = formatTimestamp(filters.to);
  }

  const countResult = await ch.query({
    query: `SELECT countDistinct(trace_id) as total FROM spans WHERE ${whereClauses.join(' AND ')}`,
    query_params: queryParams,
    format: 'JSONEachRow',
  });
  const countRows = await countResult.json<{ total: number }>();
  const total = Number(countRows[0]?.total) || 0;

  if (total === 0) {
    return { traces: [], total: 0 };
  }

  const traceIdsResult = await ch.query({
    query: `
      SELECT trace_id
      FROM spans
      WHERE ${whereClauses.join(' AND ')}
      GROUP BY trace_id
      ORDER BY max(timestamp) DESC
      LIMIT ${limit} OFFSET ${offset}
    `,
    query_params: queryParams,
    format: 'JSONEachRow',
  });
  const traceIdsRows = await traceIdsResult.json<{ trace_id: string }>();
  const traceIds = traceIdsRows.map(r => r.trace_id);

  if (traceIds.length === 0) {
    return { traces: [], total };
  }

  const spansResult = await ch.query({
    query: `
      SELECT * FROM spans
      WHERE trace_id IN {trace_ids: Array(String)}
      ORDER BY timestamp
    `,
    query_params: { trace_ids: traceIds },
    format: 'JSONEachRow',
  });
  const spansRows = await spansResult.json<Span & { trace_id: string }>();

  const traceMap = new Map<string, Span[]>();
  traceIds.forEach(id => traceMap.set(id, []));

  spansRows.forEach(s => {
    if (typeof s.attributes === 'string') {
      try {
        s.attributes = JSON.parse(s.attributes);
      } catch {
        s.attributes = {};
      }
    }
    s.cost_usd = Number(s.cost_usd) || 0;
    s.latency_ms = Number(s.latency_ms) || 0;

    const list = traceMap.get(s.trace_id);
    if (list) {
      list.push(s);
    }
  });

  const traces: Trace[] = traceIds.map(id => {
    const spans = traceMap.get(id) || [];
    return {
      trace_id: id,
      spans,
      total_cost_usd: spans.reduce((sum, sp) => sum + (sp.cost_usd || 0), 0),
      total_latency_ms: Math.max(0, ...spans.map(sp => sp.latency_ms || 0)),
      status: spans.some(sp => sp.status === 'error') ? 'error' : 'ok',
    };
  });

  return { traces, total };
}

export async function getMetrics(filters: {
  from?: string;
  to?: string;
  group_by?: string;
}): Promise<any> {
  const ch = getClickHouseClient();
  const queryParams: Record<string, unknown> = {};
  let whereClause = '1=1';
  if (filters.from) {
    whereClause += ' AND timestamp >= {from: String}';
    queryParams.from = formatTimestamp(filters.from);
  }
  if (filters.to) {
    whereClause += ' AND timestamp <= {to: String}';
    queryParams.to = formatTimestamp(filters.to);
  }

  const result = await ch.query({
    query: `
      SELECT
        quantileExact(0.50)(latency_ms) as latency_p50,
        quantileExact(0.95)(latency_ms) as latency_p95,
        quantileExact(0.99)(latency_ms) as latency_p99,
        countIf(status = 'error') / count() as failure_rate,
        sum(cost_usd) as total_cost_usd,
        count() as total_spans
      FROM spans
      WHERE ${whereClause}
    `,
    query_params: queryParams,
    format: 'JSONEachRow',
  });

  const rows = await result.json<Record<string, unknown>>();
  const raw = rows[0] || {};

  return {
    latency_p50: Number(raw.latency_p50) || 0,
    latency_p95: Number(raw.latency_p95) || 0,
    latency_p99: Number(raw.latency_p99) || 0,
    failure_rate: Number(raw.failure_rate) || 0,
    total_cost_usd: Number(raw.total_cost_usd) || 0,
    total_spans: Number(raw.total_spans) || 0,
  };
}

export async function getAgentPerformance(agentType: string): Promise<any> {
  const ch = getClickHouseClient();
  const result = await ch.query({
    query: `
      SELECT
        agent_type,
        countDistinct(trace_id) as total_traces,
        avg(latency_ms) as avg_latency_ms,
        quantileExact(0.99)(latency_ms) as p99_latency_ms,
        countIf(status = 'error') / count() as failure_rate,
        sum(cost_usd) / countDistinct(trace_id) as avg_cost_per_trace
      FROM spans
      WHERE agent_type = {agent_type: String}
        AND timestamp > now() - INTERVAL 7 DAY
      GROUP BY agent_type
    `,
    query_params: { agent_type: agentType },
    format: 'JSONEachRow',
  });

  const rows = await result.json<Record<string, unknown>>();
  if (!rows[0]) return null;
  const raw = rows[0];

  return {
    agent_type: agentType,
    total_traces: Number(raw.total_traces) || 0,
    avg_latency_ms: Number(raw.avg_latency_ms) || 0,
    p99_latency_ms: Number(raw.p99_latency_ms) || 0,
    failure_rate: Number(raw.failure_rate) || 0,
    avg_cost_per_trace: Number(raw.avg_cost_per_trace) || 0,
    top_failure_signature: null,
  };
}

export async function insertReplayData(traceId: string, steps: ReplayStep[]): Promise<void> {
  const ch = getClickHouseClient();
  const values = steps.map(step => ({
    trace_id: traceId,
    span_id: step.span_id,
    step_index: step.step_index,
    prompt: step.prompt,
    response: step.response,
    tool_output: step.tool_output,
    decision: step.decision,
    timestamp: formatTimestamp(new Date().toISOString()),
  }));

  await ch.insert({
    table: 'replay_data',
    values,
    format: 'JSONEachRow',
    clickhouse_settings: {
      date_time_input_format: 'best_effort',
    },
  });
}

export async function getReplayData(traceId: string): Promise<ReplayStep[]> {
  const ch = getClickHouseClient();
  const result = await ch.query({
    query: `
      SELECT * FROM replay_data
      WHERE trace_id = {trace_id: String}
      ORDER BY step_index
    `,
    query_params: { trace_id: traceId },
    format: 'JSONEachRow',
  });

  const rows = await result.json<any>();
  return rows.map((r: any) => ({
    step_index: Number(r.step_index) || 0,
    span_id: r.span_id,
    agent_type: r.agent_type || '',
    prompt: r.prompt || null,
    response: r.response || null,
    tool_output: r.tool_output || null,
    decision: r.decision || null,
    cost_usd: Number(r.cost_usd) || 0,
    latency_ms: Number(r.latency_ms) || 0,
  }));
}
