import { getClickHouseClient } from '../storage/clickhouse';

export interface CostBreakdown {
  trace_id: string;
  total_cost: number;
  by_agent: Record<string, number>;
  by_tool: Record<string, number>;
  by_llm: Record<string, number>;
}

export class CostAttribution {
  async getTraceCost(traceId: string): Promise<CostBreakdown | null> {
    const ch = getClickHouseClient();
    const result = await ch.query({
      query: `
        SELECT
          agent_type,
          tool_name,
          llm_model,
          sum(cost_usd) as cost,
          sum(input_tokens) as input_tokens,
          sum(output_tokens) as output_tokens
        FROM cost_attribution
        WHERE trace_id = {trace_id: String}
        GROUP BY agent_type, tool_name, llm_model
      `,
      query_params: { trace_id: traceId },
      format: 'JSONEachRow',
    });

    const rows = await result.json<{
      agent_type: string;
      tool_name: string;
      llm_model: string | null;
      cost: string | number;
      input_tokens: number;
      output_tokens: number;
    }>();
    if (rows.length === 0) return null;

    const totalCost = rows.reduce((s, r) => s + parseFloat(String(r.cost)), 0);
    const byAgent: Record<string, number> = {};
    const byTool: Record<string, number> = {};
    const byLlm: Record<string, number> = {};

    for (const row of rows) {
      byAgent[row.agent_type] = (byAgent[row.agent_type] || 0) + parseFloat(String(row.cost));
      byTool[row.tool_name] = (byTool[row.tool_name] || 0) + parseFloat(String(row.cost));
      if (row.llm_model) {
        byLlm[row.llm_model] = (byLlm[row.llm_model] || 0) + parseFloat(String(row.cost));
      }
    }

    return { trace_id: traceId, total_cost: totalCost, by_agent: byAgent, by_tool: byTool, by_llm: byLlm };
  }

  async getWorkflowCost(agentType: string, days: number = 7): Promise<{ avg_cost: number; total_traces: number }> {
    const ch = getClickHouseClient();
    const result = await ch.query({
      query: `
        SELECT
          countDistinct(trace_id) as total_traces,
          sum(cost_usd) / countDistinct(trace_id) as avg_cost
        FROM cost_attribution
        WHERE agent_type = {agent_type: String}
          AND timestamp > now() - INTERVAL ${days} DAY
      `,
      query_params: { agent_type: agentType },
      format: 'JSONEachRow',
    });

    const rows = await result.json<{ avg_cost: string | number; total_traces: string | number }>();
    return { avg_cost: parseFloat(String(rows[0]?.avg_cost || '0')), total_traces: parseInt(String(rows[0]?.total_traces || '0')) };
  }
}
