import React, { useEffect, useRef, useState } from 'react';
import { AssistantState, ThemeMood } from '../types';
import { AudioStreamer } from '../services/audioStreamer';
import { LiveSession } from '../services/liveSession';
import { ShieldAlert, Sparkles, Send } from 'lucide-react';

interface InteractiveSphereProps {
  state: AssistantState;
  theme: ThemeMood;
  isMuted: boolean;
  isMicBlocked?: boolean;
  onRequestMic?: () => void;
  audioStreamer: AudioStreamer;
  liveSession: LiveSession | null;
  onToggleMic: () => void;
  statusText: string;
  onDeactivate: () => void;
  onSendText?: (text: string) => void;
  onTogglePiP?: () => void;
  isPiPActive?: boolean;
}

interface SphereDot {
  x: number;
  y: number;
  z: number;
  size: number;
}

export const InteractiveSphere: React.FC<InteractiveSphereProps> = ({
  state,
  theme,
  isMuted,
  isMicBlocked,
  onRequestMic,
  audioStreamer,
  liveSession,
  onToggleMic,
  statusText,
  onDeactivate,
  onSendText,
  onTogglePiP,
  isPiPActive,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [inputText, setInputText] = useState('');

  // Theme color definitions for the glowing dots and highlights
  const themeColors: Record<ThemeMood, { r: number; g: number; b: number; hex: string }> = {
    cyan: { r: 0, g: 242, b: 254, hex: '#00f2fe' },
    magenta: { r: 247, g: 37, b: 133, hex: '#f72585' },
    emerald: { r: 16, g: 185, b: 129, hex: '#10b981' },
    amber: { r: 245, g: 158, b: 11, hex: '#f59e0b' },
    violet: { r: 168, g: 85, b: 247, hex: '#a855f7' },
  };

  const currentColor = isMicBlocked
    ? { r: 244, g: 63, b: 94, hex: '#f43f5e' }
    : themeColors[theme] || themeColors.cyan;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animationId: number;
    let dots: SphereDot[] = [];
    const numDots = 480;
    const baseRadius = 135;
    let rotX = 0;
    let rotY = 0;
    let targetSpeed = 0.008;
    let currentSpeed = 0.008;
    let pulseTime = 0;

    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      const width = window.innerWidth;
      const height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const createSphereDots = () => {
      dots = [];
      const phi = Math.PI * (3 - Math.sqrt(5)); // Golden angle
      for (let i = 0; i < numDots; i++) {
        const y = 1 - (i / (numDots - 1)) * 2; // -1 to 1
        const r = Math.sqrt(Math.max(0, 1 - y * y));
        const theta = phi * i;
        dots.push({
          x: Math.cos(theta) * r * baseRadius,
          y: y * baseRadius,
          z: Math.sin(theta) * r * baseRadius,
          size: Math.random() * 1.5 + 1.1,
        });
      }
    };

    resizeCanvas();
    createSphereDots();
    window.addEventListener('resize', resizeCanvas);

    const renderDots = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      ctx.clearRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2;

      // Extract real audio levels from AudioStreamer and LiveSession
      const assistantVol = audioStreamer ? audioStreamer.getVolume() : 0;
      const micVol = liveSession && !isMuted ? liveSession.getMicVolume() : 0;

      const isSpeaking = state === 'speaking' || assistantVol > 0.04;
      const isListening = state === 'listening';
      const isConnecting = state === 'connecting';

      // Speed changes depending on status
      if (isSpeaking) {
        targetSpeed = 0.022 + assistantVol * 0.02;
      } else if (isListening) {
        targetSpeed = 0.012 + micVol * 0.02;
      } else if (isConnecting) {
        targetSpeed = 0.018;
      } else {
        targetSpeed = 0.007;
      }

      currentSpeed += (targetSpeed - currentSpeed) * 0.08;
      rotX += currentSpeed;
      rotY += currentSpeed * 0.85;

      const pulseIncrement = isSpeaking ? 0.07 + assistantVol * 0.1 : isListening ? 0.04 + micVol * 0.08 : 0.02;
      pulseTime += pulseIncrement;

      const cosX = Math.cos(rotX);
      const sinX = Math.sin(rotX);
      const cosY = Math.cos(rotY);
      const sinY = Math.sin(rotY);

      for (let i = 0; i < numDots; i++) {
        const dot = dots[i];

        // Dynamic reactive radius
        let dynamicRadius = baseRadius;
        if (isSpeaking) {
          const wave = Math.sin(pulseTime + dot.y * 0.06);
          dynamicRadius += wave * (12 + assistantVol * 25);
        } else if (isListening) {
          const wave = Math.sin(pulseTime + dot.x * 0.05);
          dynamicRadius += wave * (4 + micVol * 18);
        } else if (isConnecting) {
          dynamicRadius += Math.sin(pulseTime * 2 + dot.y * 0.04) * 6;
        } else {
          dynamicRadius += Math.sin(pulseTime + dot.x * 0.03) * 3;
        }

        const scaleRatio = dynamicRadius / baseRadius;
        const x = dot.x * scaleRatio;
        const y = dot.y * scaleRatio;
        const z = dot.z * scaleRatio;

        // 3D rotation
        const y1 = y * cosX - z * sinX;
        const z1 = y * sinX + z * cosX;
        const x2 = x * cosY + z1 * sinY;
        const z2 = -x * sinY + z1 * cosY;

        // Perspective projection
        const focalLength = 340;
        const perspective = focalLength / (focalLength + z2);
        const screenX = x2 * perspective + centerX;
        const screenY = y1 * perspective + centerY;

        // Depth alpha and radius
        const depthRatio = Math.max(0.12, (z2 + baseRadius) / (2 * baseRadius));
        const dotRadius = dot.size * perspective * (isSpeaking ? 1.35 : 1.05);

        ctx.beginPath();
        ctx.arc(screenX, screenY, Math.max(0.5, dotRadius), 0, Math.PI * 2);

        if (isSpeaking) {
          // Glow with active theme color
          ctx.fillStyle = `rgba(${currentColor.r}, ${currentColor.g}, ${currentColor.b}, ${depthRatio})`;
        } else if (isListening) {
          // Mic reactive pulse - blend cyan/theme with white
          if (micVol > 0.05 && Math.random() > 0.6) {
            ctx.fillStyle = `rgba(${currentColor.r}, ${currentColor.g}, ${currentColor.b}, ${Math.min(1, depthRatio * 1.4)})`;
          } else {
            ctx.fillStyle = `rgba(255, 255, 255, ${depthRatio * 0.9})`;
          }
        } else if (isConnecting) {
          ctx.fillStyle = `rgba(${currentColor.r}, ${currentColor.g}, ${currentColor.b}, ${depthRatio * 0.7})`;
        } else {
          ctx.fillStyle = `rgba(255, 255, 255, ${depthRatio * 0.85})`;
        }

        ctx.fill();
      }

      animationId = requestAnimationFrame(renderDots);
    };

    renderDots();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [state, theme, isMuted, audioStreamer, liveSession, currentColor]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendText?.(inputText.trim());
    setInputText('');
  };

  return (
    <div className="absolute inset-0 z-10 flex flex-col justify-between items-center pointer-events-none select-none">
      {/* Top Floating Status Container */}
      <div
        id="statusBox"
        className="pointer-events-auto mt-2 sm:mt-4 flex items-center gap-2 px-4 py-1.5 sm:px-5 sm:py-2 rounded-full bg-white/[0.06] backdrop-blur-xl border shadow-[0_0_25px_rgba(0,242,254,0.2)] transition-all duration-300 z-30"
        style={{
          borderColor: `${currentColor.hex}55`,
          boxShadow: `0 0 25px ${currentColor.hex}25`,
        }}
      >
        <div
          className="w-2.5 h-2.5 rounded-full animate-ping-slow"
          style={{
            backgroundColor: currentColor.hex,
            boxShadow: `0 0 10px ${currentColor.hex}`,
          }}
        />
        <span
          id="statusText"
          className="text-xs sm:text-sm font-semibold tracking-[0.18em] uppercase font-mono"
          style={{
            color: currentColor.hex,
            textShadow: `0 0 10px ${currentColor.hex}88`,
          }}
        >
          {isMicBlocked ? 'MIC BLOCKED' : statusText}
        </span>

        {isMicBlocked && onRequestMic && (
          <button
            type="button"
            onClick={onRequestMic}
            className="ml-1 text-[10px] font-mono font-bold bg-rose-500 hover:bg-rose-400 text-black px-2 py-0.5 rounded-md flex items-center gap-1 transition-all"
          >
            <ShieldAlert className="w-3 h-3" />
            <span>ALLOW MIC</span>
          </button>
        )}

        {/* Small Home Screen Button in Top Status Pill */}
        {onTogglePiP && (
          <button
            type="button"
            onClick={onTogglePiP}
            className="ml-1 px-2 py-0.5 rounded-full bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-[10px] font-mono text-emerald-300 hover:text-emerald-200 transition-all flex items-center gap-1 shrink-0 active:scale-95"
            title="Home Screen Active: Chrome minimize karke bhi bolo. Tap to float orb."
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Home Screen</span>
            {isPiPActive && <span className="text-cyan-400 font-bold">· Orb</span>}
          </button>
        )}

        <button
          type="button"
          onClick={onDeactivate}
          aria-label="Deactivate AI"
          className="ml-2 text-white/60 hover:text-white transition-colors text-sm px-1.5 py-0.5 rounded-md hover:bg-white/10"
        >
          ✕
        </button>
      </div>

      {/* Interactive 3D Sphere Canvas */}
      <canvas
        id="dotCanvas"
        ref={canvasRef}
        onClick={isMicBlocked && onRequestMic ? onRequestMic : onToggleMic}
        className="absolute inset-0 w-full h-full cursor-pointer pointer-events-auto z-10"
        title={isMicBlocked ? 'Mic blocked — tap to allow microphone' : 'Tap sphere to speak or mute'}
      />

      {/* Bottom Controls & Command Bar */}
      <div className="relative z-30 w-full max-w-md px-4 mb-4 sm:mb-6 flex flex-col items-center gap-2 pointer-events-auto">
        {/* Hint Banner */}
        <div
          id="hintText"
          className="text-[11px] sm:text-xs font-mono tracking-[0.14em] text-white/80 animate-pulse text-center px-2"
          style={{ textShadow: '0 0 8px rgba(0,0,0,0.8)' }}
        >
          {isMicBlocked
            ? 'MICROPHONE BLOCKED — TAP "ALLOW MIC" OR USE COMMANDS BELOW'
            : state === 'speaking'
            ? 'FRIDAY IS SPEAKING — TAP SPHERE TO INTERRUPT'
            : isMuted
            ? 'MIC MUTED — TAP SPHERE TO UNMUTE'
            : state === 'listening'
            ? 'LISTENING — SPEAK IN HINDI, ENGLISH OR ANY LANGUAGE 🎙️'
            : state === 'connecting'
            ? 'CONNECTING TO FRIDAY...'
            : 'TAP SPHERE TO SPEAK (HINDI / ENGLISH / ANY)'}
        </div>

        {/* Quick Voice/Text Starter Chips */}
        <div className="flex items-center justify-center gap-1.5 overflow-x-auto max-w-full pb-1 scrollbar-none text-[11px] font-mono">
          <button
            type="button"
            onClick={() => onSendText?.('Tumhe kisne banaya hai?')}
            className="shrink-0 px-2.5 py-1 rounded-full bg-white/[0.08] hover:bg-cyan-500/20 border border-white/10 hover:border-cyan-400/40 text-neutral-300 hover:text-cyan-300 transition-all flex items-center gap-1"
          >
            <Sparkles className="w-3 h-3 text-cyan-400" />
            <span>Kisne banaya?</span>
          </button>
          <button
            type="button"
            onClick={() => onSendText?.('Friday wapas aa jao')}
            className="shrink-0 px-2.5 py-1 rounded-full bg-white/[0.08] hover:bg-emerald-500/20 border border-white/10 hover:border-emerald-400/40 text-neutral-300 hover:text-emerald-300 transition-all"
          >
            <span>Friday wapas aa jao</span>
          </button>
          <button
            type="button"
            onClick={() => onSendText?.('Mobile screen off karo')}
            className="shrink-0 px-2.5 py-1 rounded-full bg-white/[0.08] hover:bg-rose-500/20 border border-white/10 hover:border-rose-400/40 text-neutral-300 hover:text-rose-300 transition-all"
          >
            <span>Screen off</span>
          </button>
        </div>

        {/* Quick Text Command Bar for Boss */}
        <form
          onSubmit={handleFormSubmit}
          className="w-full flex items-center gap-2 bg-neutral-950/80 backdrop-blur-xl border border-white/10 rounded-2xl p-1 shadow-xl"
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Command Friday by text..."
            className="flex-1 bg-transparent px-3 py-1.5 text-xs text-white placeholder-neutral-500 font-sans outline-none"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="p-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-30 disabled:hover:bg-cyan-500 text-black transition-all shrink-0"
            title="Send to Friday"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};
