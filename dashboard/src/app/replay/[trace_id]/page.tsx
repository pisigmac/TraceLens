'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Header from '../../../components/Header';
import { getReplay, fetchTrace } from '../../../lib/api';
import { ReplayStep, Trace } from '../../../types';

export default function StepReplayPage() {
  const { trace_id } = useParams();
  const [steps, setSteps] = useState<ReplayStep[]>([]);
  const [trace, setTrace] = useState<Trace | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!trace_id) return;
    Promise.all([
      getReplay(trace_id as string).catch(() => ({ steps: [] })),
      fetchTrace(trace_id as string).catch(() => null),
    ]).then(([r, t]) => {
      setSteps(r.steps || []);
      setTrace(t);
      setLoading(false);
    });
  }, [trace_id]);

  // Automated Replay Player
  useEffect(() => {
    if (!isPlaying || steps.length === 0) return;
    const interval = setInterval(() => {
      setCurrentStep(prev => {
        if (prev >= steps.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 2000);
    return () => clearInterval(interval);
  }, [isPlaying, steps.length]);

  if (loading) return (
    <div className="min-h-screen bg-bg text-accent">
      <Header />
      <main className="px-6 py-20 text-center font-mono text-xs text-muted">
        Loading step replay session...
      </main>
    </div>
  );

  const activeStepData = steps[currentStep] || steps[0];

  return (
    <div className="min-h-screen bg-bg text-accent">
      <Header />

      <main className="px-6 py-10 max-w-7xl mx-auto">
        <div className="flex items-center gap-2 text-xs text-muted mb-6 font-mono">
          <Link href="/traces" className="hover:text-cyan">Traces</Link>
          <span>/</span>
          <Link href={`/traces/${trace_id}`} className="hover:text-cyan">{trace_id}</Link>
          <span>/</span>
          <span className="text-white font-bold">Step Replay</span>
        </div>

        {/* Replay Header */}
        <div className="glass-panel p-6 rounded-2xl mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="h-3 w-3 rounded-full bg-violet shadow-glow-indigo animate-pulse-glow" />
              <h1 className="font-heading text-2xl font-extrabold text-white">Deterministic Step Replay</h1>
            </div>
            <p className="text-xs text-muted">Reconstruct state progression, model inferences, and tool side-effects across all steps</p>
          </div>

          {/* Player Controls */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCurrentStep(0)}
              className="p-2.5 rounded-xl glass-panel border border-border text-muted hover:text-white hover:border-cyan/40 transition-all"
              title="Reset to Start"
            >
              ⏮
            </button>

            <button
              onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
              disabled={currentStep === 0}
              className="p-2.5 rounded-xl glass-panel border border-border text-muted hover:text-white hover:border-cyan/40 transition-all disabled:opacity-40"
              title="Previous Step"
            >
              ◀
            </button>

            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="px-5 py-2.5 rounded-xl bg-cyan text-bg font-heading font-bold text-xs hover:shadow-glow transition-all active:scale-95"
            >
              {isPlaying ? '⏸ Pause Replay' : '▶ Play Replay'}
            </button>

            <button
              onClick={() => setCurrentStep(prev => Math.min(steps.length - 1, prev + 1))}
              disabled={currentStep >= steps.length - 1}
              className="p-2.5 rounded-xl glass-panel border border-border text-muted hover:text-white hover:border-cyan/40 transition-all disabled:opacity-40"
              title="Next Step"
            >
              ▶
            </button>
          </div>
        </div>

        {/* Progress Bar Timeline */}
        <div className="glass-panel p-4 rounded-2xl mb-8">
          <div className="flex justify-between text-xs font-mono text-muted mb-2">
            <span>Step {currentStep + 1} of {steps.length}</span>
            <span className="text-cyan">{((currentStep + 1) / steps.length * 100).toFixed(0)}% Replay Complete</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {steps.map((s, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentStep(idx)}
                className={`p-2.5 rounded-xl text-left border font-mono text-[11px] transition-all ${
                  currentStep === idx
                    ? 'bg-cyan-dim border-cyan text-cyan shadow-glow'
                    : 'bg-bg-alt border-border text-muted hover:border-cyan/30 hover:text-white'
                }`}
              >
                <div className="font-bold truncate">Step {idx + 1}</div>
                <div className="text-[10px] text-slate-400 truncate">{s.agent_type}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Active Step Inspector */}
        {activeStepData && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Step Stats Card */}
            <div className="glass-panel p-6 rounded-2xl space-y-4">
              <h2 className="font-heading text-base font-bold text-white mb-2">Step Metadata</h2>

              <div className="space-y-3 font-mono text-xs">
                <div className="flex justify-between border-b border-border/60 pb-2">
                  <span className="text-muted">Agent Type</span>
                  <span className="text-cyan font-bold">{activeStepData.agent_type}</span>
                </div>

                <div className="flex justify-between border-b border-border/60 pb-2">
                  <span className="text-muted">Span ID</span>
                  <span className="text-white">{activeStepData.span_id}</span>
                </div>

                <div className="flex justify-between border-b border-border/60 pb-2">
                  <span className="text-muted">Latency</span>
                  <span className="text-violet font-bold">{activeStepData.latency_ms}ms</span>
                </div>

                <div className="flex justify-between border-b border-border/60 pb-2">
                  <span className="text-muted">Token Cost</span>
                  <span className="text-cyan font-bold">${(Number(activeStepData.cost_usd) || 0).toFixed(4)}</span>
                </div>

                {activeStepData.decision && (
                  <div className="flex justify-between border-b border-border/60 pb-2">
                    <span className="text-muted">Decision</span>
                    <span className="text-emerald font-bold uppercase">{activeStepData.decision}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Prompt & Response Payloads */}
            <div className="lg:col-span-2 glass-panel p-6 rounded-2xl space-y-5">
              <div>
                <div className="text-xs font-bold text-muted uppercase tracking-wider mb-2">Input Prompt Payload</div>
                <pre className="p-4 rounded-xl bg-bg-alt border border-border text-xs font-mono text-slate-200 overflow-x-auto max-h-44">
                  {activeStepData.prompt || 'No prompt payload available.'}
                </pre>
              </div>

              <div>
                <div className="text-xs font-bold text-muted uppercase tracking-wider mb-2">LLM Output Completion</div>
                <pre className="p-4 rounded-xl bg-bg-alt border border-border text-xs font-mono text-cyan overflow-x-auto max-h-44">
                  {activeStepData.response || 'No completion payload available.'}
                </pre>
              </div>

              {activeStepData.tool_output && (
                <div>
                  <div className="text-xs font-bold text-muted uppercase tracking-wider mb-2">Tool Output / Error Trace</div>
                  <pre className="p-4 rounded-xl bg-bg-alt border border-border text-xs font-mono text-rose overflow-x-auto max-h-44">
                    {activeStepData.tool_output}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
