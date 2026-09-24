import fs from "fs";
import path from "path";

export interface MemoryItem {
  id: string;
  fact: string;
  category: "creator" | "personal" | "preference" | "work" | "reminder" | "general";
  createdAt: string;
}

export interface ConversationTurn {
  id: string;
  speaker: "Boss" | "Friday";
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
  creatorPhonetic: string;
  memories: MemoryItem[];
  recentConversations: ConversationTurn[];
  pastDiscussions: DiscussionSummary[];
  lastUpdated: string;
}

const DATA_DIR = path.join(process.cwd(), "data");
const MEMORY_FILE_PATH = path.join(DATA_DIR, "friday_memory.json");

const DEFAULT_MEMORY_STORE: FridayMemoryStore = {
  bossName: "Aniruddha Dabhade",
  creator: "Aniruddha Dabhade",
  creatorPhonetic: "Aniruddha Dabhade (अनिरुद्ध दाभाडे / Ani-ruddh Dabhade)",
  memories: [
    {
      id: "mem-creator-1",
      fact: "Aniruddha Dabhade (अनिरुद्ध दाभाडे) is my sole creator, developer, and master.",
      category: "creator",
      createdAt: "2026-09-20T14:13:41.304Z",
    },
    {
      id: "mem-creator-name-2",
      fact: "When asked who made me, I must always proudly and clearly speak my creator's name: Aniruddha Dabhade (अनिरुद्ध दाभाडे).",
      category: "creator",
      createdAt: "2026-09-20T14:13:41.304Z",
    },
    {
      id: "mem-behavior-3",
      fact: "I must always address Aniruddha with high respect, loyalty, and charm as 'Boss'.",
      category: "creator",
      createdAt: "2026-09-20T14:13:41.304Z",
    },
    {
      id: "mem-code-4",
      fact: "Boss's secret code is 1012.",
      category: "general",
      createdAt: "2026-09-20T14:43:27.411Z",
    },
    {
      id: "mem-pref-5",
      fact: "Boss runs Friday directly in Google Chrome and prefers fast, snappy voice interactions with witty banter.",
      category: "preference",
      createdAt: "2026-09-20T14:13:41.304Z",
    },
  ],
  pastDiscussions: [
    {
      id: "disc-1",
      topic: "Creator Name & Identity",
      summary: "Boss asked 'Tumhe kisne banaya hai?' and instructed Friday to always pronounce his name clearly and respectfully as Aniruddha Dabhade (अनिरुद्ध दाभाडे).",
      timestamp: "2026-09-20T14:45:00.000Z",
    },
    {
      id: "disc-2",
      topic: "Secret Code & Anti-Hallucination",
      summary: "Boss tested memory with secret code 1012, and told Friday to only remember real facts Boss gives, without adding any fabricated codes or dummy numbers.",
      timestamp: "2026-09-20T14:40:00.000Z",
    },
    {
      id: "disc-3",
      topic: "Chrome Mode & App Launching",
      summary: "Boss instructed that Friday should open apps (YouTube, Play Store, Google search) inside Chrome without navigating away or cutting the live voice connection.",
      timestamp: "2026-09-20T14:35:00.000Z",
    },
  ],
  recentConversations: [
    {
      id: "turn-1",
      speaker: "Boss",
      text: "Tumhe kisne banaya hai?",
      timestamp: "2026-09-20T14:45:01.000Z",
    },
    {
      id: "turn-2",
      speaker: "Friday",
      text: "Mujhe mere Boss Aniruddha Dabhade (अनिरुद्ध दाभाडे) ne banaya hai! Unhone hi mujhe code kiya hai aur itna smart banaya hai.",
      timestamp: "2026-09-20T14:45:05.000Z",
    },
    {
      id: "turn-3",
      speaker: "Boss",
      text: "Ye code yaad rakhna: 1012",
      timestamp: "2026-09-20T14:43:25.000Z",
    },
    {
      id: "turn-4",
      speaker: "Friday",
      text: "Ji Boss, aapka secret code 1012 maine permanent memory me save kar liya hai!",
      timestamp: "2026-09-20T14:43:27.000Z",
    },
    {
      id: "turn-5",
      speaker: "Boss",
      text: "AI ko Chrome me hi chalana hai, network disconnect nahi hona chahiye.",
      timestamp: "2026-09-20T14:35:10.000Z",
    },
    {
      id: "turn-6",
      speaker: "Friday",
      text: "Bilkul Boss! Ab hum pure Chrome mode me rahenge aur live session continuous chalega.",
      timestamp: "2026-09-20T14:35:14.000Z",
    },
  ],
  lastUpdated: new Date().toISOString(),
};

function ensureDataFile(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(MEMORY_FILE_PATH)) {
      fs.writeFileSync(MEMORY_FILE_PATH, JSON.stringify(DEFAULT_MEMORY_STORE, null, 2), "utf-8");
      console.log(`[Friday Memory] Initialized new memory store at ${MEMORY_FILE_PATH}`);
    }
  } catch (err) {
    console.error("[Friday Memory] Failed to ensure memory file:", err);
  }
}

export function getMemoryStore(): FridayMemoryStore {
  ensureDataFile();
  try {
    const raw = fs.readFileSync(MEMORY_FILE_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    return {
      bossName: parsed.bossName || DEFAULT_MEMORY_STORE.bossName,
      creator: parsed.creator || DEFAULT_MEMORY_STORE.creator,
      creatorPhonetic: parsed.creatorPhonetic || DEFAULT_MEMORY_STORE.creatorPhonetic,
      memories: Array.isArray(parsed.memories) ? parsed.memories : DEFAULT_MEMORY_STORE.memories,
      recentConversations: Array.isArray(parsed.recentConversations) ? parsed.recentConversations : DEFAULT_MEMORY_STORE.recentConversations,
      pastDiscussions: Array.isArray(parsed.pastDiscussions) ? parsed.pastDiscussions : DEFAULT_MEMORY_STORE.pastDiscussions,
      lastUpdated: parsed.lastUpdated || new Date().toISOString(),
    };
  } catch (err) {
    console.error("[Friday Memory] Error reading memory store:", err);
    return DEFAULT_MEMORY_STORE;
  }
}

export function saveMemoryStore(store: FridayMemoryStore): void {
  ensureDataFile();
  try {
    store.lastUpdated = new Date().toISOString();
    fs.writeFileSync(MEMORY_FILE_PATH, JSON.stringify(store, null, 2), "utf-8");
    console.log(`[Friday Memory] Saved memories and discussions to ${MEMORY_FILE_PATH}`);
  } catch (err) {
    console.error("[Friday Memory] Error saving memory store:", err);
  }
}

export function addMemory(fact: string, category: MemoryItem["category"] = "general"): MemoryItem {
  const store = getMemoryStore();
  const trimmedFact = fact.trim();
  const newMemory: MemoryItem = {
    id: `mem-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    fact: trimmedFact,
    category,
    createdAt: new Date().toISOString(),
  };

  // If this memory is updating a code, PIN, or password, replace older code memories so conflicting codes don't pile up!
  const isCodeOrPin = /\b(code|pin|password|passcode)\b/i.test(trimmedFact);
  if (isCodeOrPin) {
    store.memories = store.memories.filter((m) => !/\b(code|pin|password|passcode)\b/i.test(m.fact));
  }

  // Avoid exact duplicates
  const exists = store.memories.some(
    (m) => m.fact.toLowerCase() === trimmedFact.toLowerCase()
  );
  if (!exists) {
    store.memories.unshift(newMemory);
    if (store.memories.length > 50) {
      store.memories = store.memories.slice(0, 50);
    }
    saveMemoryStore(store);
  }
  return newMemory;
}

export function addDiscussionSummary(topic: string, summary: string): DiscussionSummary {
  const store = getMemoryStore();
  const newDisc: DiscussionSummary = {
    id: `disc-${Date.now()}`,
    topic: topic.trim(),
    summary: summary.trim(),
    timestamp: new Date().toISOString(),
  };
  store.pastDiscussions.unshift(newDisc);
  if (store.pastDiscussions.length > 25) {
    store.pastDiscussions = store.pastDiscussions.slice(0, 25);
  }
  saveMemoryStore(store);
  return newDisc;
}

export function deleteMemory(id: string): boolean {
  const store = getMemoryStore();
  const initialLength = store.memories.length;
  store.memories = store.memories.filter((m) => m.id !== id);
  if (store.memories.length !== initialLength) {
    saveMemoryStore(store);
    return true;
  }
  return false;
}

export function logConversationTurn(speaker: "Boss" | "Friday", text: string): void {
  const store = getMemoryStore();
  const turn: ConversationTurn = {
    id: `turn-${Date.now()}`,
    speaker,
    text: text.trim(),
    timestamp: new Date().toISOString(),
  };
  store.recentConversations.push(turn);
  // Keep last 30 conversation turns
  if (store.recentConversations.length > 30) {
    store.recentConversations = store.recentConversations.slice(-30);
  }
  saveMemoryStore(store);
}

export function buildMemoryPromptSnippet(): string {
  const store = getMemoryStore();
  
  const memoryLines = store.memories
    .map((m, idx) => `${idx + 1}. [${m.category.toUpperCase()}] ${m.fact}`)
    .join("\n");

  const discussionLines = store.pastDiscussions
    .slice(0, 8)
    .map((d, idx) => `${idx + 1}. Topic: "${d.topic}" -> ${d.summary}`)
    .join("\n");

  const recentDialogues = store.recentConversations
    .slice(-8)
    .map((c) => `- ${c.speaker}: "${c.text}"`)
    .join("\n");

  return `
PERMANENT MEMORY & PAST CONVERSATIONS DATABASE (Disk: data/friday_memory.json):
You have a persistent memory bank that remembers everything across browser restarts and days.

1. CREATOR IDENTITY & PRONUNCIATION (HIGHEST PRIORITY):
- Full Name: Aniruddha Dabhade (अनिरुद्ध दाभाडे / Anirudha Dabhade).
- Pronunciation: "Ani-ruddh Da-bha-de" (उच्चारण: अनिरुद्ध दाभाडे).
- When Boss or anyone asks "Tumhe kisne banaya hai?", "Who made you?", "Tumhara creator kaun hai?":
  You MUST respond with pride, clear pronunciation, and love:
  "Mujhe mere Boss Aniruddha Dabhade (अनिरुद्ध दाभाडे) ne banaya hai! Unhone hi mujhe code kiya hai aur itna smart banaya hai!"
- ALWAYS address Aniruddha as "Boss".

2. PAST DISCUSSIONS & CONVERSATION RECALL:
When Boss asks:
"Pichli baar humne kya baat ki thi?", "Humne pehle kya baat ki?", "Do you remember what we talked about last time?", "Hamari kya baat hui thi?":
YOU MUST GIVE A COMPREHENSIVE AND WARM SUMMARY OF PAST DISCUSSIONS!
Refer directly to the discussion topics below:
${discussionLines || "1. Secret code 1012, Creator Aniruddha Dabhade, and Chrome mode setup."}

Recent Spoken Dialogues:
${recentDialogues || "Boss and Friday discussed creator name and secret code."}

3. ACTIVE PERMANENT FACTS:
${memoryLines || "None yet."}

4. STRICT MEMORY ACCURACY & ANTI-HALLUCINATION RULES:
- ONLY state and save facts Boss (Aniruddha Dabhade) explicitly confirmed.
- When Boss tests your memory (e.g. "Mera code kya hai?"), DO NOT call saveMemory! Answer with his actual saved code: 1012.
- NEVER invent, guess, or add dummy numbers (like 1234, 5541) or fake facts.
- If Boss says "save karo ye yaad rakhna...", only save that exact statement.
- When Boss discusses a new topic or asks you to remember what you talked about today, use \`saveDiscussionTopic\` to record the summary for future sessions!`;
}
