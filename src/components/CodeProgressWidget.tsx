import React, { useState } from 'react';
import { Code2, ExternalLink, Copy, Check, X, Play, RefreshCw, Sparkles, Terminal, Download, AlertTriangle } from 'lucide-react';
import { CodeGenerationStatus, ThemeMood } from '../types';

interface CodeProgressWidgetProps {
  status: CodeGenerationStatus | null;
  theme: ThemeMood;
  onClearStatus: () => void;
  onOpenInNewTab: (html: string, title: string, codeId?: string) => void;
}

const THEME_ACCENTS: Record<ThemeMood, { glow: string; text: string; stroke: string; bg: string }> = {
  cyan: { glow: 'rgba(0, 242, 254, 0.4)', text: 'text-cyan-400', stroke: '#00f2fe', bg: 'bg-cyan-500/10' },
  magenta: { glow: 'rgba(247, 37, 133, 0.4)', text: 'text-pink-400', stroke: '#f72585', bg: 'bg-pink-500/10' },
  emerald: { glow: 'rgba(16, 185, 129, 0.4)', text: 'text-emerald-400', stroke: '#10b981', bg: 'bg-emerald-500/10' },
  amber: { glow: 'rgba(245, 158, 11, 0.4)', text: 'text-amber-400', stroke: '#f59e0b', bg: 'bg-amber-500/10' },
  violet: { glow: 'rgba(168, 85, 247, 0.4)', text: 'text-violet-400', stroke: '#a855f7', bg: 'bg-violet-500/10' },
};

export const CodeProgressWidget: React.FC<CodeProgressWidgetProps> = ({
  status,
  theme,
  onClearStatus,
  onOpenInNewTab,
}) => {
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview');

  if (!status || status.status === 'idle') {
    return null;
  }

  const isGenerating = status.status === 'starting' || status.status === 'generating';
  const isCompleted = status.status === 'completed';
  const isError = status.status === 'error';
  const accent = THEME_ACCENTS[theme] || THEME_ACCENTS.cyan;

  // Circular progress calculations for 28px SVG
  const radius = 10;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (Math.min(100, Math.max(0, status.progress)) / 100) * circumference;

  const handleCopy = () => {
    if (!status.code) return;
    navigator.clipboard.writeText(status.code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleDownload = () => {
    if (!status.code) return;
    const blob = new Blob([status.code], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(status.title || 'friday_project').toLowerCase().replace(/\s+/g, '_')}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <>
      {/* Top-Right Compact Floating Animation Widget */}
      <aside
        id="code-progress-top-right-widget"
        aria-label="Code Generation Progress"
        className="fixed top-14 right-3 sm:top-14 sm:right-6 z-50 flex items-center gap-2 pointer-events-auto select-none transition-all duration-300 animate-in fade-in slide-in-from-top-2"
      >
        {isGenerating && (
          <div
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-neutral-950/90 border border-neutral-800/80 backdrop-blur-xl shadow-2xl transition-all"
            style={{
              boxShadow: `0 0 16px ${accent.glow}, 0 4px 12px rgba(0,0,0,0.6)`,
            }}
          >
            {/* Compact Circular SVG Percentage Loader */}
            <div className="relative w-7 h-7 flex items-center justify-center shrink-0">
              <svg className="w-7 h-7 -rotate-90" viewBox="0 0 28 28">
                {/* Background Ring */}
                <circle
                  cx="14"
                  cy="14"
                  r={radius}
                  fill="transparent"
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth="2.5"
                />
                {/* Dynamic Progress Ring */}
                <circle
                  cx="14"
                  cy="14"
                  r={radius}
                  fill="transparent"
                  stroke={accent.stroke}
                  strokeWidth="2.5"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  className="transition-all duration-300 ease-out"
                />
              </svg>
              {/* Spinning subtle particle */}
              <div
                className="absolute inset-0 rounded-full animate-spin pointer-events-none opacity-40"
                style={{
                  border: `1.5px solid transparent`,
                  borderTopColor: accent.stroke,
                }}
              />
            </div>

            {/* Percentage & Project Info */}
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5 leading-none">
                <span className={`font-mono font-bold text-xs ${accent.text}`}>
                  {status.progress}%
                </span>
                <span className="text-[10px] text-neutral-400 font-mono font-medium truncate max-w-[120px] sm:max-w-[170px]">
                  {status.title || 'HTML Code'}
                </span>
              </div>
              <span className="text-[9px] text-neutral-500 font-sans truncate max-w-[150px] sm:max-w-[190px] mt-0.5">
                {status.statusText || 'Code ban raha hai...'}
              </span>
            </div>
          </div>
        )}

        {isCompleted && (
          <div
            className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-full bg-neutral-950/95 border border-emerald-500/50 backdrop-blur-xl shadow-xl transition-all"
            style={{
              boxShadow: '0 0 15px rgba(16, 185, 129, 0.3)',
            }}
          >
            <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <Check className="w-3 h-3 stroke-[3]" />
            </div>

            <div className="flex flex-col leading-tight cursor-pointer" onClick={() => setShowCodeModal(true)}>
              <span className="font-mono text-[11px] font-semibold text-emerald-300 truncate max-w-[100px] sm:max-w-[140px]">
                {status.title} (100%)
              </span>
              <span className="text-[9px] text-neutral-400">Opened in New Tab</span>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-1 ml-1">
              <button
                type="button"
                onClick={() => onOpenInNewTab(status.code || '', status.title, status.codeId)}
                className="p-1 rounded-full hover:bg-neutral-800 text-neutral-300 hover:text-white transition-colors"
                title="Re-open in New Tab"
              >
                <ExternalLink className="w-3 h-3 text-cyan-400" />
              </button>
              <button
                type="button"
                onClick={() => setShowCodeModal(true)}
                className="p-1 rounded-full hover:bg-neutral-800 text-neutral-300 hover:text-white transition-colors"
                title="View Code & Preview"
              >
                <Code2 className="w-3 h-3 text-neutral-400" />
              </button>
              <button
                type="button"
                onClick={onClearStatus}
                className="p-1 rounded-full hover:bg-neutral-800 text-neutral-500 hover:text-neutral-300 transition-colors"
                title="Dismiss"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}

        {isError && (
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-950/90 border border-red-500/50 backdrop-blur-xl text-red-200 text-xs font-mono shadow-xl transition-all"
            style={{
              boxShadow: '0 0 15px rgba(239, 68, 68, 0.3)',
            }}
          >
            <div className="w-4 h-4 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-3 h-3" />
            </div>
            <span className="truncate max-w-[150px] sm:max-w-[220px]">
              {status.error?.includes('503') || status.error?.includes('high demand')
                ? 'Server busy (503 spike)'
                : status.error?.length && status.error.length > 40
                ? `${status.error.slice(0, 40)}...`
                : status.error || 'Generation error'}
            </span>
            <button
              type="button"
              onClick={onClearStatus}
              className="p-1 rounded-full hover:bg-red-900 text-red-400 hover:text-white transition-colors"
              title="Dismiss"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
      </aside>

      {/* Generated Code & Live Preview Modal */}
      {showCodeModal && status.code && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="code-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
        >
          <div className="relative w-full max-w-4xl h-[88vh] bg-neutral-950 border border-neutral-800 rounded-2xl flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="px-4 py-3 border-b border-neutral-800 flex items-center justify-between gap-3 bg-neutral-900/60">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
                  <Code2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 id="code-modal-title" className="text-sm font-semibold text-white truncate">
                    {status.title || 'Generated Project'}
                  </h3>
                  <p className="text-[10px] text-neutral-400 font-mono">
                    Single-file HTML5 • CSS3 • JavaScript (WebView & Browser Ready)
                  </p>
                </div>
              </div>

              {/* View Switcher Tabs */}
              <div className="flex items-center gap-1 bg-neutral-900 border border-neutral-800 p-0.5 rounded-lg">
                <button
                  type="button"
                  onClick={() => setActiveTab('preview')}
                  className={`px-3 py-1 rounded-md text-xs font-mono transition-all ${
                    activeTab === 'preview'
                      ? 'bg-cyan-500/20 text-cyan-300 font-semibold'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Live View
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('code')}
                  className={`px-3 py-1 rounded-md text-xs font-mono transition-all ${
                    activeTab === 'code'
                      ? 'bg-cyan-500/20 text-cyan-300 font-semibold'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Source Code
                </button>
              </div>

              {/* Close and Actions */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onOpenInNewTab(status.code || '', status.title, status.codeId)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/20 border border-cyan-500/40 hover:border-cyan-400 text-cyan-300 text-xs font-mono transition-all hover:scale-105 active:scale-95"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Open New Tab</span>
                </button>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-neutral-300 text-xs font-mono transition-all"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
                  title="Download index.html"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setShowCodeModal(false)}
                  className="p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors ml-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-hidden relative bg-neutral-950">
              {activeTab === 'preview' ? (
                <iframe
                  title={status.title || 'Generated Preview'}
                  srcDoc={status.code}
                  sandbox="allow-scripts allow-modals allow-same-origin allow-forms"
                  className="w-full h-full border-0 bg-white"
                />
              ) : (
                <div className="w-full h-full overflow-auto p-4 font-mono text-xs text-neutral-300 selection:bg-cyan-500/30 selection:text-cyan-200">
                  <pre className="whitespace-pre-wrap">{status.code}</pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
