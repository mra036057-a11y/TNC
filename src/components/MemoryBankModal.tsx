import React, { useState, useEffect } from 'react';
import { Brain, X, Plus, Trash2, ShieldCheck, Clock, RefreshCw, Sparkles, Check, Database, MessageSquare } from 'lucide-react';
import { FridayMemoryStore, MemoryItem, ThemeMood } from '../types';

interface MemoryBankModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: ThemeMood;
}

export const MemoryBankModal: React.FC<MemoryBankModalProps> = ({ isOpen, onClose, theme }) => {
  const [memoryStore, setMemoryStore] = useState<FridayMemoryStore | null>(null);
  const [loading, setLoading] = useState(false);
  const [newFact, setNewFact] = useState('');
  const [category, setCategory] = useState<MemoryItem['category']>('personal');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'memories' | 'discussions'>('memories');

  const fetchMemories = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/memory');
      if (res.ok) {
        const data = await res.json();
        setMemoryStore(data);
      }
    } catch (err) {
      console.error('Failed to fetch memories:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchMemories();
    }
  }, [isOpen]);

  const handleAddMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFact.trim()) return;

    setSaving(true);
    try {
      const res = await fetch('/api/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fact: newFact.trim(), category }),
      });

      if (res.ok) {
        const result = await res.json();
        if (memoryStore) {
          setMemoryStore({
            ...memoryStore,
            memories: [result.memory, ...memoryStore.memories],
          });
        }
        setNewFact('');
        setFeedback('Boss, baat permanently save ho gayi!');
        setTimeout(() => setFeedback(null), 3000);
      }
    } catch (err) {
      console.error('Failed to save memory:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMemory = async (id: string) => {
    try {
      const res = await fetch(`/api/memory/${id}`, { method: 'DELETE' });
      if (res.ok && memoryStore) {
        setMemoryStore({
          ...memoryStore,
          memories: memoryStore.memories.filter((m) => m.id !== id),
        });
      }
    } catch (err) {
      console.error('Failed to delete memory:', err);
    }
  };

  if (!isOpen) return null;

  const categoryColors: Record<string, string> = {
    creator: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    personal: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
    preference: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
    work: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    reminder: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
    general: 'text-neutral-400 bg-neutral-800 border-neutral-700',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-xl max-h-[90vh] flex flex-col rounded-2xl bg-[#090b14] border border-cyan-500/30 shadow-[0_0_50px_rgba(0,242,254,0.15)] overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800/80 bg-neutral-900/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/40 flex items-center justify-center shadow-[0_0_12px_rgba(0,242,254,0.2)]">
              <Brain className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-['Syne'] text-base sm:text-lg font-bold text-white tracking-wide">
                  FRIDAY MEMORY BANK
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  PERSISTENT
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 font-mono">
                Stored on disk: <code className="text-cyan-400">data/friday_memory.json</code>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchMemories}
              disabled={loading}
              className="p-2 rounded-lg bg-neutral-800/80 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-all"
              title="Refresh Memories"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg bg-neutral-800/80 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Boss Identity Card */}
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-cyan-950/40 via-neutral-900/60 to-purple-950/30 border border-cyan-500/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <span className="text-[10px] font-mono tracking-wider uppercase text-cyan-400 font-semibold block">
                  Master & Sole Developer
                </span>
                <p className="text-white font-bold text-sm">
                  Aniruddha Dabhade <span className="text-cyan-400 font-normal text-xs">(अनिरुद्ध दाभाडे)</span>
                </p>
                <p className="text-[11px] text-neutral-400">
                  Audio Speech Pronunciation: <span className="text-cyan-300 font-mono font-medium">"Ani-ruddh Da-bha-de"</span>
                </p>
              </div>
            </div>
            <div className="text-right font-mono text-[11px] text-neutral-400">
              <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Active Memory
              </span>
              <p className="text-[10px] text-neutral-500 mt-0.5">
                {memoryStore?.memories.length || 0} facts • {memoryStore?.pastDiscussions?.length || 0} discussions
              </p>
            </div>
          </div>

          {/* Tab Selector */}
          <div className="flex items-center gap-2 border-b border-neutral-800 pb-2">
            <button
              type="button"
              onClick={() => setActiveTab('memories')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'memories'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_10px_rgba(0,242,254,0.15)]'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-850'
              }`}
            >
              <Brain className="w-3.5 h-3.5" />
              <span>Memories & Facts ({memoryStore?.memories.length || 0})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('discussions')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'discussions'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-[0_0_10px_rgba(168,85,247,0.15)]'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-850'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Past Discussions ({memoryStore?.pastDiscussions?.length || 0})</span>
            </button>
          </div>

          {activeTab === 'memories' ? (
            <>
              {/* Add New Memory Form */}
              <form onSubmit={handleAddMemory} className="p-3.5 rounded-xl bg-neutral-900/60 border border-neutral-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    AI ko koi nayi baat sikhayein (Remember):
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="text-[11px] font-mono bg-neutral-800 text-neutral-200 border border-neutral-700 rounded-lg px-2 py-1 outline-none focus:border-cyan-500"
                  >
                    <option value="personal">Personal</option>
                    <option value="preference">Preference (Pasand)</option>
                    <option value="work">Work / Project</option>
                    <option value="reminder">Reminder</option>
                    <option value="general">General</option>
                  </select>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newFact}
                    onChange={(e) => setNewFact(e.target.value)}
                    placeholder="Jaise: Boss ko PUBG pasand hai, ya kal shaam 6 baje meeting hai..."
                    className="flex-1 px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-500"
                  />
                  <button
                    type="submit"
                    disabled={saving || !newFact.trim()}
                    className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-black font-bold text-xs flex items-center gap-1.5 transition-all shadow-[0_0_12px_rgba(0,242,254,0.3)]"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Save</span>
                  </button>
                </div>

                {feedback && (
                  <p className="text-xs text-emerald-400 flex items-center gap-1 font-mono animate-fade-in">
                    <Check className="w-3.5 h-3.5" />
                    {feedback}
                  </p>
                )}
              </form>

              {/* Stored Memories List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-neutral-400 font-mono px-1">
                  <span>SAVED MEMORY ITEMS ({memoryStore?.memories.length || 0})</span>
                  <span className="text-[10px] text-neutral-500">Auto-recalled in every voice session</span>
                </div>

                {loading && !memoryStore ? (
                  <div className="p-8 text-center text-neutral-500 text-xs font-mono">
                    Loading memory database from disk...
                  </div>
                ) : memoryStore?.memories.length === 0 ? (
                  <div className="p-8 text-center text-neutral-500 text-xs font-mono rounded-xl border border-dashed border-neutral-800">
                    Abhi koi memory saved nahi hai. Aap AI se bolkar ya upar likhkar save kar sakte hain!
                  </div>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {memoryStore?.memories.map((item) => (
                      <div
                        key={item.id}
                        className="p-3 rounded-xl bg-neutral-900/50 border border-neutral-800/80 hover:border-neutral-700/80 transition-all flex items-start justify-between gap-3 group"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[9px] font-mono px-1.5 py-0.5 rounded border uppercase font-semibold ${
                                categoryColors[item.category] || categoryColors.general
                              }`}
                            >
                              {item.category}
                            </span>
                            <span className="text-[10px] text-neutral-500 font-mono flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5" />
                              {new Date(item.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-xs text-neutral-200 leading-relaxed font-sans">{item.fact}</p>
                        </div>

                        {item.category !== 'creator' && (
                          <button
                            type="button"
                            onClick={() => handleDeleteMemory(item.id)}
                            className="opacity-60 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-rose-500/20 text-neutral-500 hover:text-rose-400 transition-all"
                            title="Delete this memory"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Past Discussions Tab */
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-neutral-400 font-mono px-1">
                <span>PAST TOPICS & DISCUSSIONS ({memoryStore?.pastDiscussions?.length || 0})</span>
                <span className="text-[10px] text-purple-400 font-mono">"Pichli baar humne kya baat ki?"</span>
              </div>

              {(!memoryStore?.pastDiscussions || memoryStore.pastDiscussions.length === 0) ? (
                <div className="p-8 text-center text-neutral-500 text-xs font-mono rounded-xl border border-dashed border-neutral-800">
                  Abhi koi past discussion save nahi hui hai. Friday automatically baat-cheet ke mukhya vishay record karti hai.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                  {memoryStore.pastDiscussions.map((disc) => (
                    <div
                      key={disc.id}
                      className="p-3.5 rounded-xl bg-purple-950/20 border border-purple-800/40 hover:border-purple-700/60 transition-all space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-purple-300 flex items-center gap-1.5">
                          <MessageSquare className="w-3 h-3 text-purple-400" />
                          {disc.topic}
                        </span>
                        <span className="text-[10px] text-neutral-500 font-mono flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          {new Date(disc.timestamp).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-300 leading-relaxed">{disc.summary}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Recent Turns */}
              {memoryStore?.recentConversations && memoryStore.recentConversations.length > 0 && (
                <div className="p-3 rounded-xl bg-neutral-900/40 border border-neutral-800/70 space-y-2">
                  <span className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider block">
                    Recent Dialogue Snippets:
                  </span>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1 text-xs">
                    {memoryStore.recentConversations.slice(-6).map((turn) => (
                      <div key={turn.id} className="flex gap-2">
                        <span className={`font-semibold shrink-0 ${turn.speaker === 'Boss' ? 'text-cyan-400' : 'text-purple-400'}`}>
                          {turn.speaker}:
                        </span>
                        <span className="text-neutral-300">{turn.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Database Info Banner */}
          <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800/60 flex items-center gap-2.5 text-[11px] text-neutral-400 font-mono">
            <Database className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>
              Ye sari baatein <strong className="text-neutral-300">server disk</strong> me permanently save hoti hain. App band karke dubara kholne par bhi Friday ko sab yaad rehta hai.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
