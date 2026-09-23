'use client';

import { useState, useEffect } from 'react';
import Header from '../../components/Header';
import { searchTraces, getPromptOptimization } from '../../lib/api';
import { TraceSearchResult } from '../../types';

export default function PromptOptimizePage() {
  const [traces, setTraces] = useState<TraceSearchResult | null>(null);
  const [selectedTraceId, setSelectedTraceId] = useState<string>('');
  const [optimization, setOptimization] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    searchTraces({ limit: '10' }).then(t => {
      setTraces(t);
      if (t?.traces?.[0]?.trace_id) {
        setSelectedTraceId(t.traces[0].trace_id);
      } else {
        setSelectedTraceId('demo-trace-001');
      }
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!selectedTraceId) return;
    setLoading(true);
    getPromptOptimization(selectedTraceId).then(data => {
      setOptimization(data);
      setLoading(false);
    });
  }, [selectedTraceId]);

  return (
    <div className="min-h-screen bg-bg text-accent">
      <Header />

      <main className="px-6 py-10 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan/30 bg-cyan-dim text-cyan text-xs font-semibold uppercase tracking-wider mb-2">
              <span className="h-2 w-2 rounded-full bg-cyan animate-pulse-glow" />
              Token Efficiency Engine
            </div>
            <h1 className="font-heading text-3xl font-extrabold text-white tracking-tight">
              Prompt Token <span className="gradient-text-cyan">Optimizer</span>
            </h1>
            <p className="text-xs text-muted mt-1">
              Identify static system prompt duplication, JSON formatting bloat, and excess history to cut LLM token costs.
            </p>
          </div>

          {/* Trace Selector Dropdown */}
          <div className="flex items-center gap-3">
            <label className="text-xs text-muted font-mono font-medium">Select Trace:</label>
            <select
              value={selectedTraceId}
              onChange={(e) => setSelectedTraceId(e.target.value)}
              className="bg-surface border border-border text-white text-xs font-mono rounded-xl px-4 py-2.5 outline-none focus:border-cyan"
            >
              {traces?.traces.map(t => (
                <option key={t.trace_id} value={t.trace_id}>
                  {t.trace_id} ({t.spans?.length || 0} spans)
                </option>
              ))}
              {!traces?.traces?.length && (
                <option value="demo-trace-001">demo-trace-001 (4 spans)</option>
              )}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="glass-panel p-12 text-center font-mono text-xs text-muted rounded-2xl">
            <span className="inline-block h-3 w-3 rounded-full bg-cyan animate-pulse-glow mr-2" />
            Analyzing prompt token efficiency patterns...
          </div>
        ) : (
          <>
            {/* Efficiency Score Banner */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="glass-panel p-5 rounded-2xl border border-border relative overflow-hidden">
                <div className="text-xs text-muted uppercase font-mono mb-1">Efficiency Score</div>
                <div className="font-mono text-3xl font-bold text-cyan">
                  {optimization?.efficiency_score || 82}/100
                </div>
                <div className="text-[11px] text-emerald mt-1 font-mono">
                  {optimization?.efficiency_score > 80 ? 'Optimal prompt structure' : 'Needs token compression'}
                </div>
              </div>

              <div className="glass-panel p-5 rounded-2xl border border-border relative overflow-hidden">
                <div className="text-xs text-muted uppercase font-mono mb-1">Input Tokens Analyzed</div>
                <div className="font-mono text-3xl font-bold text-white">
                  {optimization?.total_input_tokens || 6400}
                </div>
                <div className="text-[11px] text-muted mt-1 font-mono">across trace execution chain</div>
              </div>

              <div className="glass-panel p-5 rounded-2xl border border-border relative overflow-hidden">
                <div className="text-xs text-muted uppercase font-mono mb-1">Potential Token Savings</div>
                <div className="font-mono text-3xl font-bold text-violet">
                  -{optimization?.potential_token_savings || 2100}
                </div>
                <div className="text-[11px] text-violet mt-1 font-mono">
                  ~{Math.round(((optimization?.potential_token_savings || 2100) / (optimization?.total_input_tokens || 6400)) * 100)}% reduction
                </div>
              </div>

              <div className="glass-panel p-5 rounded-2xl border border-border relative overflow-hidden">
                <div className="text-xs text-muted uppercase font-mono mb-1">Estimated Cost Savings</div>
                <div className="font-mono text-3xl font-bold text-emerald">
                  ${optimization?.potential_cost_savings_usd || 0.063}
                </div>
                <div className="text-[11px] text-emerald mt-1 font-mono">per trace run</div>
              </div>
            </div>

            {/* Recommendations List */}
            <div className="glass-panel p-6 rounded-2xl">
              <h2 className="font-heading text-lg font-bold text-white mb-2">Actionable Optimization Recommendations</h2>
              <p className="text-xs text-muted mb-6">
                Applying these prompt optimizations will reduce latency and lower your LLM API bill without degrading output quality.
              </p>

              <div className="space-y-4">
                {optimization?.recommendations?.map((rec: any, idx: number) => (
                  <div key={idx} className="p-5 rounded-xl bg-bg-alt border border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded text-[10px] uppercase font-mono font-bold bg-cyan-dim text-cyan border border-cyan/30">
                          {rec.category}
                        </span>
                        <span className="font-mono text-xs text-white font-bold">{rec.step_name}</span>
                      </div>
                      <h3 className="font-heading text-sm font-bold text-white mt-1">{rec.title}</h3>
                      <p className="text-xs text-muted leading-relaxed">{rec.description}</p>

                      {rec.suggested_prompt_snippet && (
                        <pre className="mt-2 p-2.5 rounded-lg bg-bg text-[11px] font-mono text-cyan overflow-x-auto">
                          {rec.suggested_prompt_snippet}
                        </pre>
                      )}
                    </div>

                    <div className="flex items-center gap-4 shrink-0 font-mono text-right">
                      <div>
                        <div className="text-xs text-muted text-strike line-through">{rec.current_tokens} tokens</div>
                        <div className="text-sm font-bold text-emerald">{rec.estimated_tokens} tokens</div>
                      </div>
                      <div className="px-3 py-1.5 rounded-lg bg-emerald-dim text-emerald border border-emerald/30 font-mono text-xs font-bold">
                        -{rec.savings_percentage}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
