'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Header from '../../components/Header';
import { getAgentPerformance } from '../../lib/api';
import { AgentPerformance } from '../../types';

export default function AgentsPage() {
  const [agents, setAgents] = useState<AgentPerformance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getAgentPerformance('cursor'),
      getAgentPerformance('autodev'),
      getAgentPerformance('browser_verify'),
      getAgentPerformance('reviewer'),
    ]).then(list => {
      setAgents(list.filter(Boolean));
      setLoading(false);
    });
  }, []);

  const agentMeta: Record<string, { title: string; desc: string; iconColor: string }> = {
    cursor: {
      title: 'Cursor Coding Agent',
      desc: 'Autonomous code generation, refactoring, and test execution pipeline.',
      iconColor: 'bg-indigo text-indigo border-indigo/40',
    },
    autodev: {
      title: 'AutoDev DevOps Swarm',
      desc: 'Infrastructure provisioning, Docker image builds, and K8s manifest deployments.',
      iconColor: 'bg-violet text-violet border-violet/40',
    },
    browser_verify: {
      title: 'BrowserVerify QA Agent',
      desc: 'Headless browser DOM interaction, UI assertions, and visual regression tests.',
      iconColor: 'bg-amber text-amber border-amber/40',
    },
    reviewer: {
      title: 'Security & Code Auditor',
      desc: 'Static code analysis, vulnerability checking, and policy compliance verification.',
      iconColor: 'bg-emerald text-emerald border-emerald/40',
    },
  };

  return (
    <div className="min-h-screen bg-bg text-accent">
      <Header />

      <main className="px-6 py-10 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="font-heading text-3xl font-extrabold text-white">Agent Swarm Scorecard</h1>
          <p className="text-xs text-muted mt-1">Per-agent performance metrics, error signatures, and token burn attribution</p>
        </div>

        {/* Agent Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {agents.map((ag: AgentPerformance) => {
            const meta = agentMeta[ag.agent_type.toLowerCase()] || {
              title: `${ag.agent_type.toUpperCase()} Agent`,
              desc: 'Autonomous agent workflow executor.',
              iconColor: 'bg-cyan text-cyan border-cyan/40',
            };

            return (
              <div key={ag.agent_type} className="glass-panel p-6 rounded-2xl border border-border/80 relative">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${meta.iconColor.split(' ')[0]} shadow-glow`} />
                    <div>
                      <h2 className="font-heading text-lg font-bold text-white">{meta.title}</h2>
                      <p className="text-xs text-muted mt-0.5">{meta.desc}</p>
                    </div>
                  </div>

                  <Link
                    href={`/traces?agent_type=${ag.agent_type}`}
                    className="px-3 py-1.5 rounded-lg bg-surface border border-border text-xs text-cyan hover:border-cyan transition-all"
                  >
                    View Traces →
                  </Link>
                </div>

                {/* Metrics Matrix */}
                <div className="grid grid-cols-3 gap-3 p-4 rounded-xl bg-bg-alt border border-border mb-4 text-center font-mono">
                  <div>
                    <div className="text-[10px] text-muted uppercase">Total Traces</div>
                    <div className="text-sm font-bold text-white mt-1">{ag.total_traces.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-muted uppercase">Avg Latency</div>
                    <div className="text-sm font-bold text-violet mt-1">{ag.avg_latency_ms}ms</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-muted uppercase">Cost / Trace</div>
                    <div className="text-sm font-bold text-cyan mt-1">${(Number(ag.avg_cost_per_trace) || 0).toFixed(3)}</div>
                  </div>
                </div>

                {/* Failure Signature Alert */}
                {ag.top_failure_signature && (
                  <div className="p-3 rounded-xl bg-rose-dim/30 border border-rose/30 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-rose animate-pulse-glow" />
                      <span className="text-rose font-medium">Top Failure:</span>
                      <span className="font-mono text-white text-[11px] truncate max-w-xs">{ag.top_failure_signature}</span>
                    </div>
                    <span className="font-mono text-rose font-bold text-[11px]">{(ag.failure_rate * 100).toFixed(1)}%</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
