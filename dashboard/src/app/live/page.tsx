'use client';

import { useState, useEffect, useRef } from 'react';
import Header from '../../components/Header';
import { ingestSampleTrace } from '../../lib/api';

interface LiveSpan {
  trace_id: string;
  span_id: string;
  agent_type: string;
  tool_name: string;
  llm_model?: string;
  input_tokens: number;
  output_tokens: number;
  latency_ms: number;
  status: string;
  cost_usd: number;
  timestamp: string;
}

export default function LiveStreamPage() {
  const [spans, setSpans] = useState<LiveSpan[]>([]);
  const [connected, setConnected] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080/v1/stream';
    let socket: WebSocket;

    const connect = () => {
      try {
        socket = new WebSocket(wsUrl);

        socket.onopen = () => {
          setConnected(true);
        };

        socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'span_ingested' && data.batch?.spans) {
              const newSpans: LiveSpan[] = data.batch.spans.map((s: any) => ({
                ...s,
                trace_id: data.batch.trace_id,
              }));
              setSpans(prev => [...newSpans, ...prev].slice(0, 50));
            }
          } catch (err) {
            console.error('WebSocket payload error:', err);
          }
        };

        socket.onclose = () => {
          setConnected(false);
          setTimeout(connect, 3000); // Auto-reconnect after 3s
        };

        socket.onerror = (err) => {
          setConnected(false);
          socket.close();
        };

        wsRef.current = socket;
      } catch (err) {
        setConnected(false);
      }
    };

    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const handleTriggerSimulatedSpan = async () => {
    setSimulating(true);
    try {
      await ingestSampleTrace();
    } catch (err) {
      console.error(err);
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg text-accent">
      <Header />

      <main className="px-6 py-10 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald/30 bg-emerald-dim text-emerald text-xs font-semibold uppercase tracking-wider mb-2">
              <span className={`h-2 w-2 rounded-full ${connected ? 'bg-emerald animate-pulse-glow' : 'bg-rose'}`} />
              {connected ? 'WebSocket Connected (ws://localhost:8080/v1/stream)' : 'Connecting WebSocket Stream...'}
            </div>
            <h1 className="font-heading text-3xl font-extrabold text-white tracking-tight">
              Real-Time <span className="gradient-text-cyan">Live Telemetry Stream</span>
            </h1>
            <p className="text-xs text-muted mt-1">
              Bi-directional WebSocket streaming feed for high-frequency AI agent swarms and microsecond span profiling.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleTriggerSimulatedSpan}
              disabled={simulating}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-glow to-indigo text-bg font-heading font-bold text-xs shadow-glow hover:opacity-90 transition-all active:scale-95 disabled:opacity-50"
            >
              {simulating ? 'Broadcasting...' : '⚡ Inject Live Span Batch'}
            </button>
          </div>
        </div>

        {/* Live Ticker Feed */}
        <div className="glass-panel p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-border/80">
            <h2 className="font-heading text-lg font-bold text-white">Live Execution Feed</h2>
            <div className="text-xs font-mono text-muted">
              Showing <span className="text-cyan font-bold">{spans.length}</span> recent active spans
            </div>
          </div>

          {spans.length === 0 ? (
            <div className="p-12 text-center font-mono text-xs text-muted rounded-xl bg-bg-alt/50 border border-border/60">
              <span className="inline-block h-3 w-3 rounded-full bg-cyan animate-pulse-glow mr-2" />
              Waiting for incoming WebSocket telemetry spans... Click "Inject Live Span Batch" to broadcast test events.
            </div>
          ) : (
            <div className="space-y-3">
              {spans.map((s, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl glass-panel glass-panel-hover border border-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all animate-fade-in"
                >
                  <div className="flex items-center gap-3">
                    <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${s.status === 'error' ? 'bg-rose shadow-glow-rose' : 'bg-cyan shadow-glow'}`} />
                    <div>
                      <div className="flex items-center gap-2 font-mono text-xs">
                        <span className="font-bold text-white">{s.agent_type}</span>
                        <span className="text-muted">/</span>
                        <span className="text-cyan font-semibold">{s.tool_name}</span>
                        {s.llm_model && (
                          <span className="px-2 py-0.5 rounded bg-surface border border-border text-[10px] text-muted">
                            {s.llm_model}
                          </span>
                        )}
                      </div>
                      <div className="font-mono text-[11px] text-muted mt-0.5">
                        Trace: <span className="text-slate-300">{s.trace_id}</span> · Span: <span className="text-slate-400">{s.span_id}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 font-mono text-xs text-right shrink-0">
                    <div>
                      <div className="text-white font-semibold">${(Number(s.cost_usd) || 0).toFixed(4)}</div>
                      <div className="text-[10px] text-muted">{(Number(s.input_tokens) || 0) + (Number(s.output_tokens) || 0)} tokens</div>
                    </div>

                    <div>
                      <div className="text-violet font-semibold">{s.latency_ms}ms</div>
                      <div className="text-[10px] text-muted">duration</div>
                    </div>

                    <span className={`px-2.5 py-1 rounded text-[10px] uppercase font-bold ${
                      s.status === 'error' ? 'bg-rose-dim text-rose border border-rose/30' : 'bg-emerald-dim text-emerald border border-emerald/30'
                    }`}>
                      {s.status}
                    </span>
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
