'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Header from '../../../components/Header';
import { fetchTrace, analyzeTrace, getReplay } from '../../../lib/api';
import { renderWaterfall } from '../../../lib/d3-waterfall';
import { Trace, Span, ReplayStep, TraceAnalysis } from '../../../types';

export default function TraceDetailPage() {
  const { trace_id } = useParams();
  const [trace, setTrace] = useState<Trace | null>(null);
  const [analysis, setAnalysis] = useState<TraceAnalysis | null>(null);
  const [replay, setReplay] = useState<{ steps: ReplayStep[] } | null>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const waterfallRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!trace_id) return;
    Promise.all([
      fetchTrace(trace_id as string),
      analyzeTrace(trace_id as string).catch(() => null),
      getReplay(trace_id as string).catch(() => null),
    ]).then(([t, a, r]) => {
      setTrace(t);
      setAnalysis(a);
      setReplay(r);
      setLoading(false);
    });
  }, [trace_id]);

  useEffect(() => {
    if (!trace || !waterfallRef.current) return;
    waterfallRef.current.innerHTML = '';
    renderWaterfall(waterfallRef.current, trace.spans, {
      onSpanClick: (span: Span) => {
        const idx = trace.spans.findIndex(s => s.span_id === span.span_id);
        if (idx >= 0) setActiveStep(idx);
      },
    });
  }, [trace]);

  if (loading) return (
    <div className="min-h-screen bg-bg text-accent">
      <Header />
      <main className="px-6 py-20 text-center font-mono text-xs text-muted">
        <span className="inline-block h-3 w-3 rounded-full bg-cyan animate-pulse-glow mr-2" />
        Loading execution trace graph...
      </main>
    </div>
  );

  if (!trace) return (
    <div className="min-h-screen bg-bg text-accent">
      <Header />
      <main className="px-6 py-20 text-center font-mono text-xs text-rose">
        Trace {trace_id} not found in database.
      </main>
    </div>
  );

  return (
    <div className="min-h-screen bg-bg text-accent">
      <Header />

      <main className="px-6 py-10 max-w-7xl mx-auto">
        {/* Breadcrumb & Navigation */}
        <div className="flex items-center gap-2 text-xs text-muted mb-6 font-mono">
          <Link href="/traces" className="hover:text-cyan">Traces</Link>
          <span>/</span>
          <span className="text-white font-bold">{trace.trace_id}</span>
        </div>

        {/* Trace Header Banner */}
        <div className="glass-panel p-6 rounded-2xl mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className={`h-3 w-3 rounded-full ${trace.status === 'error' ? 'bg-rose shadow-glow-rose' : 'bg-cyan shadow-glow'}`} />
              <h1 className="font-mono text-2xl font-bold text-white tracking-tight">{trace.trace_id}</h1>
              <span className={`px-2.5 py-0.5 rounded-md text-[10px] uppercase font-bold tracking-wider ${
                trace.status === 'error' ? 'bg-rose-dim text-rose border border-rose/30' : 'bg-emerald-dim text-emerald border border-emerald/30'
              }`}>
                {trace.status}
              </span>
            </div>

            <div className="flex items-center gap-4 text-xs font-mono text-muted">
              <span>{trace.spans.length} total spans</span>
              <span>·</span>
              <span className="text-cyan">${(Number(trace.total_cost_usd) || 0).toFixed(4)} token burn</span>
              <span>·</span>
              <span className="text-violet">{trace.total_latency_ms}ms chain duration</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href={`/replay/${trace.trace_id}`}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo to-violet text-white font-heading font-bold text-xs shadow-glow-indigo hover:opacity-90 transition-opacity"
            >
              Launch Step Replay →
            </Link>
          </div>
        </div>

        {/* Failure Signature Alert Card */}
        {analysis?.failure_signature && (
          <div className="glass-panel p-5 rounded-2xl border border-rose/40 bg-rose-dim/40 mb-8 flex items-start gap-4">
            <div className="p-2 rounded-lg bg-rose text-bg shrink-0">
              <svg width="20" height="20" className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <div className="text-xs font-bold text-rose uppercase tracking-wider">Root-Cause Failure Signature Detected</div>
              <div className="font-mono text-sm font-bold text-white mt-0.5">{analysis.failure_signature}</div>
              <div className="text-xs text-muted mt-1">GuardLoop score verified {analysis.anomalies?.length} critical execution anomalies</div>
            </div>
          </div>
        )}

        {/* D3 Waterfall Chart */}
        <div className="glass-panel p-6 rounded-2xl mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-heading text-lg font-bold text-white">Execution Waterfall Diagram</h2>
              <p className="text-xs text-muted">Hierarchical trace timeline with latency duration and token expenditure bars</p>
            </div>
            <div className="flex items-center gap-3 text-[11px] font-mono text-muted">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-indigo" /> Cursor</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-violet" /> LLM Inference</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-cyan" /> Token Overlay</span>
            </div>
          </div>

          <div ref={waterfallRef} className="w-full overflow-x-auto min-h-[320px]" />
        </div>

        {/* Interactive Step Replay Payload Inspector */}
        {replay && replay.steps.length > 0 && (
          <div className="glass-panel p-6 rounded-2xl mb-8">
            <h2 className="font-heading text-lg font-bold text-white mb-1">Step Payload Inspector</h2>
            <p className="text-xs text-muted mb-6">Inspect prompt inputs, model responses, and tool output payloads at each step</p>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Step Navigation Sidebar */}
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {replay.steps.map((step, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveStep(idx)}
                    className={`w-full text-left p-3.5 rounded-xl border text-xs transition-all ${
                      activeStep === idx
                        ? 'bg-cyan-dim border-cyan text-white shadow-glow'
                        : 'bg-bg-alt border-border text-muted hover:border-cyan/40 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center justify-between font-mono font-bold mb-1">
                      <span>Step {idx + 1}: {step.agent_type}</span>
                      <span className="text-cyan">${(Number(step.cost_usd) || 0).toFixed(3)}</span>
                    </div>
                    <div className="font-mono text-[11px] text-muted">{step.latency_ms}ms · {step.span_id}</div>
                  </button>
                ))}
              </div>

              {/* Step Content Payload */}
              <div className="lg:col-span-2 glass-panel p-5 rounded-xl border border-border bg-bg-alt/80 space-y-4">
                {(() => {
                  const step = replay.steps[activeStep] || replay.steps[0];
                  return (
                    <>
                      <div className="flex items-center justify-between border-b border-border/80 pb-3">
                        <div>
                          <span className="font-heading text-sm font-bold text-white">Step {activeStep + 1} ({step.agent_type})</span>
                          <span className="font-mono text-xs text-cyan ml-3">{step.span_id}</span>
                        </div>
                        {step.decision && (
                          <span className="px-2.5 py-1 rounded-md bg-emerald-dim text-emerald border border-emerald/30 font-mono text-[11px] uppercase font-bold">
                            Decision: {step.decision}
                          </span>
                        )}
                      </div>

                      {step.prompt && (
                        <div>
                          <div className="text-[11px] font-bold text-muted uppercase tracking-wider mb-1.5">Prompt Payload</div>
                          <pre className="p-3.5 rounded-xl bg-bg border border-border text-xs font-mono text-slate-200 overflow-x-auto max-h-36">
                            {step.prompt}
                          </pre>
                        </div>
                      )}

                      {step.response && (
                        <div>
                          <div className="text-[11px] font-bold text-muted uppercase tracking-wider mb-1.5">Model Response</div>
                          <pre className="p-3.5 rounded-xl bg-bg border border-border text-xs font-mono text-cyan overflow-x-auto max-h-36">
                            {step.response}
                          </pre>
                        </div>
                      )}

                      {step.tool_output && (
                        <div>
                          <div className="text-[11px] font-bold text-muted uppercase tracking-wider mb-1.5">Tool Execution Output</div>
                          <pre className="p-3.5 rounded-xl bg-bg border border-border text-xs font-mono text-rose overflow-x-auto max-h-36">
                            {step.tool_output}
                          </pre>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        {/* GuardLoop Anomaly Diagnostics */}
        {analysis?.anomalies && analysis.anomalies.length > 0 && (
          <div className="glass-panel p-6 rounded-2xl mb-8">
            <h2 className="font-heading text-lg font-bold text-white mb-4">GuardLoop Anomaly Audit</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {analysis.anomalies.map((a: any, i: number) => (
                <div key={i} className="p-4 rounded-xl bg-bg-alt border border-border flex items-start gap-3">
                  <span className={`mt-1 h-2.5 w-2.5 rounded-full shrink-0 ${
                    a.severity === 'critical' ? 'bg-rose shadow-glow-rose' :
                    a.severity === 'high' ? 'bg-amber' : 'bg-cyan'
                  }`} />
                  <div>
                    <div className="font-mono text-xs font-bold text-white uppercase">{a.type}</div>
                    <div className="text-xs text-muted leading-relaxed mt-1">{a.description}</div>
                    <div className="text-[10px] text-cyan font-mono mt-2 uppercase font-bold">Severity: {a.severity}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Complete Spans Table */}
        <div className="glass-panel p-6 rounded-2xl">
          <h2 className="font-heading text-lg font-bold text-white mb-4">Complete Span Inventory</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-border/80 text-muted uppercase tracking-wider font-mono text-[10px]">
                  <th className="py-3 px-3">Agent</th>
                  <th className="py-3 px-3">Tool</th>
                  <th className="py-3 px-3">LLM Model</th>
                  <th className="py-3 px-3 text-right">Tokens</th>
                  <th className="py-3 px-3 text-right">Latency</th>
                  <th className="py-3 px-3 text-right">Cost (USD)</th>
                  <th className="py-3 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 font-mono">
                {trace.spans.map((s: Span, i: number) => (
                  <tr key={i} className="hover:bg-surface-hover/80 transition-colors">
                    <td className="py-3 px-3 text-white font-bold">{s.agent_type}</td>
                    <td className="py-3 px-3 text-cyan">{s.tool_name}</td>
                    <td className="py-3 px-3 text-muted">{s.llm_model || '—'}</td>
                    <td className="py-3 px-3 text-right text-white">{(Number(s.input_tokens) || 0) + (Number(s.output_tokens) || 0)}</td>
                    <td className="py-3 px-3 text-right text-violet">{s.latency_ms}ms</td>
                    <td className="py-3 px-3 text-right text-white">${(Number(s.cost_usd) || 0).toFixed(4)}</td>
                    <td className="py-3 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                        s.status === 'error' ? 'bg-rose-dim text-rose' : 'bg-emerald-dim text-emerald'
                      }`}>
                        {s.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
