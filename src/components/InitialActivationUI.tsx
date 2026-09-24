import React from 'react';
import { ThemeMood } from '../types';

interface InitialActivationUIProps {
  isActive: boolean;
  onActivate: () => void;
  theme: ThemeMood;
}

export const InitialActivationUI: React.FC<InitialActivationUIProps> = ({
  isActive,
  onActivate,
  theme,
}) => {
  const themeShadows: Record<ThemeMood, string> = {
    cyan: 'rgba(0, 242, 254, 0.7)',
    magenta: 'rgba(247, 37, 133, 0.7)',
    emerald: 'rgba(16, 185, 129, 0.7)',
    amber: 'rgba(245, 158, 11, 0.7)',
    violet: 'rgba(168, 85, 247, 0.7)',
  };

  const currentShadow = themeShadows[theme] || themeShadows.cyan;

  return (
    <div
      id="initialUi"
      className={`flex flex-col items-center justify-center gap-7 z-20 transition-all duration-400 ease-out select-none ${
        isActive ? 'opacity-0 scale-90 pointer-events-none' : 'opacity-100 scale-100 pointer-events-auto'
      }`}
    >
      {/* Toggle Box exactly like the requested design */}
      <div
        className="flex items-center justify-between px-6 py-4 rounded-[22px] w-[310px] sm:w-[330px] bg-white/[0.04] backdrop-blur-[20px] border border-white/15 shadow-[0_15px_35px_rgba(0,0,0,0.5)] transition-all hover:border-white/25"
        style={{
          boxShadow: `0 15px 35px rgba(0, 0, 0, 0.5), 0 0 25px ${currentShadow.replace('0.7', '0.15')}`,
        }}
      >
        <span className="text-lg font-semibold text-white tracking-wide">
          Activate AI
        </span>

        {/* Custom iOS/Futuristic Switch Slider */}
        <label className="relative inline-block w-14 h-[30px] cursor-pointer">
          <input
            type="checkbox"
            checked={isActive}
            onChange={onActivate}
            className="sr-only peer"
            aria-label="Activate Friday AI"
          />
          <div
            className="w-14 h-[30px] rounded-full bg-white/10 border border-white/20 transition-all duration-300 peer-checked:bg-gradient-to-r peer-checked:from-cyan-400 peer-checked:to-blue-500 peer-checked:border-cyan-400"
            style={{
              boxShadow: isActive ? `0 0 18px ${currentShadow}` : 'none',
            }}
          >
            <div
              className={`absolute top-[3px] left-[3px] w-[22px] h-[22px] rounded-full bg-white shadow-md transition-transform duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${
                isActive ? 'translate-x-[26px]' : 'translate-x-0'
              }`}
            />
          </div>
        </label>
      </div>

      {/* Futuristic Friday AI Title */}
      <h1 className="text-3xl sm:text-4xl font-extrabold tracking-[4px] uppercase font-['Syne'] bg-gradient-to-br from-white via-neutral-100 to-cyan-300 bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(0,242,254,0.3)]">
        Friday AI
      </h1>

      <div className="flex flex-col items-center gap-1.5">
        <span className="text-xs font-mono text-cyan-400 font-semibold tracking-wider uppercase">
          Multilingual Live Voice • Starts in Hindi
        </span>
        <p className="text-[11px] font-mono text-neutral-400 tracking-wider text-center max-w-xs">
          Toggle the switch above to connect. Speak in Hindi, English, or any language anytime.
        </p>
      </div>
    </div>
  );
};
