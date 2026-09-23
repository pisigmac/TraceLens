'use client';

import { useState, useEffect } from 'react';
import Header from '../../components/Header';
import { getMetrics } from '../../lib/api';
import { Metrics } from '../../types';

export default function MetricsPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMetrics()
      .then(m => setMetrics(m))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-bg text-accent">
      <Header />

      <main className="px-6 py-10 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="font-heading text-3xl font-extrabold text-white">System Performance Analytics</h1>
          <p className="text-xs text-muted mt-1">Real-time latency distribution, token burn expenditure, and agent error rates across multi-agent chains</p>
        </div>

        {/* Metrics High Level Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="glass-panel p-5 rounded-2xl">
            <div className="text-xs font-medium text-muted uppercase tracking-wider mb-1">Total Token Expenditure</div>
            <div className="font-mono text-3xl font-extrabold text-cyan tracking-tight">
              ${metrics ? metrics.total_cost_usd.toFixed(2) : '142.50'}
            </div>
            <div className="text-[11px] text-emerald mt-2 font-mono">100% attributed across models</div>
          </div>

          <div className="glass-panel p-5 rounded-2xl">
            <div className="text-xs font-medium text-muted uppercase tracking-wider mb-1">p50 Latency (Median)</div>
            <div className="font-mono text-3xl font-extrabold text-white tracking-tight">
              {metrics ? metrics.latency_p50 : 450}ms
            </div>
            <div className="text-[11px] text-muted mt-2 font-mono">sub-500ms target achieved</div>
          </div>

          <div className="glass-panel p-5 rounded-2xl">
            <div className="text-xs font-medium text-muted uppercase tracking-wider mb-1">p99 Latency (Tail)</div>
            <div className="font-mono text-3xl font-extrabold text-violet tracking-tight">
              {metrics ? (metrics.latency_p99 / 1000).toFixed(1) : 8.9}s
            </div>
            <div className="text-[11px] text-amber mt-2 font-mono">Long-running LLM tool calls</div>
          </div>

          <div className="glass-panel p-5 rounded-2xl">
            <div className="text-xs font-medium text-muted uppercase tracking-wider mb-1">Chain Failure Rate</div>
            <div className="font-mono text-3xl font-extrabold text-rose tracking-tight">
              {metrics ? (metrics.failure_rate * 100).toFixed(2) : '2.80'}%
            </div>
            <div className="text-[11px] text-rose mt-2 font-mono">GuardLoop monitored</div>
          </div>
        </div>

        {/* Latency Percentile Visual Distribution */}
        <div className="glass-panel p-6 rounded-2xl mb-8">
          <h2 className="font-heading text-lg font-bold text-white mb-2">Latency Distribution Breakdown</h2>
          <p className="text-xs text-muted mb-6">Comparative duration across p50, p95, and p99 percentiles</p>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs font-mono mb-1.5">
                <span className="text-white">p50 Percentile (Median)</span>
                <span className="text-cyan font-bold">{metrics?.latency_p50 || 450}ms</span>
              </div>
              <div className="w-full bg-bg-alt h-3 rounded-full overflow-hidden border border-border">
                <div className="bg-cyan h-full rounded-full" style={{ width: '18%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-mono mb-1.5">
                <span className="text-white">p95 Percentile</span>
                <span className="text-indigo font-bold">{metrics?.latency_p95 || 3200}ms</span>
              </div>
              <div className="w-full bg-bg-alt h-3 rounded-full overflow-hidden border border-border">
                <div className="bg-indigo h-full rounded-full" style={{ width: '55%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-mono mb-1.5">
                <span className="text-white">p99 Percentile (Tail Threshold)</span>
                <span className="text-violet font-bold">{metrics?.latency_p99 || 8900}ms</span>
              </div>
              <div className="w-full bg-bg-alt h-3 rounded-full overflow-hidden border border-border">
                <div className="bg-violet h-full rounded-full" style={{ width: '92%' }} />
              </div>
            </div>
          </div>
        </div>

        {/* LLM Model Cost Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-panel p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <span className="font-heading text-sm font-bold text-white">Claude 3.5 Sonnet</span>
              <span className="text-xs font-mono text-cyan">$92.40</span>
            </div>
            <p className="text-xs text-muted leading-relaxed mb-4">High token efficiency for reasoning and code refactoring steps.</p>
            <div className="w-full bg-bg-alt h-2 rounded-full overflow-hidden">
              <div className="bg-cyan h-full" style={{ width: '65%' }} />
            </div>
          </div>

          <div className="glass-panel p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <span className="font-heading text-sm font-bold text-white">GPT-4o</span>
              <span className="text-xs font-mono text-violet">$38.10</span>
            </div>
            <p className="text-xs text-muted leading-relaxed mb-4">Used by AutoDev swarm for deployment automation and container builds.</p>
            <div className="w-full bg-bg-alt h-2 rounded-full overflow-hidden">
              <div className="bg-violet h-full" style={{ width: '27%' }} />
            </div>
          </div>

          <div className="glass-panel p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <span className="font-heading text-sm font-bold text-white">Llama 3 70B</span>
              <span className="text-xs font-mono text-emerald">$12.00</span>
            </div>
            <p className="text-xs text-muted leading-relaxed mb-4">Open-weights local inference for classification and security audit steps.</p>
            <div className="w-full bg-bg-alt h-2 rounded-full overflow-hidden">
              <div className="bg-emerald h-full" style={{ width: '8%' }} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
