import React from 'react';
import { ExternalLink, CheckCircle2, Sparkles, X, Compass, Globe } from 'lucide-react';
import { ExecutedAction, ThemeMood } from '../types';

interface ActionDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  actions: ExecutedAction[];
  onOpenUrl: (url: string, intent?: string) => void;
  onSelectStarter?: (starter: string) => void;
  theme: ThemeMood;
}

const VOICE_STARTERS = [
  '“HTML code bana ke do ek Snake game ka” (Live HTML/CSS/JS + Auto New Tab)',
  '“Ek chhota sa game bana ke do Tic Tac Toe”',
  '“Website ka HTML code bana ke do portfolio ka”',
  '“Calculator webview app ka code bana do”',
  '“Friday wapas aa jao” (Close website & return to Friday AI page)',
  '“Mobile ko power off kar do” (Device shutdown & standby)',
  '“Tumhe kisne banaya hai?” (Creator & Master recall)',
  '“Pichli baar humne kya baat ki thi?” (Discussion recall)',
  '“Google par Taj Mahal search karo” (Chrome Search)',
  '“Play Store par PUBG search karo”',
];

export const ActionDrawer: React.FC<ActionDrawerProps> = ({
  isOpen,
  onClose,
  actions,
  onOpenUrl,
  onSelectStarter,
  theme,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex justify-end z-50 animate-in fade-in duration-200">
      <div className="w-full max-w-md h-full bg-neutral-950 border-l border-neutral-800 p-6 flex flex-col shadow-2xl overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-cyan-400" />
            <h2 className="font-['Syne'] font-bold text-base text-white">Browser Tools & Voice Cues</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Executed Tools Section */}
        <div className="mt-6 flex-1">
          <h3 className="text-xs font-mono uppercase tracking-wider text-neutral-400 mb-3 flex items-center justify-between">
            <span>Executed Actions ({actions.length})</span>
            <span className="text-[10px] text-cyan-400">toolResponse: instant</span>
          </h3>

          {actions.length === 0 ? (
            <div className="p-4 rounded-xl bg-neutral-900/50 border border-neutral-800/80 text-center my-4">
              <Compass className="w-8 h-8 text-neutral-600 mx-auto mb-2" />
              <p className="text-xs text-neutral-400 font-sans">
                No tool calls executed yet.
              </p>
              <p className="text-[11px] text-neutral-500 mt-1">
                Tell Friday: <em>"Open YouTube"</em> or <em>"Go to GitHub"</em> to watch her invoke browser actions in real time!
              </p>
            </div>
          ) : (
            <div className="space-y-3 mb-6">
              {actions.map((act) => (
                <div
                  key={act.id}
                  className="p-3.5 rounded-xl bg-neutral-900/90 border border-neutral-800 flex items-start justify-between gap-3 hover:border-neutral-700 transition-all"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="text-xs font-semibold text-white truncate font-sans">
                        {act.title}
                      </span>
                      <span className="text-[10px] font-mono text-neutral-500 ml-auto">
                        {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-400 truncate font-mono">
                      {act.description}
                    </p>
                    {act.isNativeApp ? (
                      <button
                        type="button"
                        onClick={() => onOpenUrl(act.url!, act.androidIntent || act.nativeUri)}
                        className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-cyan-500/20 border border-cyan-500/40 text-[11px] font-mono font-medium text-cyan-300 hover:bg-cyan-500/30 transition-colors"
                      >
                        <span>📱 Open Installed App</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    ) : (
                      act.url && (
                        <button
                          type="button"
                          onClick={() => onOpenUrl(act.url!)}
                          className="mt-2 inline-flex items-center gap-1 text-[11px] font-mono text-cyan-400 hover:text-cyan-300 hover:underline"
                        >
                          <span>Visit {act.url}</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      )
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Voice Prompt Suggestions Section */}
          <div className="mt-8 pt-6 border-t border-neutral-800/80">
            <h3 className="text-xs font-mono uppercase tracking-wider text-neutral-400 mb-3 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Try Saying to Friday</span>
            </h3>

            <div className="space-y-2">
              {VOICE_STARTERS.map((starter, i) => {
                const match = starter.match(/“([^”]+)”/);
                const queryText = match ? match[1] : starter;
                return (
                  <button
                    type="button"
                    key={i}
                    onClick={() => {
                      if (onSelectStarter) {
                        onSelectStarter(queryText);
                        onClose();
                      }
                    }}
                    className="w-full text-left p-2.5 rounded-lg bg-neutral-900/60 border border-neutral-800/60 text-xs text-neutral-300 font-sans italic hover:bg-neutral-900 hover:border-cyan-500/40 hover:text-cyan-200 transition-all flex items-center justify-between group"
                  >
                    <span>{starter}</span>
                    <Sparkles className="w-3 h-3 text-neutral-600 group-hover:text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-auto pt-4 border-t border-neutral-800 text-[10px] font-mono text-neutral-500 text-center">
          FRIDAY AI • REALTIME WEBSOCKET • GEMINI LIVE API
        </div>
      </div>
    </div>
  );
};
