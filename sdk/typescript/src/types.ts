export interface SpanConfig {
  traceId: string;
  parentId?: string | null;
  agent: string;
  task: string;
}

export interface EndConfig {
  status: 'ok' | 'error';
  errorMessage?: string;
}

export interface SDKConfig {
  endpoint: string;
  apiKey: string;
  service: string;
  bufferMs?: number;
  maxBatchSize?: number;
}

export interface SpanData {
  span_id: string;
  parent_id: string | null;
  agent_type: string;
  tool_name: string;
  llm_model: string | null;
  input_tokens: number;
  output_tokens: number;
  latency_ms: number;
  status: string;
  error_message: string | null;
  cost_usd: number;
  timestamp: string;
  attributes: Record<string, unknown>;
}
