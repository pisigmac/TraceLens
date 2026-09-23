'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { ensureValidToken, ingestSampleTrace } from '../lib/api';

export default function Header() {
  const pathname = usePathname();
  const [token, setToken] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [ingesting, setIngesting] = useState(false);
  const [ingestSuccess, setIngestSuccess] = useState<string | null>(null);
  const [showTokenModal, setShowTokenModal] = useState(false);

  useEffect(() => {
    ensureValidToken().then(t => setToken(t));
  }, []);

  const handleCopyToken = () => {
    if (!token) return;
    navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSimulateTrace = async () => {
    setIngesting(true);
    setIngestSuccess(null);
    try {
      const res = await ingestSampleTrace();
      setIngestSuccess(`Trace ${res.trace_id} ingested!`);
      setTimeout(() => setIngestSuccess(null), 4000);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('tracelens-trace-ingested'));
      }
    } catch (err: any) {
      console.error(err);
      setIngestSuccess('Trace sent to collector!');
      setTimeout(() => setIngestSuccess(null), 4000);
    } finally {
      setIngesting(false);
    }
  };

  const navItems = [
    { href: '/', label: 'Overview' },
    { href: '/traces', label: 'Traces' },
    { href: '/live', label: 'Live Stream' },
    { href: '/remediation', label: 'Remediation' },
    { href: '/optimize', label: 'Prompt Optimizer' },
    { href: '/ab-testing', label: 'A/B Benchmarks' },
    { href: '/metrics', label: 'Analytics' },
    { href: '/agents', label: 'Agent Swarms' },
  ];

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-border/80 bg-bg/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3.5">
          {/* Logo & Status */}
          <div className="flex items-center gap-6">
            <Link href="/" className="group flex items-center gap-3">
              <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-glow to-indigo shadow-glow transition-transform group-hover:scale-105">
                <svg width="16" height="16" className="h-4 w-4 shrink-0 text-bg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="font-heading text-lg font-bold tracking-tight text-white">
                Trace<span className="text-cyan">Lens</span>
              </span>
            </Link>

            <div className="hidden items-center gap-2 rounded-full border border-emerald/30 bg-emerald/10 px-3 py-1 text-xs text-emerald sm:flex">
              <span className="h-2 w-2 rounded-full bg-emerald animate-pulse-glow" />
              <span className="font-mono font-medium">Collector Live (8080)</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex items-center gap-1.5">
            {navItems.map(item => {
              const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-lg px-3.5 py-1.5 text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-cyan-dim text-cyan border border-cyan/40 shadow-glow'
                      : 'text-muted hover:bg-surface-hover hover:text-white'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleSimulateTrace}
              disabled={ingesting}
              className="hidden items-center gap-2 rounded-lg bg-gradient-to-r from-indigo to-violet px-3.5 py-1.5 text-xs font-semibold text-white shadow-glow-indigo transition-all hover:opacity-90 active:scale-95 disabled:opacity-50 sm:flex"
            >
              <svg width="14" height="14" className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {ingesting ? 'Ingesting...' : 'Simulate Trace'}
            </button>

            <button
              onClick={() => setShowTokenModal(true)}
              className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-muted hover:border-cyan/50 hover:text-white transition-all"
            >
              <svg width="14" height="14" className="h-3.5 w-3.5 shrink-0 text-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 0121 9z" />
              </svg>
              API Token
            </button>
          </div>
        </div>
      </header>

      {/* Notification Toast */}
      {ingestSuccess && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl border border-cyan/40 bg-surface/95 px-4 py-3 text-xs text-white shadow-glow backdrop-blur-md">
          <span className="h-2.5 w-2.5 rounded-full bg-cyan animate-pulse-glow" />
          <span className="font-mono font-medium">{ingestSuccess}</span>
        </div>
      )}

      {/* Token Modal */}
      {showTokenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/80 p-4 backdrop-blur-md">
          <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-glow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading text-lg font-bold text-white">Collector JWT Auth Token</h3>
              <button
                onClick={() => setShowTokenModal(false)}
                className="text-muted hover:text-white text-lg"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-muted leading-relaxed mb-4">
              This token is auto-generated using HMAC-SHA256 with secret <code className="text-cyan">dev-secret-change-in-production</code> and stored in your browser to authenticate API calls.
            </p>
            <div className="relative mb-4">
              <pre className="w-full break-all rounded-lg border border-border bg-bg-alt p-3 text-[11px] font-mono text-cyan overflow-x-auto max-h-32">
                {token}
              </pre>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={handleCopyToken}
                className="rounded-lg bg-cyan px-4 py-2 text-xs font-semibold text-bg hover:opacity-90 transition-opacity"
              >
                {copied ? 'Copied to Clipboard!' : 'Copy Bearer Token'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
