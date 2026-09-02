import { Span } from '../types';

export interface PromptOptimizationResult {
  trace_id: string;
  total_input_tokens: number;
  potential_token_savings: number;
  potential_cost_savings_usd: number;
  efficiency_score: number; // 0 to 100
  recommendations: PromptRecommendation[];
}

export interface PromptRecommendation {
  span_id: string;
  step_name: string;
  category: 'system_prompt_caching' | 'json_minification' | 'whitespace_bloat' | 'redundant_history';
  title: string;
  description: string;
  current_tokens: number;
  estimated_tokens: number;
  savings_percentage: number;
  suggested_prompt_snippet?: string;
}

export class PromptOptimizer {
  analyzeTrace(trace_id: string, spans: Span[]): PromptOptimizationResult {
    let totalInputTokens = 0;
    let potentialSavingsTokens = 0;
    let potentialSavingsUsd = 0;
    const recommendations: PromptRecommendation[] = [];

    const systemPromptsSeen = new Map<string, string>(); // prompt -> first span_id

    for (const span of spans) {
      const inputTokens = Number(span.input_tokens) || 0;
      totalInputTokens += inputTokens;

      const attrs = span.attributes || {};
      const prompt = (attrs.prompt || attrs.inputs || '') as string;
      const costUsd = Number(span.cost_usd) || 0;

      if (!prompt || typeof prompt !== 'string' || prompt.length < 50) {
        continue;
      }

      // 1. System Prompt Duplication Check (Candidate for Anthropic/OpenAI Prompt Caching)
      const systemPromptMatch = prompt.match(/(?:system|instruction|context):\s*([\s\S]{100,})/i);
      const systemSnippet = systemPromptMatch ? systemPromptMatch[1].slice(0, 300) : prompt.slice(0, 300);

      if (systemPromptsSeen.has(systemSnippet)) {
        const firstSpanId = systemPromptsSeen.get(systemSnippet)!;
        const estimatedSavings = Math.round(inputTokens * 0.5); // 50% discount with prompt caching
        const costSavings = costUsd * 0.5;

        potentialSavingsTokens += estimatedSavings;
        potentialSavingsUsd += costSavings;

        recommendations.push({
          span_id: span.span_id,
          step_name: `${span.agent_type} / ${span.tool_name}`,
          category: 'system_prompt_caching',
          title: 'Enable Prompt Caching on System Prompt',
          description: `Identified identical system prompt repeated from span ${firstSpanId.slice(0, 8)}. Using prompt caching will reduce latency and cut input cost by 50%.`,
          current_tokens: inputTokens,
          estimated_tokens: inputTokens - estimatedSavings,
          savings_percentage: 50,
        });
      } else {
        systemPromptsSeen.set(systemSnippet, span.span_id);
      }

      // 2. JSON Whitespace & Pretty-Print Bloat Check
      if (prompt.includes('\n  ') || prompt.includes('\n    ')) {
        const minifiedLength = prompt.replace(/\n\s+/g, ' ').length;
        const originalLength = prompt.length;
        const reductionRatio = (originalLength - minifiedLength) / originalLength;

        if (reductionRatio > 0.15) {
          const estimatedSavings = Math.round(inputTokens * reductionRatio);
          const costSavings = costUsd * reductionRatio;

          potentialSavingsTokens += estimatedSavings;
          potentialSavingsUsd += costSavings;

          recommendations.push({
            span_id: span.span_id,
            step_name: `${span.agent_type} / ${span.tool_name}`,
            category: 'json_minification',
            title: 'Minify JSON / Whitespace Formatting',
            description: `Prompt contains ${Math.round(reductionRatio * 100)}% pretty-printed whitespace bloat. Minifying JSON payloads saves ~${estimatedSavings} tokens per call.`,
            current_tokens: inputTokens,
            estimated_tokens: inputTokens - estimatedSavings,
            savings_percentage: Math.round(reductionRatio * 100),
            suggested_prompt_snippet: prompt.replace(/\n\s+/g, ' ').slice(0, 200) + '...',
          });
        }
      }

      // 3. Excessively Large Context Window Check
      if (inputTokens > 4000 && (span.output_tokens || 0) < 200) {
        const estimatedSavings = Math.round(inputTokens * 0.3);
        const costSavings = costUsd * 0.3;

        potentialSavingsTokens += estimatedSavings;
        potentialSavingsUsd += costSavings;

        recommendations.push({
          span_id: span.span_id,
          step_name: `${span.agent_type} / ${span.tool_name}`,
          category: 'redundant_history',
          title: 'Truncate Low-Relevance Conversation History',
          description: `Input context is ${inputTokens} tokens but output is only ${span.output_tokens || 0} tokens. Consider summarizing past turns or using RAG chunk filtering.`,
          current_tokens: inputTokens,
          estimated_tokens: inputTokens - estimatedSavings,
          savings_percentage: 30,
        });
      }
    }

    const efficiencyScore = totalInputTokens > 0
      ? Math.max(10, Math.min(100, Math.round(100 - (potentialSavingsTokens / totalInputTokens) * 100)))
      : 100;

    return {
      trace_id,
      total_input_tokens: totalInputTokens,
      potential_token_savings: potentialSavingsTokens,
      potential_cost_savings_usd: parseFloat(potentialSavingsUsd.toFixed(4)),
      efficiency_score: efficiencyScore,
      recommendations,
    };
  }
}
