import React, { useState } from 'react';
import { ArrowLeft, ExternalLink, X, Globe, ShieldCheck, RefreshCw, Mic } from 'lucide-react';

interface InAppBrowserModalProps {
  url: string;
  title: string;
  appName?: string;
  onClose: () => void;
  onOpenExternal: (url: string) => void;
  isListening?: boolean;
}

export const InAppBrowserModal: React.FC<InAppBrowserModalProps> = ({
  url,
  title,
  appName,
  onClose,
  onOpenExternal,
  isListening = true,
}) => {
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [useProxy, setUseProxy] = useState(true);

  // Use the proxy by default so X-Frame-Options won't block external sites like Google, Wikipedia, etc.
  const iframeSrc = useProxy
    ? `/api/proxy?url=${encodeURIComponent(url)}`
    : url;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/95 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200">
      {/* Top HUD Header */}
      <header className="flex items-center justify-between px-3 py-2.5 bg-slate-900/90 border-b border-cyan-500/30 text-white shadow-lg shadow-cyan-950/40">
        <div className="flex items-center gap-2">
          {/* Big Return / Back Button */}
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/50 text-cyan-300 active:scale-95 transition-all text-xs sm:text-sm font-semibold shadow-[0_0_12px_rgba(6,182,212,0.3)] cursor-pointer"
            title="Wapas Friday AI Page Par Aayein"
          >
            <ArrowLeft className="w-4 h-4 text-cyan-300" />
            <span>← Wapas AI Page</span>
          </button>

          <div className="hidden sm:flex items-center gap-1.5 pl-2 border-l border-slate-700/60 text-xs text-slate-300 truncate max-w-[220px]">
            <Globe className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="truncate font-medium">{appName || title}</span>
          </div>
        </div>

        {/* Center URL badge */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-[11px] text-slate-400 max-w-[160px] sm:max-w-[280px] truncate">
          <ShieldCheck className="w-3 h-3 text-emerald-400 shrink-0" />
          <span className="truncate">{url.replace(/^https?:\/\//i, '')}</span>
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setUseProxy(!useProxy)}
            className="p-1.5 rounded-md text-slate-400 hover:text-cyan-300 hover:bg-slate-800/70 transition-colors"
            title={useProxy ? "Switch to Direct Mode" : "Switch to Proxy Mode"}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${useProxy ? 'text-cyan-400' : 'text-slate-400'}`} />
          </button>

          <button
            onClick={() => onOpenExternal(url)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-800/90 hover:bg-slate-700/90 border border-slate-600/60 text-slate-200 text-xs font-medium active:scale-95 transition-all cursor-pointer"
            title="Chrome Browser Tab Me Kholein"
          >
            <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Chrome Tab ↗</span>
          </button>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 active:scale-90 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Browser Viewport */}
      <div className="relative flex-1 w-full h-full bg-slate-900 overflow-hidden">
        {!iframeLoaded && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 z-10 text-cyan-400">
            <div className="w-8 h-8 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin mb-3" />
            <p className="text-xs font-mono tracking-wider text-slate-300">
              Loading {appName || title}...
            </p>
          </div>
        )}

        <iframe
          src={iframeSrc}
          title={title}
          className="w-full h-full border-0 bg-white"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
          onLoad={() => setIframeLoaded(true)}
        />

        {/* Floating Friday Active Voice Indicator on bottom right */}
        <div className="absolute bottom-4 right-4 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-950/85 backdrop-blur-md border border-cyan-500/40 shadow-lg shadow-cyan-950/50 pointer-events-none animate-pulse">
          <div className="relative flex items-center justify-center">
            <span className="absolute w-2.5 h-2.5 rounded-full bg-cyan-400/50 animate-ping" />
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
          </div>
          <span className="text-[11px] font-mono tracking-wide text-cyan-300">
            Friday Sun Rahi Hai • "Back Aa Jao" Bolein
          </span>
          <Mic className="w-3 h-3 text-cyan-300 ml-0.5" />
        </div>
      </div>
    </div>
  );
};
