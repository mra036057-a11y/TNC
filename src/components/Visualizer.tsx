import React, { useEffect, useRef } from 'react';
import { AssistantState, ThemeMood } from '../types';
import { AudioStreamer } from '../services/audioStreamer';
import { LiveSession } from '../services/liveSession';

interface VisualizerProps {
  state: AssistantState;
  theme: ThemeMood;
  audioStreamer: AudioStreamer;
  liveSession: LiveSession | null;
}

const THEME_COLORS: Record<ThemeMood, { primary: string; secondary: string; glow: string; border: string }> = {
  cyan: {
    primary: '#00f2fe',
    secondary: '#4facfe',
    glow: 'rgba(0, 242, 254, 0.45)',
    border: 'rgba(0, 242, 254, 0.25)',
  },
  magenta: {
    primary: '#f72585',
    secondary: '#7209b7',
    glow: 'rgba(247, 37, 133, 0.45)',
    border: 'rgba(247, 37, 133, 0.25)',
  },
  emerald: {
    primary: '#10b981',
    secondary: '#059669',
    glow: 'rgba(16, 185, 129, 0.45)',
    border: 'rgba(16, 185, 129, 0.25)',
  },
  amber: {
    primary: '#f59e0b',
    secondary: '#d97706',
    glow: 'rgba(245, 158, 11, 0.45)',
    border: 'rgba(245, 158, 11, 0.25)',
  },
  violet: {
    primary: '#a855f7',
    secondary: '#6366f1',
    glow: 'rgba(168, 85, 247, 0.45)',
    border: 'rgba(168, 85, 247, 0.25)',
  },
};

export const Visualizer: React.FC<VisualizerProps> = ({ state, theme, audioStreamer, liveSession }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const phaseRef = useRef<number>(0);
  const colorConfig = THEME_COLORS[theme] || THEME_COLORS.cyan;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const freqData = new Uint8Array(64);

    const render = () => {
      phaseRef.current += 0.04;
      const width = canvas.width;
      const height = canvas.height;
      const centerX = width / 2;
      const centerY = height / 2;

      ctx.clearRect(0, 0, width, height);

      const radiusBase = Math.min(width, height) * 0.28;

      if (state === 'speaking') {
        // Sample audio output data from Friday
        audioStreamer.getVisualizerData(freqData);
        let average = 0;
        for (let i = 0; i < freqData.length; i++) average += freqData[i];
        average = average / (freqData.length * 255);

        // Draw multiple radiant organic harmonic wave rings
        const waveCount = 3;
        for (let w = 0; w < waveCount; w++) {
          ctx.beginPath();
          const points = 72;
          const currentRadius = radiusBase * (0.95 + w * 0.18 + average * 0.4);

          for (let i = 0; i <= points; i++) {
            const angle = (i / points) * Math.PI * 2;
            const freqIndex = (i * 2) % freqData.length;
            const audioAmp = (freqData[freqIndex] / 255) * 28 * (average + 0.3);
            const wave = Math.sin(angle * 6 + phaseRef.current * 2 + w) * (6 + audioAmp);
            const r = currentRadius + wave;
            const x = centerX + Math.cos(angle) * r;
            const y = centerY + Math.sin(angle) * r;

            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.closePath();

          ctx.strokeStyle = w === 0 ? colorConfig.primary : colorConfig.secondary;
          ctx.lineWidth = w === 0 ? 3.5 : 2;
          ctx.shadowBlur = 24 + average * 30;
          ctx.shadowColor = colorConfig.glow;
          ctx.stroke();
        }

        // Concentric audio frequency bars radiating outward
        const barCount = 36;
        for (let i = 0; i < barCount; i++) {
          const angle = (i / barCount) * Math.PI * 2 + phaseRef.current * 0.2;
          const val = freqData[i % freqData.length] / 255;
          const innerR = radiusBase * 1.35;
          const outerR = innerR + val * 36 + 4;

          const x1 = centerX + Math.cos(angle) * innerR;
          const y1 = centerY + Math.sin(angle) * innerR;
          const x2 = centerX + Math.cos(angle) * outerR;
          const y2 = centerY + Math.sin(angle) * outerR;

          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.strokeStyle = colorConfig.primary;
          ctx.lineWidth = 2.5;
          ctx.shadowBlur = 12;
          ctx.shadowColor = colorConfig.glow;
          ctx.stroke();
        }

      } else if (state === 'listening') {
        // User microphone reactivity
        const micVolume = liveSession ? liveSession.getMicVolume() : 0;
        const pulse = Math.sin(phaseRef.current * 3) * 6 + micVolume * 45;

        // Reactive breathing radar waves
        for (let r = 1; r <= 3; r++) {
          ctx.beginPath();
          const dynamicR = radiusBase + r * 22 + pulse * (r * 0.4);
          ctx.arc(centerX, centerY, Math.max(10, dynamicR), 0, Math.PI * 2);
          ctx.strokeStyle = colorConfig.primary;
          ctx.lineWidth = 2.5 / r;
          ctx.shadowBlur = 18 + micVolume * 35;
          ctx.shadowColor = colorConfig.glow;
          ctx.stroke();
        }

        // Orbiting listening nodes
        const nodeCount = 6;
        for (let i = 0; i < nodeCount; i++) {
          const angle = (i / nodeCount) * Math.PI * 2 + phaseRef.current;
          const dist = radiusBase + 12 + micVolume * 25;
          const nx = centerX + Math.cos(angle) * dist;
          const ny = centerY + Math.sin(angle) * dist;

          ctx.beginPath();
          ctx.arc(nx, ny, 3.5 + micVolume * 4, 0, Math.PI * 2);
          ctx.fillStyle = colorConfig.primary;
          ctx.shadowBlur = 15;
          ctx.shadowColor = colorConfig.glow;
          ctx.fill();
        }

      } else if (state === 'connecting') {
        // Cybernetic rotating reticle & radar sweep
        const rotAngle = phaseRef.current * 2;

        // Outer reticle ring with dashes
        ctx.beginPath();
        ctx.arc(centerX, centerY, radiusBase + 24, rotAngle, rotAngle + Math.PI * 1.5);
        ctx.strokeStyle = colorConfig.primary;
        ctx.lineWidth = 3;
        ctx.shadowBlur = 20;
        ctx.shadowColor = colorConfig.glow;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(centerX, centerY, radiusBase + 10, -rotAngle, -rotAngle + Math.PI);
        ctx.strokeStyle = colorConfig.secondary;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Crosshairs
        const crossLength = 16;
        ctx.beginPath();
        ctx.moveTo(centerX - radiusBase - crossLength, centerY);
        ctx.lineTo(centerX - radiusBase, centerY);
        ctx.moveTo(centerX + radiusBase, centerY);
        ctx.lineTo(centerX + radiusBase + crossLength, centerY);
        ctx.moveTo(centerX, centerY - radiusBase - crossLength);
        ctx.lineTo(centerX, centerY - radiusBase);
        ctx.moveTo(centerX, centerY + radiusBase);
        ctx.lineTo(centerX, centerY + radiusBase + crossLength);
        ctx.strokeStyle = colorConfig.primary;
        ctx.lineWidth = 2;
        ctx.stroke();

      } else {
        // Disconnected / idle: subtle breathing rings
        const breath = Math.sin(phaseRef.current * 0.8) * 5;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radiusBase + breath, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.lineWidth = 1.5;
        ctx.shadowBlur = 8;
        ctx.shadowColor = 'rgba(255, 255, 255, 0.05)';
        ctx.stroke();

        // Standby tick marks
        const ticks = 24;
        for (let i = 0; i < ticks; i++) {
          const angle = (i / ticks) * Math.PI * 2;
          const r1 = radiusBase + 12;
          const r2 = r1 + (i % 6 === 0 ? 8 : 4);
          ctx.beginPath();
          ctx.moveTo(centerX + Math.cos(angle) * r1, centerY + Math.sin(angle) * r1);
          ctx.lineTo(centerX + Math.cos(angle) * r2, centerY + Math.sin(angle) * r2);
          ctx.strokeStyle = i % 6 === 0 ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.08)';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }

      animFrameIdRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [state, theme, audioStreamer, liveSession, colorConfig]);

  return (
    <div id="visualizer-wrapper" className="relative w-72 h-72 sm:w-88 sm:h-88 md:w-96 md:h-96 flex items-center justify-center select-none pointer-events-none">
      {/* Background radial glow */}
      <div
        className="absolute inset-0 rounded-full transition-all duration-700 blur-3xl opacity-40 pointer-events-none"
        style={{
          background: state !== 'disconnected'
            ? `radial-gradient(circle, ${colorConfig.primary} 0%, ${colorConfig.secondary} 40%, transparent 70%)`
            : 'radial-gradient(circle, rgba(255,255,255,0.05) 0%, transparent 70%)',
        }}
      />

      {/* HTML5 Canvas for real-time Web Audio rendering */}
      <canvas
        ref={canvasRef}
        width={400}
        height={400}
        className="absolute inset-0 w-full h-full"
      />
    </div>
  );
};
