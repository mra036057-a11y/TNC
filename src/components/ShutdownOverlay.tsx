import React, { useState, useEffect } from 'react';
import { Power, Cpu, Terminal, Sparkles, CheckCircle2, Lock, Settings, Info, ChevronDown, ChevronUp } from 'lucide-react';

export type DevicePowerStatus = 'online' | 'shutting_down' | 'powered_off' | 'booting';

interface ShutdownOverlayProps {
  status: DevicePowerStatus;
  onPowerOn: () => void;
  onCancelShutdown?: () => void;
}

export const ShutdownOverlay: React.FC<ShutdownOverlayProps> = ({
  status,
  onPowerOn,
}) => {
  const [bootStep, setBootStep] = useState(0);
  const [showSandboxGuide, setShowSandboxGuide] = useState(false);
  const [isPureOledBlack, setIsPureOledBlack] = useState(false);

  // Play power-down sound effect
  useEffect(() => {
    if (status === 'shutting_down') {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'sine';
          // Sweep from 600Hz down to 40Hz
          osc.frequency.setValueAtTime(600, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 1.6);

          gain.gain.setValueAtTime(0.3, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.8);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start();
          osc.stop(ctx.currentTime + 1.8);
        }
      } catch (err) {
        console.warn('Audio shutdown sound error:', err);
      }
    }
  }, [status]);

  // Play power-on boot sound effect & progress steps
  useEffect(() => {
    if (status === 'booting') {
      setBootStep(1);

      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          
          // Triple chord ascending chime
          [220, 440, 880].forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.15);
            gain.gain.setValueAtTime(0.2, ctx.currentTime + idx * 0.15);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.15 + 0.8);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(ctx.currentTime + idx * 0.15);
            osc.stop(ctx.currentTime + idx * 0.15 + 0.8);
          });
        }
      } catch (err) {
        console.warn('Boot sound error:', err);
      }

      const t1 = setTimeout(() => setBootStep(2), 600);
      const t2 = setTimeout(() => setBootStep(3), 1300);
      const t3 = setTimeout(() => setBootStep(4), 2100);

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    }
  }, [status]);

  if (status === 'online') return null;

  // Trigger Real Android Screen Lock via system Intent
  const triggerAndroidRealLock = () => {
    try {
      // 1. Try Screen Off app / shortcut intent
      window.location.href = 'intent:#Intent;component=com.katecca.screenofflock/.ScreenOffActivity;end';
    } catch {
      // 2. Fallback to MacroDroid Lock Screen intent
      window.location.href = 'intent:#Intent;action=com.arlosoft.macrodroid.action.LOCK_SCREEN;end';
    }
  };

  // Open Android Display Settings directly
  const openDisplaySettings = () => {
    try {
      window.location.href = 'intent:#Intent;action=android.settings.DISPLAY_SETTINGS;end';
    } catch (err) {
      console.warn('Display settings intent failed:', err);
    }
  };

  // Toggle true pitch-black OLED standby (physically turns off pixels on OLED phones)
  if (isPureOledBlack) {
    return (
      <div
        onClick={() => setIsPureOledBlack(false)}
        className="fixed inset-0 z-[110] bg-black cursor-pointer flex items-end justify-center pb-8 select-none"
        title="OLED Screen Off Mode - Tap anywhere to wake"
      >
        <p className="text-[10px] text-neutral-800 font-mono tracking-widest uppercase">
          • OLED Pixels Off • Tap to Wake •
        </p>
      </div>
    );
  }

  return (
    <div
      id="friday-shutdown-layer"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black select-none overflow-y-auto p-4 transition-all duration-700"
    >
      {/* SHUTTING DOWN ANIMATION */}
      {status === 'shutting_down' && (
        <div className="flex flex-col items-center justify-center p-6 text-center animate-fade-in space-y-6">
          <div className="relative">
            {/* Spinning reactor wind-down */}
            <div className="w-28 h-28 rounded-full border-4 border-rose-500/30 border-t-rose-500 animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Power className="w-12 h-12 text-rose-500 animate-pulse" />
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-xl sm:text-2xl font-bold tracking-wider text-rose-400 font-mono">
              SHUTTING DOWN MOBILE...
            </h2>
            <p className="text-xs sm:text-sm text-neutral-400 max-w-sm">
              Boss Aniruddha Dabhade ke command par device power off sequence execute ho raha hai.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 text-[11px] font-mono text-neutral-500 flex items-center gap-2">
            <Cpu className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
            <span>Terminating processes • Closing audio bus • Power Off</span>
          </div>
        </div>
      )}

      {/* COMPLETE POWERED OFF STATE (BLACK SCREEN / STANDBY) */}
      {status === 'powered_off' && (
        <div className="flex flex-col items-center justify-center max-w-md w-full my-auto text-center space-y-6 animate-fade-in py-6">
          {/* Standby LED */}
          <div className="flex items-center gap-2 px-3.5 py-1 rounded-full bg-neutral-950 border border-neutral-900 text-[11px] font-mono text-neutral-500">
            <span className="w-2 h-2 rounded-full bg-rose-600/80 animate-ping" />
            <span>DEVICE OFF • STANDBY</span>
          </div>

          {/* Physical Style Power On Button */}
          <div className="relative group">
            <div className="absolute -inset-2 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 rounded-full blur-lg opacity-40 group-hover:opacity-100 transition-all duration-500" />
            <button
              type="button"
              onClick={onPowerOn}
              className="relative w-24 h-24 rounded-full bg-neutral-900 border-2 border-neutral-800 hover:border-cyan-500/80 hover:bg-neutral-850 flex flex-col items-center justify-center gap-1 text-neutral-400 hover:text-cyan-400 transition-all duration-300 shadow-[0_0_30px_rgba(0,0,0,0.8)] active:scale-95"
            >
              <Power className="w-9 h-9 transition-transform group-hover:scale-110" />
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider">
                Power On
              </span>
            </button>
          </div>

          <div className="space-y-1">
            <p className="text-xs text-neutral-400 font-mono">
              Phone standby mode active.
            </p>
            <p className="text-[11px] text-neutral-600 font-mono">
              Press <span className="text-neutral-300 font-bold">POWER ON</span> to boot Friday OS and resume session.
            </p>
          </div>

          {/* Real Android Controls */}
          <div className="w-full pt-4 border-t border-neutral-900 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setIsPureOledBlack(true)}
              className="w-full py-2.5 px-4 rounded-xl bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-800 text-xs font-mono text-neutral-300 flex items-center justify-center gap-2 transition-colors"
            >
              <span>🌑 Turn All OLED Screen Pixels Off (Pitch Black)</span>
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={triggerAndroidRealLock}
                className="py-2 px-3 rounded-xl bg-cyan-950/40 hover:bg-cyan-900/50 border border-cyan-800/40 text-[11px] font-mono text-cyan-300 flex items-center justify-center gap-1.5 transition-colors"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Trigger Screen Lock</span>
              </button>

              <button
                type="button"
                onClick={openDisplaySettings}
                className="py-2 px-3 rounded-xl bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 text-[11px] font-mono text-neutral-400 flex items-center justify-center gap-1.5 transition-colors"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Display Timeout</span>
              </button>
            </div>
          </div>

          {/* Educational Security Sandbox Disclosure for Boss */}
          <div className="w-full text-left bg-neutral-950/90 rounded-xl border border-neutral-900 overflow-hidden text-xs">
            <button
              type="button"
              onClick={() => setShowSandboxGuide(!showSandboxGuide)}
              className="w-full p-3 flex items-center justify-between text-neutral-400 hover:text-neutral-200 transition-colors font-mono text-[11px]"
            >
              <span className="flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-cyan-400" />
                <span>Real Android Hardware Lock Explained</span>
              </span>
              {showSandboxGuide ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {showSandboxGuide && (
              <div className="p-3 pt-0 border-t border-neutral-900 text-neutral-400 space-y-2 font-sans text-[11px] leading-relaxed">
                <p>
                  <strong>Boss Aniruddha, sachai ye hai:</strong> Google Chrome aur Android OS ki security architecture kisi bhi web browser tab ko aapke phone ke physical power button ya hardware lock chip ko directly cut-off karne ki ijaazat nahi deti (taaki koi bhi rogue website aapka phone lock na kar sake).
                </p>
                <p>
                  <strong>Real Hardware Lock ke 2 Asli Tareeqe:</strong>
                </p>
                <ul className="list-disc pl-4 space-y-1 text-neutral-400">
                  <li>
                    <span className="text-cyan-300 font-semibold">1-Click Shortcut App:</span> Play Store se free <em>"Screen Off and Lock"</em> ya <em>"MacroDroid"</em> install karein. Friday ka "Trigger Screen Lock" button directly use trigger karega aur phone real me instantly lock hoga!
                  </li>
                  <li>
                    <span className="text-cyan-300 font-semibold">OLED Pitch Black:</span> Upar diye gaye button se sabhi display pixels physically band ho jaate hain jisse battery bilkul kharch nahi hoti.
                  </li>
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* BOOTING RESTART SEQUENCE */}
      {status === 'booting' && (
        <div className="flex flex-col items-center justify-center p-6 text-center max-w-md w-full space-y-6 animate-fade-in">
          <div className="w-20 h-20 rounded-2xl bg-cyan-500/10 border border-cyan-400/40 flex items-center justify-center shadow-[0_0_30px_rgba(0,242,254,0.2)]">
            <Cpu className="w-10 h-10 text-cyan-400 animate-pulse" />
          </div>

          <div className="space-y-1 text-center">
            <h2 className="text-lg font-bold font-mono text-cyan-400 tracking-wider">
              FRIDAY OS • SYSTEM BOOT
            </h2>
            <p className="text-xs text-neutral-400 font-mono">
              Developer & Master: <span className="text-white font-bold">Aniruddha Dabhade</span>
            </p>
          </div>

          {/* Terminal Boot Log */}
          <div className="w-full bg-neutral-950 rounded-xl p-4 border border-neutral-800/80 font-mono text-xs text-left space-y-2">
            <div className="flex items-center gap-2 text-[10px] text-neutral-500 border-b border-neutral-900 pb-1.5">
              <Terminal className="w-3 h-3 text-cyan-400" />
              <span>BOOT_DIAGNOSTICS_v4.2.0</span>
            </div>

            <p className={`flex items-center gap-2 transition-all ${bootStep >= 1 ? 'text-emerald-400' : 'text-neutral-600'}`}>
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>[OK] Hardware & Chrome Sandbox verified</span>
            </p>
            <p className={`flex items-center gap-2 transition-all ${bootStep >= 2 ? 'text-emerald-400' : 'text-neutral-600'}`}>
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>[OK] Memory bank loaded (data/friday_memory.json)</span>
            </p>
            <p className={`flex items-center gap-2 transition-all ${bootStep >= 3 ? 'text-emerald-400' : 'text-neutral-600'}`}>
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>[OK] Neural Gemini Live Audio Core online</span>
            </p>
            {bootStep >= 4 && (
              <p className="flex items-center gap-2 text-cyan-300 font-bold animate-fade-in">
                <Sparkles className="w-3.5 h-3.5 shrink-0 text-cyan-400" />
                <span>Welcome back, Boss! Friday is ready.</span>
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

