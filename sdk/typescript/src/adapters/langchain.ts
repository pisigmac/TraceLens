import { TraceLens } from '../tracer';
import { Span } from '../span';

export interface LangChainRunInfo {
  runId: string;
  parentRunId?: string;
  name: string;
  serialized?: { name?: string; id?: string[] };
}

export class TraceLensLangChainHandler {
  private tracer: TraceLens;
  private activeSpans: Map<string, { span: Span; traceId: string }> = new Map();
  private defaultTraceId: string;
  private agentName: string;

  constructor(options: { tracer: TraceLens; traceId?: string; agentName?: string }) {
    this.tracer = options.tracer;
    this.defaultTraceId = options.traceId || `langchain-${Date.now()}`;
    this.agentName = options.agentName || 'langchain-agent';
  }

  // Handle Chain Execution Start
  handleChainStart(chain: { name?: string }, inputs: any, runId: string, parentRunId?: string): void {
    const traceId = this.defaultTraceId;
    const parentId = parentRunId ? this.activeSpans.get(parentRunId)?.span.data?.span_id || null : null;
    const taskName = chain.name || 'chain_execution';

    const span = this.tracer.startSpan({
      traceId,
      parentId,
      agent: this.agentName,
      task: taskName,
    });

    span.setAttributes({
      'inputs': inputs ? JSON.stringify(inputs).slice(0, 1000) : null,
      'framework': 'langchain',
    });

    this.activeSpans.set(runId, { span, traceId });
  }

  // Handle Chain Execution End
  handleChainEnd(outputs: any, runId: string): void {
    const item = this.activeSpans.get(runId);
    if (!item) return;

    item.span.setAttributes({
      'outputs': outputs ? JSON.stringify(outputs).slice(0, 1000) : null,
    });
    item.span.end({ status: 'ok' });
    this.activeSpans.delete(runId);
  }

  // Handle Chain Error
  handleChainError(err: Error, runId: string): void {
    const item = this.activeSpans.get(runId);
    if (!item) return;

    item.span.end({ status: 'error', errorMessage: err.message });
    this.activeSpans.delete(runId);
  }

  // Handle LLM Start
  handleLLMStart(llm: { name?: string }, prompts: string[], runId: string, parentRunId?: string): void {
    const traceId = this.defaultTraceId;
    const parentId = parentRunId ? this.activeSpans.get(parentRunId)?.span.data?.span_id || null : null;
    const modelName = llm.name || 'llm';

    const span = this.tracer.startSpan({
      traceId,
      parentId,
      agent: this.agentName,
      task: `llm_inference:${modelName}`,
    });

    span.setAttribute('llm.model', modelName);
    span.setAttribute('prompt', prompts.join('\n').slice(0, 1000));
    span.setAttribute('framework', 'langchain');

    this.activeSpans.set(runId, { span, traceId });
  }

  // Handle LLM End
  handleLLMEnd(output: any, runId: string): void {
    const item = this.activeSpans.get(runId);
    if (!item) return;

    const tokenUsage = output?.llmOutput?.tokenUsage || output?.llm_output?.token_usage;
    if (tokenUsage) {
      const promptTokens = tokenUsage.promptTokens || tokenUsage.prompt_tokens || 0;
      const completionTokens = tokenUsage.completionTokens || tokenUsage.completion_tokens || 0;
      item.span.setAttribute('llm.input_tokens', promptTokens);
      item.span.setAttribute('llm.output_tokens', completionTokens);

      // Estimate cost
      const cost = (promptTokens * 0.000003) + (completionTokens * 0.000015);
      item.span.setAttribute('cost.usd', parseFloat(cost.toFixed(6)));
    }

    const firstCompletion = output?.generations?.[0]?.[0]?.text;
    if (firstCompletion) {
      item.span.setAttribute('response', firstCompletion.slice(0, 1000));
    }

    item.span.end({ status: 'ok' });
    this.activeSpans.delete(runId);
  }

  // Handle LLM Error
  handleLLMError(err: Error, runId: string): void {
    const item = this.activeSpans.get(runId);
    if (!item) return;

    item.span.end({ status: 'error', errorMessage: err.message });
    this.activeSpans.delete(runId);
  }

  // Handle Tool Start
  handleToolStart(tool: { name?: string }, input: string, runId: string, parentRunId?: string): void {
    const traceId = this.defaultTraceId;
    const parentId = parentRunId ? this.activeSpans.get(parentRunId)?.span.data?.span_id || null : null;
    const toolName = tool.name || 'tool_execution';

    const span = this.tracer.startSpan({
      traceId,
      parentId,
      agent: this.agentName,
      task: toolName,
    });

    span.setAttribute('tool_input', input?.slice(0, 1000));
    span.setAttribute('framework', 'langchain');

    this.activeSpans.set(runId, { span, traceId });
  }

  // Handle Tool End
  handleToolEnd(output: string, runId: string): void {
    const item = this.activeSpans.get(runId);
    if (!item) return;

    item.span.setAttribute('tool_output', output?.slice(0, 1000));
    item.span.end({ status: 'ok' });
    this.activeSpans.delete(runId);
  }

  // Handle Tool Error
  handleToolError(err: Error, runId: string): void {
    const item = this.activeSpans.get(runId);
    if (!item) return;

    item.span.end({ status: 'error', errorMessage: err.message });
    this.activeSpans.delete(runId);
  }
}
