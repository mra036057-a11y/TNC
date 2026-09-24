import React from 'react';
import { Mic, MicOff, Power, Sparkles, Volume2, Radio } from 'lucide-react';
import { AssistantState, ThemeMood } from '../types';

interface CentralControlProps {
  state: AssistantState;
  isMuted: boolean;
  theme: ThemeMood;
  onTogglePower: () => void;
  onToggleMute: () => void;
  onInterrupt: () => void;
}

export const CentralControl: React.FC<CentralControlProps> = ({
  state,
  isMuted,
  theme,
  onTogglePower,
  onToggleMute,
  onInterrupt,
}) => {
  const isConnected = state !== 'disconnected';

  const getStatusText = () => {
    switch (state) {
      case 'connecting':
        return { title: 'CONNECTING...', desc: 'Establishing neural audio link' };
      case 'reconnecting':
        return { title: 'RECONNECTING...', desc: 'Restoring live link in Chrome' };
      case 'listening':
        return isMuted
          ? { title: 'MIC MUTED', desc: 'Tap mic icon to unmute' }
          : { title: 'FRIDAY IS LISTENING', desc: 'Speak naturally, she is right here' };
      case 'speaking':
        return { title: 'FRIDAY IS SPEAKING', desc: 'Tap to interrupt or speak over her' };
      case 'disconnected':
      default:
        return { title: 'FRIDAY DORMANT', desc: 'Tap the core to activate voice link' };
    }
  };

  const status = getStatusText();

  const themeClasses: Record<ThemeMood, { glow: string; ring: string; text: string; bg: string }> = {
    cyan: {
      glow: 'shadow-[0_0_50px_rgba(0,242,254,0.4)]',
      ring: 'border-cyan-400 text-cyan-400',
      text: 'text-cyan-400',
      bg: 'bg-cyan-500',
    },
    magenta: {
      glow: 'shadow-[0_0_50px_rgba(247,37,133,0.4)]',
      ring: 'border-pink-500 text-pink-400',
      text: 'text-pink-400',
      bg: 'bg-pink-500',
    },
    emerald: {
      glow: 'shadow-[0_0_50px_rgba(16,185,129,0.4)]',
      ring: 'border-emerald-400 text-emerald-400',
      text: 'text-emerald-400',
      bg: 'bg-emerald-500',
    },
    amber: {
      glow: 'shadow-[0_0_50px_rgba(245,158,11,0.4)]',
      ring: 'border-amber-400 text-amber-400',
      text: 'text-amber-400',
      bg: 'bg-amber-500',
    },
    violet: {
      glow: 'shadow-[0_0_50px_rgba(168,85,247,0.4)]',
      ring: 'border-purple-400 text-purple-400',
      text: 'text-purple-400',
      bg: 'bg-purple-500',
    },
  };

  const currentTheme = themeClasses[theme] || themeClasses.cyan;

  return (
    <div id="central-control-container" className="flex flex-col items-center justify-center z-10">
      {/* Central Interactive Core Button */}
      <div className="relative group">
        {/* Animated outer ring */}
        {isConnected && (
          <div
            className={`absolute -inset-4 rounded-full border border-dashed animate-spin opacity-40 ${currentTheme.text}`}
            style={{ animationDuration: state === 'speaking' ? '8s' : '18s' }}
          />
        )}

        {/* Pulse glow background */}
        <div
          className={`absolute -inset-2 rounded-full transition-all duration-500 blur-md ${
            isConnected ? `${currentTheme.bg} opacity-50 ${currentTheme.glow}` : 'bg-neutral-800 opacity-20'
          }`}
        />

        {/* Main Central Button */}
        <button
          id="btn-central-power"
          type="button"
          onClick={onTogglePower}
          className={`relative w-28 h-28 sm:w-32 sm:h-32 rounded-full flex flex-col items-center justify-center transition-all duration-300 transform active:scale-95 focus:outline-none border-2 backdrop-blur-xl ${
            isConnected
              ? `bg-neutral-950/90 border-white/25 ${currentTheme.glow} ${currentTheme.text}`
              : 'bg-neutral-900/90 border-neutral-700/60 text-neutral-400 hover:border-neutral-500 hover:text-neutral-200'
          }`}
          aria-label={isConnected ? 'Disconnect Friday' : 'Activate Friday'}
        >
          {state === 'connecting' ? (
            <div className="flex flex-col items-center gap-1">
              <Radio className="w-8 h-8 animate-pulse" />
              <span className="text-[10px] font-mono tracking-wider font-semibold uppercase">Linking</span>
            </div>
          ) : state === 'speaking' ? (
            <div className="flex flex-col items-center gap-1">
              <Volume2 className="w-9 h-9 animate-bounce" />
              <span className="text-[10px] font-mono tracking-wider font-semibold uppercase">Speaking</span>
            </div>
          ) : isConnected ? (
            <div className="flex flex-col items-center gap-1">
              {isMuted ? <MicOff className="w-8 h-8 text-rose-400" /> : <Mic className="w-8 h-8 animate-pulse" />}
              <span className="text-[10px] font-mono tracking-wider font-semibold uppercase">Live</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1">
              <Power className="w-8 h-8 transition-transform group-hover:scale-110" />
              <span className="text-[10px] font-mono tracking-wider font-semibold uppercase">Activate</span>
            </div>
          )}
        </button>
      </div>

      {/* State Badges & Description */}
      <div className="mt-8 text-center px-4 max-w-sm">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-900/80 border border-neutral-800 backdrop-blur-md mb-2">
          <span
            className={`w-2 h-2 rounded-full ${
              state === 'speaking'
                ? `${currentTheme.bg} animate-ping`
                : state === 'listening'
                ? `${currentTheme.bg} animate-pulse`
                : state === 'connecting'
                ? 'bg-amber-400 animate-spin'
                : 'bg-neutral-600'
            }`}
          />
          <h2 className="text-xs font-mono font-semibold tracking-wider text-neutral-200 uppercase">
            {status.title}
          </h2>
        </div>
        <p className="text-xs text-neutral-400 font-sans tracking-wide">
          {status.desc}
        </p>
      </div>

      {/* Secondary Controls Bar (Mute, Interrupt, Disconnect) */}
      {isConnected && (
        <div className="flex items-center gap-3 mt-6">
          {/* Mute Button */}
          <button
            id="btn-toggle-mute"
            type="button"
            onClick={onToggleMute}
            className={`flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-mono font-medium transition-all backdrop-blur-md ${
              isMuted
                ? 'bg-rose-500/20 border-rose-500/50 text-rose-300 hover:bg-rose-500/30'
                : 'bg-neutral-900/80 border-neutral-800 text-neutral-300 hover:border-neutral-700'
            }`}
          >
            {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
            <span>{isMuted ? 'Unmute' : 'Mute Mic'}</span>
          </button>

          {/* Interrupt Button (Visible when Friday is speaking) */}
          {state === 'speaking' && (
            <button
              id="btn-interrupt"
              type="button"
              onClick={onInterrupt}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-neutral-900/80 border border-neutral-700 text-neutral-200 text-xs font-mono font-medium hover:border-neutral-500 hover:bg-neutral-800 transition-all backdrop-blur-md"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Cut In</span>
            </button>
          )}

          {/* End Call Button */}
          <button
            id="btn-end-session"
            type="button"
            onClick={onTogglePower}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs font-mono font-medium hover:bg-rose-900/60 transition-all backdrop-blur-md"
          >
            <Power className="w-3.5 h-3.5" />
            <span>End Call</span>
          </button>
        </div>
      )}
    </div>
  );
};
