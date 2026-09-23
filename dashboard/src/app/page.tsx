'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Header from '../components/Header';
import { searchTraces, getMetrics, ingestSampleTrace } from '../lib/api';
import { TraceSearchResult, Metrics } from '../types';

export default function Home() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [recentTraces, setRecentTraces] = useState<TraceSearchResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [ingesting, setIngesting] = useState(false);

  const loadData = async () => {
    try {
      const [m, t] = await Promise.all([
        getMetrics().catch(() => null),
        searchTraces({ limit: '6' }).catch(() => null),
      ]);
      if (m) setMetrics(m);
      if (t) setRecentTraces(t);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const handleIngested = () => loadData();
    window.addEventListener('tracelens-trace-ingested', handleIngested);
    return () => window.removeEventListener('tracelens-trace-ingested', handleIngested);
  }, []);

  const handleRunDemoIngest = async () => {
    setIngesting(true);
    try {
      await ingestSampleTrace();
      await loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setIngesting(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg text-accent">
      <Header />

      {/* Hero Section */}
      <section className="relative overflow-hidden px-6 pt-16 pb-20 max-w-7xl mx-auto">
        {/* Glow ambient backgrounds */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-indigo/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-cyan/30 bg-cyan-dim text-cyan text-xs font-semibold tracking-wide uppercase mb-6 shadow-glow">
            <span className="h-2 w-2 rounded-full bg-cyan animate-pulse-glow" />
            Distributed Tracing for AI Agent Workflows
          </div>

          <h1 className="font-heading text-4xl sm:text-5xl font-extrabold tracking-tight text-white mb-6 leading-tight">
            Microsecond Observability for <span className="gradient-text-cyan">Autonomous AI Swarms</span>
          </h1>

          <p className="text-base text-muted leading-relaxed mb-10 max-w-2xl mx-auto font-sans">
            Stop guessing why your 12-step agent chain broke or burned $4.20 in tokens. Trace, profile, and replay every autonomous LLM call and tool invocation with production-grade precision.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/traces"
              className="px-6 py-3 rounded-xl bg-cyan text-bg font-heading font-bold text-sm hover:shadow-glow transition-all hover:scale-105 active:scale-95"
            >
              Explore Live Traces →
            </Link>

            <button
              onClick={handleRunDemoIngest}
              disabled={ingesting}
              className="px-6 py-3 rounded-xl glass-panel border border-border text-white font-heading font-semibold text-sm hover:border-cyan/50 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
            >
              {ingesting ? 'Ingesting Span Batch...' : 'Simulate Swarm Span'}
            </button>
          </div>
        </div>

        {/* Live Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto mb-20">
          <div className="glass-panel p-5 rounded-2xl border border-border/80 relative overflow-hidden group">
            <div className="text-xs text-muted font-medium mb-1 uppercase tracking-wider">Total Spans Ingested</div>
            <div className="font-mono text-3xl font-bold text-white tracking-tight">
              {metrics ? (metrics.total_spans / 1000000).toFixed(1) + 'M' : '4.2M'}
            </div>
            <div className="text-[11px] text-cyan mt-1 flex items-center gap-1 font-mono">
              <span>↑ 100k spans/sec throughput</span>
            </div>
          </div>

          <div className="glass-panel p-5 rounded-2xl border border-border/80 relative overflow-hidden group">
            <div className="text-xs text-muted font-medium mb-1 uppercase tracking-wider">Daily Token Spend</div>
            <div className="font-mono text-3xl font-bold text-cyan tracking-tight">
              ${metrics ? metrics.total_cost_usd.toFixed(2) : '142.50'}
            </div>
            <div className="text-[11px] text-muted mt-1 font-mono">Real-time cost attribution</div>
          </div>

          <div className="glass-panel p-5 rounded-2xl border border-border/80 relative overflow-hidden group">
            <div className="text-xs text-muted font-medium mb-1 uppercase tracking-wider">p99 Chain Latency</div>
            <div className="font-mono text-3xl font-bold text-violet tracking-tight">
              {metrics ? (metrics.latency_p99 / 1000).toFixed(1) + 's' : '8.9s'}
            </div>
            <div className="text-[11px] text-emerald mt-1 font-mono">↓ 1.2s vs baseline</div>
          </div>

          <div className="glass-panel p-5 rounded-2xl border border-border/80 relative overflow-hidden group">
            <div className="text-xs text-muted font-medium mb-1 uppercase tracking-wider">Anomalous Failure Rate</div>
            <div className="font-mono text-3xl font-bold text-rose tracking-tight">
              {metrics ? (metrics.failure_rate * 100).toFixed(1) + '%' : '2.8%'}
            </div>
            <div className="text-[11px] text-rose mt-1 font-mono">GuardLoop verified</div>
          </div>
        </div>

        {/* Capabilities Showcase Grid */}
        <div className="mb-20">
          <div className="text-center mb-10">
            <h2 className="font-heading text-2xl sm:text-3xl font-bold text-white mb-2">
              Purpose-Built for Autonomous AI Architectures
            </h2>
            <p className="text-sm text-muted">Not traditional APM. Not plain logs. First-class support for multi-agent chains.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass-panel glass-panel-hover p-6 rounded-2xl relative">
              <div className="w-10 h-10 rounded-xl bg-cyan-dim border border-cyan/40 flex items-center justify-center text-cyan mb-4">
                <svg width="20" height="20" className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="font-heading text-lg font-bold text-white mb-2">Agent-Aware Waterfall Profiler</h3>
              <p className="text-xs text-muted leading-relaxed">
                Visualize tool calls, sub-agent spawning, and LLM inference latencies alongside token burn rates in an interactive D3 waterfall diagram.
              </p>
            </div>

            <div className="glass-panel glass-panel-hover p-6 rounded-2xl relative">
              <div className="w-10 h-10 rounded-xl bg-violet-dim border border-violet/40 flex items-center justify-center text-violet mb-4">
                <svg width="20" height="20" className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="font-heading text-lg font-bold text-white mb-2">Deterministic Step Replay</h3>
              <p className="text-xs text-muted leading-relaxed">
                Step backwards and forwards through full prompt, response, and tool payload histories for any failed trace to reproduce bugs instantly.
              </p>
            </div>

            <div className="glass-panel glass-panel-hover p-6 rounded-2xl relative">
              <div className="w-10 h-10 rounded-xl bg-rose-dim border border-rose/40 flex items-center justify-center text-rose mb-4">
                <svg width="20" height="20" className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="font-heading text-lg font-bold text-white mb-2">GuardLoop Anomaly Engine</h3>
              <p className="text-xs text-muted leading-relaxed">
                Automatic detection of runaway infinite loops, latency spikes, and cost outliers with failure signature clustering and webhook alerts.
              </p>
            </div>
          </div>
        </div>

        {/* Live Trace Stream Preview */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-heading text-xl font-bold text-white">Live Execution Traces</h2>
              <p className="text-xs text-muted mt-0.5">Real-time stream of agent workflow telemetry from ClickHouse database</p>
            </div>
            <Link href="/traces" className="text-xs font-semibold text-cyan hover:underline">
              View All Traces →
            </Link>
          </div>

          <div className="space-y-3">
            {recentTraces?.traces.map(t => (
              <Link
                key={t.trace_id}
                href={`/traces/${t.trace_id}`}
                className="glass-panel glass-panel-hover p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-border/80"
              >
                <div className="flex items-center gap-3">
                  <span className={`h-2.5 w-2.5 rounded-full ${t.status === 'error' ? 'bg-rose shadow-glow-rose' : 'bg-cyan shadow-glow'}`} />
                  <div>
                    <div className="font-mono text-sm font-semibold text-white">{t.trace_id}</div>
                    <div className="flex items-center gap-2 text-xs text-muted mt-0.5">
                      <span>{t.spans?.length || 0} spans</span>
                      <span>·</span>
                      <span className="text-cyan font-mono">{t.spans?.[0]?.agent_type || 'agent'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6 text-xs font-mono">
                  <div className="text-right">
                    <div className="text-white font-semibold">${t.total_cost_usd?.toFixed(3)}</div>
                    <div className="text-[10px] text-muted">cost burn</div>
                  </div>
                  <div className="text-right">
                    <div className="text-violet font-semibold">{t.total_latency_ms}ms</div>
                    <div className="text-[10px] text-muted">duration</div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-md text-[10px] uppercase font-bold tracking-wider ${
                    t.status === 'error' ? 'bg-rose-dim text-rose border border-rose/30' : 'bg-emerald-dim text-emerald border border-emerald/30'
                  }`}>
                    {t.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
