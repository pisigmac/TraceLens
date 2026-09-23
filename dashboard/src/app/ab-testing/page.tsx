'use client';

import { useState, useEffect } from 'react';
import Header from '../../components/Header';
import { compareABVariants } from '../../lib/api';

export default function ABTestingPage() {
  const [modelA, setModelA] = useState('claude-3-5-sonnet');
  const [modelB, setModelB] = useState('gpt-4o');
  const [comparison, setComparison] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadComparison = () => {
    setLoading(true);
    compareABVariants(
      { llm_model: modelA, label: `Variant A (${modelA})` },
      { llm_model: modelB, label: `Variant B (${modelB})` }
    ).then(data => {
      setComparison(data);
      setLoading(false);
    });
  };

  useEffect(() => {
    loadComparison();
  }, [modelA, modelB]);

  return (
    <div className="min-h-screen bg-bg text-accent">
      <Header />

      <main className="px-6 py-10 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo/30 bg-indigo-dim text-indigo text-xs font-semibold uppercase tracking-wider mb-2">
              <span className="h-2 w-2 rounded-full bg-indigo animate-pulse-glow" />
              Agent Benchmarking Suite
            </div>
            <h1 className="font-heading text-3xl font-extrabold text-white tracking-tight">
              Agent A/B <span className="gradient-text-indigo">Testing & Benchmarks</span>
            </h1>
            <p className="text-xs text-muted mt-1">
              Compare latency percentiles, cost attribution, and reliability across prompt versions and LLM model variants.
            </p>
          </div>

          {/* Variant Selector Controls */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-surface p-1.5 rounded-xl border border-border">
              <select
                value={modelA}
                onChange={e => setModelA(e.target.value)}
                className="bg-bg border border-border text-cyan text-xs font-mono rounded-lg px-3 py-1.5 outline-none"
              >
                <option value="claude-3-5-sonnet">Claude 3.5 Sonnet</option>
                <option value="gpt-4o">GPT-4o</option>
                <option value="claude-3-haiku">Claude 3 Haiku</option>
              </select>
              <span className="text-xs font-bold text-muted px-1">VS</span>
              <select
                value={modelB}
                onChange={e => setModelB(e.target.value)}
                className="bg-bg border border-border text-violet text-xs font-mono rounded-lg px-3 py-1.5 outline-none"
              >
                <option value="gpt-4o">GPT-4o</option>
                <option value="claude-3-5-sonnet">Claude 3.5 Sonnet</option>
                <option value="gpt-4o-mini">GPT-4o Mini</option>
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="glass-panel p-12 text-center font-mono text-xs text-muted rounded-2xl">
            <span className="inline-block h-3 w-3 rounded-full bg-indigo animate-pulse-glow mr-2" />
            Computing statistical A/B performance metrics...
          </div>
        ) : (
          <>
            {/* Winner Banner */}
            <div className="glass-panel p-6 rounded-2xl mb-8 border border-cyan/40 bg-cyan-dim/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-cyan text-bg flex items-center justify-center font-heading font-extrabold text-xl shrink-0 shadow-glow">
                  🏆
                </div>
                <div>
                  <div className="text-xs font-bold text-cyan uppercase tracking-wider">Benchmark Winner</div>
                  <h2 className="font-heading text-xl font-bold text-white mt-0.5">
                    {comparison?.winner === 'variant_a' ? comparison?.variant_a?.label : comparison?.variant_b?.label}
                  </h2>
                  <div className="text-xs text-muted mt-0.5">
                    Statistical confidence score: <span className="text-cyan font-mono font-bold">{comparison?.confidence_score}%</span>
                  </div>
                </div>
              </div>

              <div className="space-y-1 text-xs font-mono text-slate-300">
                {comparison?.key_takeaways?.map((t: string, i: number) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-cyan">✓</span>
                    <span>{t}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Side by Side Metric Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* Variant A Card */}
              <div className="glass-panel p-6 rounded-2xl border border-cyan/30 relative">
                <div className="flex items-center justify-between mb-4">
                  <span className="px-3 py-1 rounded-full bg-cyan-dim text-cyan border border-cyan/40 text-xs font-mono font-bold">
                    Variant A
                  </span>
                  <span className="text-xs font-mono text-muted">{comparison?.variant_a?.sample_count} trace samples</span>
                </div>
                <h3 className="font-heading text-lg font-bold text-white mb-6">{comparison?.variant_a?.label}</h3>

                <div className="grid grid-cols-2 gap-4 font-mono">
                  <div className="p-3.5 rounded-xl bg-bg-alt border border-border">
                    <div className="text-[11px] text-muted uppercase">p95 Latency</div>
                    <div className="text-2xl font-bold text-cyan mt-1">{comparison?.variant_a?.p95_latency_ms}ms</div>
                    <div className="text-[10px] text-muted mt-0.5">p50: {comparison?.variant_a?.p50_latency_ms}ms</div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-bg-alt border border-border">
                    <div className="text-[11px] text-muted uppercase">Avg Cost / Run</div>
                    <div className="text-2xl font-bold text-white mt-1">${comparison?.variant_a?.avg_cost_usd}</div>
                    <div className="text-[10px] text-muted mt-0.5">Total: ${comparison?.variant_a?.total_cost_usd}</div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-bg-alt border border-border">
                    <div className="text-[11px] text-muted uppercase">Failure Rate</div>
                    <div className="text-2xl font-bold text-emerald mt-1">
                      {(comparison?.variant_a?.failure_rate * 100).toFixed(1)}%
                    </div>
                    <div className="text-[10px] text-emerald mt-0.5">Verified clean execution</div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-bg-alt border border-border">
                    <div className="text-[11px] text-muted uppercase">Avg Tokens / Run</div>
                    <div className="text-2xl font-bold text-white mt-1">{comparison?.variant_a?.avg_tokens}</div>
                    <div className="text-[10px] text-muted mt-0.5">in + out tokens</div>
                  </div>
                </div>
              </div>

              {/* Variant B Card */}
              <div className="glass-panel p-6 rounded-2xl border border-violet/30 relative">
                <div className="flex items-center justify-between mb-4">
                  <span className="px-3 py-1 rounded-full bg-violet-dim text-violet border border-violet/40 text-xs font-mono font-bold">
                    Variant B
                  </span>
                  <span className="text-xs font-mono text-muted">{comparison?.variant_b?.sample_count} trace samples</span>
                </div>
                <h3 className="font-heading text-lg font-bold text-white mb-6">{comparison?.variant_b?.label}</h3>

                <div className="grid grid-cols-2 gap-4 font-mono">
                  <div className="p-3.5 rounded-xl bg-bg-alt border border-border">
                    <div className="text-[11px] text-muted uppercase">p95 Latency</div>
                    <div className="text-2xl font-bold text-violet mt-1">{comparison?.variant_b?.p95_latency_ms}ms</div>
                    <div className="text-[10px] text-muted mt-0.5">p50: {comparison?.variant_b?.p50_latency_ms}ms</div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-bg-alt border border-border">
                    <div className="text-[11px] text-muted uppercase">Avg Cost / Run</div>
                    <div className="text-2xl font-bold text-white mt-1">${comparison?.variant_b?.avg_cost_usd}</div>
                    <div className="text-[10px] text-muted mt-0.5">Total: ${comparison?.variant_b?.total_cost_usd}</div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-bg-alt border border-border">
                    <div className="text-[11px] text-muted uppercase">Failure Rate</div>
                    <div className="text-2xl font-bold text-rose mt-1">
                      {(comparison?.variant_b?.failure_rate * 100).toFixed(1)}%
                    </div>
                    <div className="text-[10px] text-rose mt-0.5">Higher error frequency</div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-bg-alt border border-border">
                    <div className="text-[11px] text-muted uppercase">Avg Tokens / Run</div>
                    <div className="text-2xl font-bold text-white mt-1">{comparison?.variant_b?.avg_tokens}</div>
                    <div className="text-[10px] text-muted mt-0.5">in + out tokens</div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
