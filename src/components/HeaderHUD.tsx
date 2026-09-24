import React, { useState } from 'react';
import { Palette, Info, ExternalLink, Sliders, ChevronDown, Download, Share2, Check, Smartphone, Brain } from 'lucide-react';
import { ThemeMood, AssistantState } from '../types';
import { usePWAInstall } from '../usePWAInstall';
import { MemoryBankModal } from './MemoryBankModal';

interface HeaderHUDProps {
  theme: ThemeMood;
  onThemeChange: (theme: ThemeMood) => void;
  voice: string;
  onVoiceChange: (voice: any) => void;
  actionCount: number;
  onOpenActions: () => void;
  isConnected: boolean;
  state?: AssistantState;
  onTogglePiP?: () => void;
  isPiPActive?: boolean;
}

const THEMES: { id: ThemeMood; label: string; color: string }[] = [
  { id: 'cyan', label: 'Neon Cyan', color: '#00f2fe' },
  { id: 'magenta', label: 'Electric Pink', color: '#f72585' },
  { id: 'emerald', label: 'Emerald Glow', color: '#10b981' },
  { id: 'amber', label: 'Solar Amber', color: '#f59e0b' },
  { id: 'violet', label: 'Cyber Violet', color: '#a855f7' },
];

const VOICES = [
  { id: 'Aoede', label: 'Aoede (Sassy & Bright)' },
  { id: 'Kore', label: 'Kore (Confident & Chill)' },
  { id: 'Zephyr', label: 'Zephyr (Warm & Expressive)' },
  { id: 'Puck', label: 'Puck (Playful)' },
  { id: 'Fenrir', label: 'Fenrir (Bold)' },
];

export const HeaderHUD: React.FC<HeaderHUDProps> = ({
  theme,
  onThemeChange,
  voice,
  onVoiceChange,
  actionCount,
  onOpenActions,
  isConnected,
  state,
  onTogglePiP,
  isPiPActive,
}) => {
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [showVoiceMenu, setShowVoiceMenu] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showMemoryModal, setShowMemoryModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();

  const handleCopyLink = () => {
    const url = window.location.href;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }).catch(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      });
    } else {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const isReconnecting = state === 'reconnecting';
  const indicatorColor = isReconnecting ? '#f59e0b' : isConnected ? '#10b981' : '#6b7280';
  const indicatorShadow = isReconnecting
    ? '0 0 10px #f59e0b'
    : isConnected
    ? '0 0 8px #10b981'
    : 'none';

  return (
    <>
      <header
        id="header-hud"
        className="w-full max-w-6xl mx-auto px-3 sm:px-6 py-2 flex items-center justify-between gap-2 z-30 select-none border-b border-white/[0.04]"
      >
        {/* Brand & Connection Status */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="relative flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-neutral-900 border border-neutral-800 backdrop-blur-md shrink-0">
            <span className="font-['Syne'] font-extrabold text-xs sm:text-sm text-neutral-100">F</span>
            <span
              className={`absolute -top-1 -right-1 w-2 h-2 rounded-full transition-colors duration-500 ${isReconnecting ? 'animate-ping' : ''}`}
              style={{
                backgroundColor: indicatorColor,
                boxShadow: indicatorShadow,
              }}
            />
          </div>
          <div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h1 className="font-['Syne'] text-sm sm:text-base font-bold tracking-tight text-white leading-none">
                FRIDAY
              </h1>
              <span
                className={`text-[9px] sm:text-[10px] font-mono px-1.5 py-0.5 rounded border transition-colors ${
                  isReconnecting
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
                    : isConnected
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                    : 'bg-neutral-800/80 text-neutral-400 border-neutral-700/50'
                }`}
              >
                {isReconnecting ? '⚡ RECONNECT' : isConnected ? '● LIVE' : 'OFFLINE'}
              </span>
            </div>
            <p className="text-[10px] text-neutral-400 font-mono tracking-wider hidden sm:block">
              VOICE-TO-VOICE AI
            </p>
          </div>
        </div>

        {/* All Top Controls in Single Smooth Row (No multi-line stacking) */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none flex-nowrap py-0.5 max-w-[68vw] sm:max-w-none">
          {/* Button 1: Home Screen (PiP / Background Mode) */}
          {isConnected && onTogglePiP && (
            <button
              id="btn-home-screen-mode"
              type="button"
              onClick={onTogglePiP}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/40 hover:border-emerald-300 text-emerald-300 text-xs font-mono transition-all backdrop-blur-md shadow-[0_0_10px_rgba(16,185,129,0.2)] active:scale-95 shrink-0"
              title="Home Screen Mode: Chrome minimize karke bhi bol sakte hain"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Home</span>
              {isPiPActive && <span className="text-[10px] text-cyan-300 font-bold">· Orb</span>}
            </button>
          )}

          {/* Button 2: Memory Bank */}
          <button
            id="btn-memory-bank"
            type="button"
            onClick={() => setShowMemoryModal(true)}
            className="flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-full bg-cyan-950/40 border border-cyan-500/40 hover:border-cyan-400 text-cyan-300 text-xs font-mono transition-all backdrop-blur-md shadow-[0_0_10px_rgba(0,242,254,0.15)] active:scale-95 shrink-0"
            title="Friday's Memory Bank"
          >
            <Brain className="w-3 h-3 text-cyan-400" />
            <span>Memory</span>
          </button>

          {/* Button 3: Actions & Tools */}
          <button
            id="btn-open-actions"
            type="button"
            onClick={onOpenActions}
            className="relative flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-full bg-neutral-900/80 border border-neutral-800 hover:border-neutral-700 text-neutral-300 hover:text-white text-xs font-mono transition-all backdrop-blur-md active:scale-95 shrink-0"
            title="Browser Actions & Tool Calls"
          >
            <ExternalLink className="w-3 h-3 text-neutral-400" />
            <span>Actions</span>
            {actionCount > 0 && (
              <span className="w-3.5 h-3.5 rounded-full bg-cyan-500/20 text-cyan-400 text-[9px] flex items-center justify-center font-bold">
                {actionCount}
              </span>
            )}
          </button>

          {/* Button 4: Voice Selector */}
          <div className="relative shrink-0">
            <button
              id="btn-voice-menu"
              type="button"
              onClick={() => {
                setShowVoiceMenu(!showVoiceMenu);
                setShowThemeMenu(false);
              }}
              className="flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-full bg-neutral-900/80 border border-neutral-800 hover:border-neutral-700 text-neutral-300 hover:text-white text-xs font-mono transition-all backdrop-blur-md active:scale-95"
            >
              <Sliders className="w-3 h-3 text-neutral-400" />
              <span>{voice}</span>
              <ChevronDown className="w-2.5 h-2.5 opacity-60" />
            </button>

            {showVoiceMenu && (
              <div className="absolute right-0 mt-2 w-48 py-2 rounded-xl bg-neutral-900/95 border border-neutral-800 shadow-2xl backdrop-blur-xl z-50">
                <div className="px-3 py-1 text-[10px] font-mono text-neutral-500 uppercase tracking-wider">
                  Select Persona Voice
                </div>
                {VOICES.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => {
                      onVoiceChange(v.id);
                      setShowVoiceMenu(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-xs font-mono flex items-center justify-between hover:bg-neutral-800/80 transition-colors ${
                      voice === v.id ? 'text-cyan-400 font-semibold' : 'text-neutral-300'
                    }`}
                  >
                    <span>{v.label}</span>
                    {voice === v.id && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Button 5: Theme Cycler */}
          <div className="relative shrink-0">
            <button
              id="btn-theme-menu"
              type="button"
              onClick={() => {
                setShowThemeMenu(!showThemeMenu);
                setShowVoiceMenu(false);
              }}
              className="flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-full bg-neutral-900/80 border border-neutral-800 hover:border-neutral-700 text-neutral-300 hover:text-white text-xs font-mono transition-all backdrop-blur-md active:scale-95"
              title="Change Mood Glow"
            >
              <Palette className="w-3 h-3 text-neutral-400" />
              <span>Theme</span>
            </button>

            {showThemeMenu && (
              <div className="absolute right-0 mt-2 w-40 py-2 rounded-xl bg-neutral-900/95 border border-neutral-800 shadow-2xl backdrop-blur-xl z-50">
                <div className="px-3 py-1 text-[10px] font-mono text-neutral-500 uppercase tracking-wider">
                  Interface Mood
                </div>
                {THEMES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      onThemeChange(t.id);
                      setShowThemeMenu(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-xs font-mono flex items-center gap-2 hover:bg-neutral-800/80 transition-colors ${
                      theme === t.id ? 'text-neutral-100 font-semibold' : 'text-neutral-400'
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: t.color, boxShadow: `0 0 6px ${t.color}` }}
                    />
                    <span>{t.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Button 6: Copy / Share App Link Button */}
          <button
            id="btn-share-app"
            type="button"
            onClick={() => setShowShareModal(true)}
            className="flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-full bg-neutral-900/80 border border-neutral-800 hover:border-neutral-700 text-neutral-300 hover:text-white text-xs font-mono transition-all backdrop-blur-md active:scale-95 shrink-0"
            title="App Link & Share"
          >
            <Share2 className="w-3 h-3 text-cyan-400" />
            <span>Share</span>
          </button>

          {/* Button 7: In-App Install APK / PWA Button (if installable) */}
          {isInstallable && !isInstalled && (
            <button
              id="btn-install-app"
              type="button"
              onClick={install}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-cyan-500 text-black hover:bg-cyan-400 text-xs font-bold font-mono transition-all shadow-[0_0_15px_rgba(0,242,254,0.4)] animate-pulse active:scale-95 shrink-0"
              title="Install Friday AI App directly on your phone"
            >
              <Download className="w-3 h-3" />
              <span>Install</span>
            </button>
          )}

          {/* Button 8: Persona Info */}
          <button
            id="btn-info-modal"
            type="button"
            onClick={() => setShowInfoModal(true)}
            className="flex items-center gap-1 px-2 py-1 rounded-full bg-neutral-900/80 border border-neutral-800 hover:border-neutral-700 text-neutral-400 hover:text-neutral-200 text-xs font-mono transition-all backdrop-blur-md active:scale-95 shrink-0"
            title="About Friday AI"
          >
            <Info className="w-3 h-3" />
          </button>
        </div>
      </header>

      {/* Share / Copy App Link & APK Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-neutral-950 border border-neutral-800 rounded-2xl p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800 mb-4">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-cyan-400" />
                <h2 className="font-['Syne'] font-bold text-base text-white">App Link & Mobile APK</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowShareModal(false)}
                className="text-neutral-400 hover:text-white text-xs font-mono px-2 py-1 rounded bg-neutral-900 border border-neutral-800"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs font-sans text-neutral-300">
              {/* Copy URL section */}
              <div>
                <label className="block text-[11px] font-mono text-neutral-400 mb-1.5 uppercase tracking-wider">
                  Direct Live Web App URL:
                </label>
                <div className="flex items-center gap-2 p-2 rounded-xl bg-neutral-900 border border-neutral-800">
                  <input
                    type="text"
                    readOnly
                    value={window.location.href}
                    className="flex-1 bg-transparent text-xs text-neutral-200 font-mono outline-none select-all"
                  />
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-mono font-bold text-xs transition-colors shrink-0"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-black" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Share2 className="w-3.5 h-3.5" />
                        <span>Copy URL</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Install instructions */}
              <div className="p-3.5 rounded-xl bg-neutral-900/60 border border-neutral-800 space-y-2">
                <h4 className="text-white font-semibold font-mono text-xs text-cyan-400">
                  🚀 Mobile Par Install Karne Ke 2 Aasan Tareeqe:
                </h4>
                <ol className="list-decimal pl-4 space-y-1.5 text-neutral-300 text-[11px] leading-relaxed">
                  <li>
                    <strong>Tareeqa 1 (Direct Install):</strong> Apne phone ke Chrome browser me ye URL open karein, fir <strong>3 dots (⋮)</strong> par click karke <strong>"Add to Home screen" / "Install app"</strong> karein.
                  </li>
                  <li>
                    <strong>Tareeqa 2 (APK Generator):</strong> <a href="https://www.pwabuilder.com/" target="_blank" rel="noreferrer" className="text-cyan-400 underline">PWABuilder.com</a> par apna live URL paste karein. Ab <strong>manifest.json</strong> aur icons verify ho chuke hain, isliye <strong>"Package For Stores &gt; Android APK"</strong> button click karte hi download ho jayega!
                  </li>
                </ol>
              </div>

              {isIOS && (
                <div className="p-3 rounded-lg bg-neutral-900/80 border border-neutral-800 text-[11px] text-neutral-400">
                  <strong className="text-white">iPhone / iPad user:</strong> Safari toolbar ke <strong>Share icon</strong> par tap karein aur <strong>"Add to Home Screen"</strong> select karein.
                </div>
              )}
            </div>

            <div className="mt-5 pt-3 border-t border-neutral-800 text-center">
              <button
                type="button"
                onClick={() => setShowShareModal(false)}
                className="w-full py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs font-mono text-neutral-300 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Persona Info Modal */}
      {showInfoModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md bg-neutral-950 border border-neutral-800 rounded-2xl p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-neutral-800 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_8px_#00f2fe]" />
                <h2 className="font-['Syne'] font-bold text-lg text-white">Friday Persona Matrix</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowInfoModal(false)}
                className="text-neutral-400 hover:text-white text-xs font-mono px-2 py-1 rounded bg-neutral-900 border border-neutral-800"
              >
                Close
              </button>
            </div>

            <div className="space-y-3 text-xs text-neutral-300 leading-relaxed font-sans">
              <div className="p-2.5 rounded-xl bg-cyan-950/40 border border-cyan-500/30">
                <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-semibold block mb-0.5">
                  Creator & Boss
                </span>
                <p className="text-white font-semibold text-sm">
                  Aniruddha Dabhade <span className="text-xs text-cyan-300 font-mono font-normal">(Boss)</span>
                </p>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  Friday AI was built, programmed, and designed exclusively for Aniruddha Dabhade.
                </p>
              </div>

              <p>
                <strong className="text-white">Personality:</strong> Young, confident, witty, and playfully sassy. Loyal personal AI assistant addressing Aniruddha as Boss.
              </p>
              <p>
                <strong className="text-white">Pure Audio Engine:</strong> Powered by Gemini Live API (<code className="text-cyan-400 font-mono">gemini-3.1-flash-live-preview</code>). Audio is streamed at 16kHz PCM and synthesized live at 24kHz Web Audio with zero text latency.
              </p>
              <div>
                <strong className="text-white">Mobile App Control & Voice Actions:</strong> Ask Friday to open or search in any app:
                <ul className="mt-1 pl-3 space-y-1 list-disc text-neutral-400">
                  <li><strong className="text-cyan-400">Play Store:</strong> <em>"Play Store par WhatsApp download karo"</em> or <em>"Install BGMI"</em></li>
                  <li><strong className="text-cyan-400">YouTube:</strong> <em>"YouTube par Arijit Singh ke songs chalao"</em></li>
                  <li><strong className="text-cyan-400">Maps:</strong> <em>"Maps par petrol pump / restaurant dikhao"</em></li>
                  <li><strong className="text-cyan-400">WhatsApp:</strong> <em>"WhatsApp kholo"</em> or send a text</li>
                  <li><strong className="text-cyan-400">Google / Chrome:</strong> <em>"Google par search karo"</em></li>
                </ul>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-neutral-800/80 flex items-center justify-between text-[11px] font-mono text-neutral-500">
              <span>Model: gemini-3.1-flash-live-preview</span>
              <span>Latency: Real-time PCM</span>
            </div>
          </div>
        </div>
      )}

      {/* Memory Bank Modal */}
      <MemoryBankModal
        isOpen={showMemoryModal}
        onClose={() => setShowMemoryModal(false)}
        theme={theme}
      />
    </>
  );
};

