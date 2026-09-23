'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Header from '../../components/Header';
import { searchTraces, ingestSampleTrace } from '../../lib/api';
import { TraceSearchResult, Trace } from '../../types';

export default function TracesPage() {
  const [agentType, setAgentType] = useState('');
  const [status, setStatus] = useState('');
  const [results, setResults] = useState<TraceSearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [ingesting, setIngesting] = useState(false);

  const doSearch = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { limit: '50', offset: '0' };
      if (agentType) params.agent_type = agentType;
      if (status) params.status = status;
      const data = await searchTraces(params);
      setResults(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [agentType, status]);

  useEffect(() => {
    doSearch();
    const handleIngested = () => doSearch();
    window.addEventListener('tracelens-trace-ingested', handleIngested);
    return () => window.removeEventListener('tracelens-trace-ingested', handleIngested);
  }, [doSearch]);

  const handleSimulate = async () => {
    setIngesting(true);
    try {
      await ingestSampleTrace();
      await doSearch();
    } finally {
      setIngesting(false);
    }
  };

  const setFilterPill = (agent: string, st: string) => {
    setAgentType(agent);
    setStatus(st);
  };

  return (
    <div className="min-h-screen bg-bg text-accent">
      <Header />

      <main className="px-6 py-10 max-w-7xl mx-auto">
        {/* Header & Title */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="font-heading text-3xl font-extrabold text-white">Trace Explorer</h1>
            <p className="text-xs text-muted mt-1">Search, profile, and diagnose multi-agent execution graphs with token cost overlays</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSimulate}
              disabled={ingesting}
              className="px-4 py-2 rounded-xl bg-cyan text-bg font-heading font-bold text-xs hover:shadow-glow transition-all disabled:opacity-50"
            >
              {ingesting ? 'Ingesting...' : '+ Ingest Sample Trace'}
            </button>
          </div>
        </div>

        {/* Quick Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <span className="text-xs text-muted mr-2">Quick Filters:</span>
          <button
            onClick={() => setFilterPill('', '')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
              !agentType && !status ? 'bg-cyan-dim text-cyan border border-cyan/40 shadow-glow' : 'glass-panel text-muted hover:text-white'
            }`}
          >
            All Traces
          </button>
          <button
            onClick={() => setFilterPill('', 'error')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
              status === 'error' ? 'bg-rose-dim text-rose border border-rose/40 shadow-glow-rose' : 'glass-panel text-muted hover:text-white'
            }`}
          >
            ⚠ Anomalous Errors Only
          </button>
          <button
            onClick={() => setFilterPill('cursor', '')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
              agentType === 'cursor' ? 'bg-indigo-dim text-indigo border border-indigo/40 shadow-glow-indigo' : 'glass-panel text-muted hover:text-white'
            }`}
          >
            Cursor Agent
          </button>
          <button
            onClick={() => setFilterPill('autodev', '')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
              agentType === 'autodev' ? 'bg-violet-dim text-violet border border-violet/40' : 'glass-panel text-muted hover:text-white'
            }`}
          >
            AutoDev Swarm
          </button>
          <button
            onClick={() => setFilterPill('browser_verify', '')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
              agentType === 'browser_verify' ? 'bg-amber-dim text-amber border border-amber/40' : 'glass-panel text-muted hover:text-white'
            }`}
          >
            BrowserVerify QA
          </button>
        </div>

        {/* Filter Inputs Bar */}
        <div className="glass-panel p-4 rounded-2xl mb-8 grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5 uppercase tracking-wider">Agent Class</label>
            <input
              value={agentType}
              onChange={e => setAgentType(e.target.value)}
              placeholder="e.g. cursor, autodev..."
              className="w-full px-3.5 py-2 bg-bg-alt border border-border rounded-xl text-xs text-white focus:outline-none focus:border-cyan transition-colors font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted mb-1.5 uppercase tracking-wider">Execution Status</label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value)}
              className="w-full px-3.5 py-2 bg-bg-alt border border-border rounded-xl text-xs text-white focus:outline-none focus:border-cyan transition-colors"
            >
              <option value="">All Statuses</option>
              <option value="ok">Success (OK)</option>
              <option value="error">Anomalous (Error)</option>
            </select>
          </div>

          <div>
            <button
              onClick={doSearch}
              disabled={loading}
              className="w-full px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-glow to-indigo text-bg font-heading font-bold text-xs hover:shadow-glow transition-all disabled:opacity-50"
            >
              {loading ? 'Executing Query...' : 'Apply Filters'}
            </button>
          </div>
        </div>

        {/* Results Stream */}
        {results && (
          <div>
            <div className="flex items-center justify-between text-xs text-muted mb-4 font-mono">
              <span>{results.total} traces indexed</span>
              <span>Showing {results.traces.length} execution chains</span>
            </div>

            <div className="space-y-3">
              {results.traces.map((t: Trace) => (
                <div
                  key={t.trace_id}
                  className="glass-panel glass-panel-hover p-5 rounded-2xl border border-border/80 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-4">
                    <span className={`mt-1 h-3 w-3 rounded-full shrink-0 ${
                      t.status === 'error' ? 'bg-rose shadow-glow-rose' : 'bg-cyan shadow-glow'
                    }`} />

                    <div>
                      <div className="flex items-center gap-3">
                        <Link href={`/traces/${t.trace_id}`} className="font-mono text-base font-bold text-white hover:text-cyan transition-colors">
                          {t.trace_id}
                        </Link>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] uppercase font-bold tracking-wider ${
                          t.status === 'error' ? 'bg-rose-dim text-rose border border-rose/30' : 'bg-emerald-dim text-emerald border border-emerald/30'
                        }`}>
                          {t.status}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted mt-1.5 font-mono">
                        <span>{t.spans?.length || 0} spans</span>
                        <span>·</span>
                        <span className="text-cyan">{t.spans?.[0]?.agent_type || 'agent'}</span>
                        {t.spans?.[0]?.tool_name && (
                          <>
                            <span>→</span>
                            <span className="text-slate-300">{t.spans[0].tool_name}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right font-mono">
                      <div className="text-sm font-bold text-white">${(Number(t.total_cost_usd) || 0).toFixed(4)}</div>
                      <div className="text-[10px] text-muted">token burn</div>
                    </div>

                    <div className="text-right font-mono">
                      <div className="text-sm font-bold text-violet">{t.total_latency_ms}ms</div>
                      <div className="text-[10px] text-muted">latency</div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link
                        href={`/traces/${t.trace_id}`}
                        className="px-3.5 py-1.5 rounded-lg bg-cyan-dim border border-cyan/30 text-cyan text-xs font-semibold hover:bg-cyan hover:text-bg transition-all"
                      >
                        Waterfall →
                      </Link>

                      <Link
                        href={`/replay/${t.trace_id}`}
                        className="px-3 py-1.5 rounded-lg bg-surface border border-border text-muted text-xs font-medium hover:border-violet/50 hover:text-violet transition-all"
                      >
                        Replay
                      </Link>
                    </div>
                  </div>
                </div>
              ))}

              {results.traces.length === 0 && (
                <div className="glass-panel p-12 text-center rounded-2xl border border-dashed border-border">
                  <div className="text-muted text-sm mb-4">No agent execution traces match the specified filter criteria.</div>
                  <button
                    onClick={handleSimulate}
                    className="px-5 py-2.5 rounded-xl bg-cyan text-bg font-heading font-bold text-xs"
                  >
                    + Generate Sample Trace Now
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
