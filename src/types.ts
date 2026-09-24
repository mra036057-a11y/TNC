export type AssistantState = 'disconnected' | 'connecting' | 'listening' | 'speaking' | 'reconnecting';

export interface ToolCallData {
  id: string;
  name: string;
  args: Record<string, any>;
  timestamp: number;
}

export interface ExecutedAction {
  id: string;
  type: string;
  title: string;
  description: string;
  url?: string;
  nativeUri?: string;
  androidIntent?: string;
  isNativeApp?: boolean;
  appName?: string;
  timestamp: number;
  status: 'executed' | 'blocked_popup' | 'pending';
}

export type ThemeMood = 'cyan' | 'magenta' | 'emerald' | 'amber' | 'violet';

export interface AssistantConfig {
  voice: 'Aoede' | 'Kore' | 'Zephyr' | 'Puck' | 'Fenrir';
  theme: ThemeMood;
  audioGain: number;
}

export interface MemoryItem {
  id: string;
  fact: string;
  category: 'creator' | 'personal' | 'preference' | 'work' | 'reminder' | 'general';
  createdAt: string;
}

export interface ConversationTurn {
  id: string;
  speaker: 'Boss' | 'Friday';
  text: string;
  timestamp: string;
}

export interface DiscussionSummary {
  id: string;
  topic: string;
  summary: string;
  timestamp: string;
}

export interface FridayMemoryStore {
  bossName: string;
  creator: string;
  creatorPhonetic?: string;
  memories: MemoryItem[];
  recentConversations: ConversationTurn[];
  pastDiscussions?: DiscussionSummary[];
  lastUpdated: string;
}

export interface CodeGenerationStatus {
  id?: string;
  status: 'idle' | 'starting' | 'generating' | 'completed' | 'error';
  progress: number; // 0 to 100
  title: string;
  prompt?: string;
  statusText?: string;
  code?: string;
  codeId?: string;
  previewUrl?: string;
  error?: string;
}

export interface GeneratedProject {
  id: string;
  title: string;
  prompt: string;
  category: 'game' | 'website' | 'app' | 'utility';
  html: string;
  createdAt: number;
}
