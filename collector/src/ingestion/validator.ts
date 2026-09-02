import Joi from 'joi';
import { Span, SpanBatch } from '../types';

const spanSchema = Joi.object({
  span_id: Joi.string().required(),
  parent_id: Joi.string().allow(null).default(null),
  agent_type: Joi.string().required(),
  tool_name: Joi.string().required(),
  llm_model: Joi.string().allow(null).default(null),
  input_tokens: Joi.number().integer().min(0).default(0),
  output_tokens: Joi.number().integer().min(0).default(0),
  latency_ms: Joi.number().integer().min(0).default(0),
  status: Joi.string().valid('ok', 'error').required(),
  error_message: Joi.string().allow(null).default(null),
  cost_usd: Joi.number().min(0).default(0),
  timestamp: Joi.string().isoDate().required(),
  attributes: Joi.object().allow(null).default(null),
});

const batchSchema = Joi.object({
  trace_id: Joi.string().required(),
  spans: Joi.array().items(spanSchema).min(1).max(1000).required(),
});

export function validateSpanBatch(data: unknown): { error?: string; value?: SpanBatch } {
  const { error, value } = batchSchema.validate(data, { abortEarly: false, stripUnknown: true });
  if (error) {
    return { error: error.details.map(d => d.message).join('; ') };
  }
  return { value: value as SpanBatch };
}

export function validateSpan(data: unknown): { error?: string; value?: Span } {
  const { error, value } = spanSchema.validate(data, { abortEarly: false, stripUnknown: true });
  if (error) {
    return { error: error.details.map(d => d.message).join('; ') };
  }
  return { value: value as Span };
}
