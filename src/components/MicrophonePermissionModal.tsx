import React from 'react';
import { MicOff, RefreshCw, X, ShieldAlert, ExternalLink, MessageSquare } from 'lucide-react';

interface MicrophonePermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRetry: () => void;
  onContinueWithText?: () => void;
}

export const MicrophonePermissionModal: React.FC<MicrophonePermissionModalProps> = ({
  isOpen,
  onClose,
  onRetry,
  onContinueWithText,
}) => {
  if (!isOpen) return null;

  const isMobile = /android|iphone|ipad|ipod/i.test(navigator.userAgent);
  const isInIframe = window.self !== window.top;

  const handleOpenDirectTab = () => {
    try {
      window.open(window.location.href, '_blank');
    } catch {
      window.location.href = window.location.href;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-neutral-950 border border-rose-500/40 rounded-2xl p-6 shadow-[0_0_50px_rgba(244,63,94,0.15)] relative">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-neutral-800/80 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/30">
              <MicOff className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-['Syne'] font-bold text-base text-white">
                Microphone Permission Blocked
              </h3>
              <p className="text-[11px] font-mono text-neutral-400">
                Friday ko aapse baat karne ke liye Mic chahiye
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-white bg-neutral-900 border border-neutral-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Instructions */}
        <div className="space-y-3.5 text-xs text-neutral-300">
          <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-900/40 text-rose-200 flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="text-[12px] leading-relaxed">
              Chrome ya device ne microphone access block kar diya hai. Ise chalu karne ke 2 aasan tareeqe:
            </div>
          </div>

          {/* Solution 1: Direct Tab (Solves Iframe Permission blocks in AI Studio / Chrome mobile) */}
          {isInIframe && (
            <div className="p-3 bg-cyan-950/30 border border-cyan-500/30 rounded-xl space-y-2">
              <div className="text-[11px] font-mono font-bold text-cyan-400 uppercase tracking-wider flex items-center justify-between">
                <span>⚡ Fastest Fix (New Tab)</span>
                <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 rounded">RECOMMENDED</span>
              </div>
              <p className="text-[12px] text-neutral-300 leading-relaxed">
                Google Chrome mobile iframe ke andar mic permission block kar deta hai. Is button ko dabakar direct new tab mein kholein jahan Chrome seedha "Allow Mic" popup dega:
              </p>
              <button
                type="button"
                onClick={handleOpenDirectTab}
                className="w-full py-2 px-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-mono font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-[0_0_15px_rgba(0,242,254,0.3)]"
              >
                <span>Open in Direct Chrome Tab</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Solution 2: Chrome Address Bar Unblock */}
          <div className="space-y-2.5 bg-neutral-900/60 border border-neutral-800/80 rounded-xl p-3.5">
            <div className="font-mono text-[11px] text-cyan-400 uppercase tracking-wider font-semibold">
              {isMobile ? '📱 Mobile Chrome URL Bar Steps:' : '💻 Desktop Browser Steps:'}
            </div>

            <ol className="list-decimal pl-4 space-y-2 text-[12px] leading-relaxed text-neutral-300">
              <li>
                Chrome URL bar mein baayein (left) taraf bane <strong>Lock icon 🔒</strong> ya <strong>Settings/Tune icon</strong> par tap karein.
              </li>
              <li>
                <strong>Permissions</strong> ya <strong>Site settings</strong> mein jayein.
              </li>
              <li>
                <strong>Microphone 🎙️</strong> ko dhundhkar <strong>"Allow"</strong> ya <strong>"Ask"</strong> par set karein.
              </li>
              <li>
                Niche diye gaye <strong>"Try Again (Allow Mic)"</strong> button par tap karein!
              </li>
            </ol>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-5 pt-3.5 border-t border-neutral-800/80 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onRetry}
              className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-black font-semibold text-xs font-mono flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(0,242,254,0.3)]"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Try Again (Allow Mic)</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 text-xs font-mono transition-colors"
            >
              Cancel
            </button>
          </div>

          {onContinueWithText && (
            <button
              type="button"
              onClick={onContinueWithText}
              className="w-full py-2 px-3 rounded-xl bg-neutral-900/60 hover:bg-neutral-800 border border-neutral-800/80 text-[11px] font-mono text-neutral-400 hover:text-cyan-300 flex items-center justify-center gap-1.5 transition-colors"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Use Friday with Voice Output & Quick Text Commands</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
