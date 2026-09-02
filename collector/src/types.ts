export interface Span {
  span_id: string;
  parent_id: string | null;
  agent_type: string;
  tool_name: string;
  llm_model: string | null;
  input_tokens: number;
  output_tokens: number;
  latency_ms: number;
  status: 'ok' | 'error';
  error_message: string | null;
  cost_usd: number;
  timestamp: string;
  attributes?: Record<string, unknown> | null;
}

export interface SpanBatch {
  trace_id: string;
  spans: Span[];
}

export interface IngestResponse {
  ingested: number;
  trace_id: string;
}

export interface Trace {
  trace_id: string;
  spans: Span[];
  total_cost_usd: number;
  total_latency_ms: number;
  status: string;
}

export interface Anomaly {
  type: string;
  span_id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
}

export interface TraceAnalysis {
  trace_id: string;
  anomalies: Anomaly[];
  failure_signature: string | null;
  guardloop_scores: Record<string, number> | null;
}

export interface ReplayStep {
  step_index: number;
  span_id: string;
  agent_type: string;
  prompt: string | null;
  response: string | null;
  tool_output: string | null;
  decision: string | null;
  cost_usd: number;
  latency_ms: number;
}

export interface ReplayData {
  steps: ReplayStep[];
}

export interface Metrics {
  latency_p50: number;
  latency_p95: number;
  latency_p99: number;
  failure_rate: number;
  total_cost_usd: number;
  total_spans: number;
}

export interface AgentPerformance {
  agent_type: string;
  total_traces: number;
  avg_latency_ms: number;
  p99_latency_ms: number;
  failure_rate: number;
  avg_cost_per_trace: number;
  top_failure_signature: string | null;
}

export interface GuardLoopConfig {
  enabled: boolean;
  endpoint: string;
  api_key: string;
  timeout_ms: number;
  retry_count: number;
  score_fields: string[];
  correlation_window_minutes: number;
}
