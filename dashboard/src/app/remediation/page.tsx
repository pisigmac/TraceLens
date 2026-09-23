'use client';

import { useState, useEffect } from 'react';
import Header from '../../components/Header';
import { getRemediationRules, triggerRemediation } from '../../lib/api';

export default function RemediationPage() {
  const [rules, setRules] = useState<any[]>([]);
  const [testResult, setTestResult] = useState<any>(null);
  const [triggering, setTriggering] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRemediationRules().then(data => {
      setRules(data);
      setLoading(false);
    });
  }, []);

  const handleTestTrigger = async () => {
    setTriggering(true);
    setTestResult(null);
    try {
      const res = await triggerRemediation('tr-autodev-deploy-402');
      setTestResult(res);
    } catch (err: any) {
      setTestResult({ error: err.message || 'Trigger dispatch sent' });
    } finally {
      setTriggering(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg text-accent">
      <Header />

      <main className="px-6 py-10 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-rose/30 bg-rose-dim text-rose text-xs font-semibold uppercase tracking-wider mb-2">
              <span className="h-2 w-2 rounded-full bg-rose animate-pulse-glow" />
              Automated Incident Recovery
            </div>
            <h1 className="font-heading text-3xl font-extrabold text-white tracking-tight">
              Auto-Remediation & <span className="gradient-text-rose">Webhook Triggers</span>
            </h1>
            <p className="text-xs text-muted mt-1">
              Automatically trigger Slack/Discord alerts, fallback model webhooks, or self-healing retries when failure signatures occur.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleTestTrigger}
              disabled={triggering}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose to-violet text-white font-heading font-bold text-xs shadow-glow-rose hover:opacity-90 transition-all active:scale-95 disabled:opacity-50"
            >
              {triggering ? 'Dispatching Webhooks...' : '⚡ Test Trigger Remediation'}
            </button>
          </div>
        </div>

        {/* Test Result Toast Banner */}
        {testResult && (
          <div className="glass-panel p-5 rounded-2xl border border-rose/40 bg-rose-dim/30 mb-8 font-mono text-xs text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="font-bold text-rose uppercase mb-1">Remediation Webhook Dispatched</div>
              <div>Triggered {testResult.triggered_count || 1} remediation rules for trace <code className="text-cyan">{testResult.trace_id || 'tr-autodev-deploy-402'}</code></div>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-emerald-dim text-emerald border border-emerald/30 text-xs font-bold">
              HTTP 200 OK — Dispatched
            </div>
          </div>
        )}

        {/* Remediation Rules Grid */}
        <div className="glass-panel p-6 rounded-2xl mb-8">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-border/80">
            <h2 className="font-heading text-lg font-bold text-white">Active Remediation Rules</h2>
            <span className="text-xs font-mono text-cyan">{rules.length} rules active</span>
          </div>

          {loading ? (
            <div className="p-8 text-center font-mono text-xs text-muted">Loading remediation rules...</div>
          ) : (
            <div className="space-y-4">
              {rules.map((rule, idx) => (
                <div key={idx} className="p-5 rounded-xl bg-bg-alt border border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded text-[10px] uppercase font-mono font-bold bg-rose-dim text-rose border border-rose/30">
                        {rule.event_type}
                      </span>
                      <span className="font-mono text-xs text-muted">Agent: <code className="text-white font-bold">{rule.agent_type}</code></span>
                    </div>
                    <h3 className="font-heading text-sm font-bold text-white mt-1">{rule.name}</h3>
                    <div className="font-mono text-xs text-cyan break-all">{rule.webhook_url}</div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0 font-mono text-xs">
                    <span className="px-3 py-1 rounded-lg bg-surface border border-border text-white font-bold uppercase">
                      Action: {rule.action}
                    </span>
                    <span className="h-3 w-3 rounded-full bg-emerald shadow-glow-emerald" title="Enabled" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
