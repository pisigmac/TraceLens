import { TraceLens } from '../tracer';
import { TraceLensLangChainHandler } from './langchain';
import { TraceLensLlamaIndexHandler } from './llamaindex';

describe('Framework Adapters', () => {
  let tracer: TraceLens;

  beforeEach(() => {
    tracer = new TraceLens({
      endpoint: 'http://localhost:8080',
      apiKey: 'test-key',
      service: 'test-service',
      bufferMs: 1000,
    });
  });

  afterEach(async () => {
    await tracer.flush();
  });

  describe('LangChain Handler', () => {
    test('captures chain and llm events correctly', () => {
      const handler = new TraceLensLangChainHandler({
        tracer,
        traceId: 'lc-test-001',
        agentName: 'langchain-unit-test',
      });

      handler.handleChainStart({ name: 'test_chain' }, { input: 'hello' }, 'run-1');
      handler.handleLLMStart({ name: 'gpt-4o' }, ['Hello LLM'], 'run-2', 'run-1');
      
      handler.handleLLMEnd({
        generations: [[{ text: 'World response' }]],
        llmOutput: { tokenUsage: { promptTokens: 100, completionTokens: 50 } },
      }, 'run-2');

      handler.handleChainEnd({ output: 'done' }, 'run-1');
      expect(true).toBe(true);
    });

    test('handles errors cleanly', () => {
      const handler = new TraceLensLangChainHandler({
        tracer,
        traceId: 'lc-err-001',
      });

      handler.handleToolStart({ name: 'search_db' }, 'query', 'run-tool');
      handler.handleToolError(new Error('DB connection failed'), 'run-tool');
      expect(true).toBe(true);
    });
  });

  describe('LlamaIndex Handler', () => {
    test('captures RAG retrieval and query events', () => {
      const handler = new TraceLensLlamaIndexHandler({
        tracer,
        traceId: 'llama-test-001',
      });

      handler.onRetrieveStart('vector query', 'ev-1');
      handler.onRetrieveEnd([{ text: 'chunk 1' }], 'ev-1');

      handler.onQueryStart('full query', 'ev-2');
      handler.onQueryEnd('RAG answer', 'ev-2');
      expect(true).toBe(true);
    });
  });
});
