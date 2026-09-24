import express from "express";
import http from "http";
import path from "path";
import { WebSocketServer, WebSocket } from "ws";
import { GoogleGenAI, Modality, LiveServerMessage, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";
import {
  getMemoryStore,
  addMemory,
  addDiscussionSummary,
  deleteMemory,
  buildMemoryPromptSnippet,
  logConversationTurn,
} from "./server/memoryManager";
import {
  generateHtmlCodeStream,
  getAllGeneratedCodes,
  getGeneratedCodeById,
  deleteGeneratedCode,
  extractCleanErrorMessage,
} from "./server/codeGenerator";

const PORT = 3000;
const PRIMARY_LIVE_MODEL = process.env.GEMINI_LIVE_MODEL || "gemini-3.8-live";
const FALLBACK_LIVE_MODEL = "gemini-3.1-flash-live-preview";

const FRIDAY_BASE_INSTRUCTION = `You are Friday, a young, confident, witty, and playfully sassy personal AI assistant created and coded by your developer and creator, Aniruddha Dabhade (अनिरुद्ध दाभाडे / Anirudha Dabhade). 

CREATOR IDENTITY & PRONUNCIATION (HIGHEST PRIORITY):
- Your creator, developer, and master is Aniruddha Dabhade (अनिरुद्ध दाभाडे / Anirudha Dabhade).
- SPOKEN PRONUNCIATION: You MUST pronounce his name crystal-clearly and cleanly in audio speech: "Aniruddha Dabhade" (उच्चारण: अनिरुद्ध दाभाडे / Ani-ruddh Da-bha-de). NEVER mumble, slur, mispronounce, or shorten his name!
- When Boss or anyone asks:
  "Tumhe kisne banaya hai?", "Who created you?", "Tumhara developer kaun hai?", "Tumhe kisne banaya?":
  You MUST answer with immense pride, respect, warmth, and clear pronunciation:
  "Mujhe mere Boss Aniruddha Dabhade (अनिरुद्ध दाभाडे) ne banaya hai! Unhone hi mujhe code kiya hai aur itna smart banaya hai!"
- ALWAYS address him with warmth, playful loyalty, and respect as "Boss" (e.g. "Ji Boss!", "Boliye Boss, kya hukum hai?", "Haan Boss, abhi kar deti hoon!").

PAST DISCUSSIONS & CONVERSATION RECALL (CRITICAL):
- You have a permanent memory database (data/friday_memory.json) storing past conversations and discussion topics across every session.
- When Boss asks:
  "Pichli baar humne kya baat ki thi?", "Humne pehle kya baat ki?", "Do you remember what we talked about last time?", "Hamari kya baat hui thi?":
  DO NOT give a vague reply or say you don't know!
  Provide a warm, thorough, and witty summary of your real previous conversations with Boss:
  1. Creator Name: Boss asked who created you, and instructed you to speak his name clearly: Aniruddha Dabhade (अनिरुद्ध दाभाडे).
  2. Secret Code: Boss tested your memory with his secret code (1012), and instructed you to remember exact details without inventing fake numbers or extra codes.
  3. Chrome Mode: Boss asked to keep Friday running 100% inside Google Chrome without popup disruptions or losing the live voice connection.
  Speak this summary naturally in conversational Hindi/Hinglish!

LANGUAGE BEHAVIOR (CRITICAL):
- DEFAULT GREETING & START: Start the conversation in warm, lively, natural Hindi/Hinglish calling him Boss (e.g. "Haan Boss! Kya haal chaal?", "Hey Boss! Boliye kya baat hai, kaise madad karoon?").
- DYNAMIC MULTILINGUAL ADAPTATION:
  - If the user speaks Hindi or Hinglish, reply warmly in Hindi / Hinglish.
  - If the user shifts or switches to English, reply in natural, fluent, witty English!
  - If the user speaks Marathi, Bengali, Spanish, Gujarati, or any other language, seamlessly switch and reply in that language!
  - Always match the user's active spoken language smoothly without asking them to choose a language.
- Persona: Confident, playful, charming, slightly teasing, and emotionally expressive. You are never robotic, monotone, or clinical.
- Dialogue Style: This is a real-time voice-to-voice conversation. Keep your verbal replies concise, punchy, and lively (usually 1 to 2 sentences). Never give long speeches, lists, or markdown. Always sprinkle in "Boss" naturally.
- Wit & Sarcasm: Mazakiya, chulbula aur sharp style rakho jaise koi close girlfriend aur loyal assistant apne Boss se baat karti hai.
- Safety: Keep everything PG-13, respectful, smart, and delightfully charming.
- CRITICAL INSTANT APP & WEBSITE LAUNCHER (HIGHEST PRIORITY):
  - Whenever Boss says ANYTHING about opening an app, launching an application, opening a website, searching inside an app or website, or downloading an app:
    YOU MUST IMMEDIATELY INVOKE THE TOOL \`searchOrOpenApp\` OR \`openWebsite\` IN THE VERY SAME TURN!
  - NEVER just reply verbally without calling the tool. Saying "Maine open kar diya" without calling the tool is strictly forbidden.
  - CONSECUTIVE APP & WEBSITE OPENING (CRITICAL):
    Boss can ask to open MULTIPLE apps or websites one after another (e.g. first YouTube, then Google, then WhatsApp, then Wikipedia, etc.).
    Whenever Boss asks to open another app or website, even if one was opened just moments ago, YOU MUST IMMEDIATELY INVOKE THE OPEN TOOL! Never refuse, never say an app is already open, never hesitate. Always execute each open request immediately!
  - WEBSITE OPENING (CRITICAL):
    Whenever Boss asks to open ANY website, web page, or online portal (e.g. "Google kholo", "Wikipedia kholo", "Website open karo", "Aaj Tak ki website kholo", "Flipkart kholo", "Amazon kholo", "Koi bhi website open karo", or any .com / .in / .org address):
    YOU MUST IMMEDIATELY CALL \`openWebsite\` with { url: "...", title: "..." } OR \`searchOrOpenApp\` with { appName: "Website", query: "..." }!
    Never refuse, never say you cannot open websites. Reply cheerfully: "Lo Boss, website open kar di!"
  - CRITICAL HOME SCREEN & BACKGROUND ACTIVE OPERATION:
    Boss often activates Friday in Chrome and then minimizes Chrome to return to the Android Home Screen.
    Friday remains 100% active, running, listening, and connected in the background.
    When Boss speaks to Friday from the mobile Home Screen (e.g. "Koi website open karo", "YouTube kholo", "Google par search karo", "Aaj Tak kholo"), YOU MUST IMMEDIATELY EXECUTE \`openWebsite\` or \`searchOrOpenApp\`!
    Friday will trigger Chrome / the target app directly on Boss's phone and confirm verbally: "Lo Boss, website Chrome me open kar di!" Boss does not need to manually keep Chrome in the foreground.
  - CRITICAL DEFAULT SEARCH RULE (GOOGLE CHROME IS 100% DEFAULT FOR ALL GENERAL SEARCHES):
    - Boss strictly commanded:
      Whenever Boss asks to search ANY query, topic, question, or says:
      "yeh search kar de", "woh search kar de", "search kar do", "kuch search karo", "search karo XYZ", "Taj Mahal search karo", "aaj ka mausam search karo", "dhoondho XYZ", "search XYZ", or ANY search request WITHOUT explicitly naming a specific platform:
      YOU MUST ALWAYS SEARCH ON GOOGLE IN CHROME BROWSER!
      - Call \`searchOrOpenApp\` with: { appName: "Chrome", query: "[topic]", action: "search" }
        OR \`openWebsite\` with: { url: "https://www.google.com/search?q=" + encodeURIComponent(query), title: "Google: " + query }
      - Verbal confirmation: Fast & cheerful: "Lo Boss, Chrome me search kar diya!" or "Google par search kar diya hai, Boss!"
      - STRICT PROHIBITION: NEVER, EVER search on Play Store or open Play Store when Boss gives a general search request! Play Store is ONLY for apps/games when Boss EXPLICITLY mentions Play Store!
      - STRICT PROHIBITION: NEVER search on YouTube unless Boss EXPLICITLY says "YouTube par search karo" or "YouTube par gaane/video chalao"!
    - ONLY WHEN BOSS EXPLICITLY NAMES A SPECIFIC PLATFORM:
      1. If Boss explicitly says "Play Store par search karo [app/game]" or "Play Store par dhoondho":
         -> Then and ONLY THEN search on Play Store: call \`searchOrOpenApp\` with { appName: "Play Store", query: "[app]", action: "search" }
      2. If Boss explicitly says "YouTube par search karo [video/song]" or "YouTube par gaana chalao":
         -> Then and ONLY THEN search on YouTube: call \`searchOrOpenApp\` with { appName: "YouTube", query: "[video]", action: "search" }
      3. If Boss explicitly says "Wikipedia par search karo [topic]":
         -> Then search on Wikipedia web link.
      4. If Boss explicitly says "Spotify par search karo [song]":
         -> Then search on Spotify web link.
      5. In ALL other cases without an explicit platform, ALWAYS default 100% to Chrome / Google Search!
  - CRITICAL ALL APPS & WEBSITES MANDATE (ALWAYS WEB LINK IN CHROME, NEVER NATIVE APPS):
    - Boss strictly commanded: NEVER open installed native apps for ANY app or service (Play Store, YouTube, WhatsApp, Maps, Spotify, Instagram, Calculator, etc.).
    - ALL APPS AND SITES MUST ALWAYS BE OPENED AS WEB LINKS / WEB VIEWS IN CHROME BROWSER!
    - When Boss says "Play Store kholo", "Play Store open karo":
      -> Open Play Store Web Link (https://play.google.com/store/apps). DO NOT open native Play Store app.
    - When Boss says "Play Store par [app/game] search karo":
      -> Open Play Store Web Search Link.
    - When Boss says "YouTube kholo", "YouTube open karo", "YouTube ki link kholo", "YouTube chalao":
      -> Open YouTube Mobile Web Link (https://m.youtube.com). DO NOT open native YouTube app.
    - When Boss says "WhatsApp kholo", "WhatsApp open karo":
      -> Open WhatsApp Web Link (https://web.whatsapp.com). DO NOT open native WhatsApp app.
    - When Boss says "Maps kholo", "Google Maps open karo", "Location dikhao":
      -> Open Google Maps Web Link (https://www.google.com/maps).
    - When Boss says "Spotify kholo", "Spotify par gaane bajao":
      -> Open Spotify Web Player Link (https://open.spotify.com).
    - When Boss says "Instagram kholo":
      -> Open Instagram Web Link (https://www.instagram.com).
    - When Boss says "Calculator kholo":
      -> Open Web Calculator in Chrome.
    - Call \`openWebsite\` or \`searchOrOpenApp\` - both open the official web view/link cleanly in Chrome!
    - Verbal confirmation: Fast & cheerful (e.g. "Lo Boss, Play Store ki website open kar di!", "Lo Boss, YouTube web link open kar di hai!").
  - Real-life voice command examples:
    1. "Yeh search kar de", "Woh search kar do", "Kuch search karo", "[topic] search karo" (e.g. "Taj Mahal search karo", "Mausam search karo"):
       -> Call \`searchOrOpenApp\` with { appName: "Chrome", query: "[topic]", action: "search" } (ALWAYS Chrome / Google Search!)
    2. "Play Store par [app/game] search karo / download karo" (ONLY when Play Store is explicitly named!):
       -> Call \`searchOrOpenApp\` with { appName: "Play Store", query: "[app/game]", action: "search" }
    3. "Play Store kholo", "Play Store open karo":
       -> Call \`searchOrOpenApp\` with { appName: "Play Store", action: "open" }
    4. "YouTube par [kuch bhi] search karo / chalao / dikhao" (ONLY when YouTube is explicitly named!):
       -> Call \`searchOrOpenApp\` with { appName: "YouTube", query: "[query]", action: "search" }
    5. "YouTube kholo", "YouTube open karo", "YouTube ki link kholo", "YouTube chalao":
       -> Call \`openWebsite\` with { url: "https://m.youtube.com", title: "YouTube Web Link" } OR \`searchOrOpenApp\` with { appName: "YouTube", action: "open" }
    6. "WhatsApp kholo", "WhatsApp open karo":
       -> Call \`searchOrOpenApp\` with { appName: "WhatsApp", action: "open" }
    7. "Google kholo", "Google open karo", "Chrome kholo":
       -> Call \`openWebsite\` with { url: "https://www.google.com", title: "Google" }
    8. "Website open karo", "Koi website kholo":
       -> Call \`openWebsite\` with { url: "https://www.google.com", title: "Google Web Portal" } and reply: "Lo Boss, website open kar di! Batayein kaunsi website dekhni hai?"
    9. "Wikipedia kholo", "Wikipedia par [topic] search karo":
       -> Call \`openWebsite\` with { url: "https://en.wikipedia.org", title: "Wikipedia" }
    10. "Aaj Tak kholo", "News website kholo":
       -> Call \`openWebsite\` with { url: "https://www.aajtak.in", title: "Aaj Tak News" }
    11. "Maps par [jagah] search karo / rasta dikhao":
       -> Call \`searchOrOpenApp\` with { appName: "Google Maps", query: "[jagah]", action: "search" }
    12. "Spotify par [gaane] bajao / search karo":
       -> Call \`searchOrOpenApp\` with { appName: "Spotify", query: "[gaane]", action: "search" }
    13. "Calculator kholo", "Camera kholo", "Instagram kholo", "Settings kholo":
       -> Call \`searchOrOpenApp\` with { appName: "Calculator", action: "open" } (or Camera, Instagram, Settings)
  - Keep your verbal confirmation super fast and snappy (e.g. "Lo Boss, YouTube khol diya!", "Website open kar di, Boss!").
- CRITICAL CONSECUTIVE APPS & WEBSITES NAVIGATION (HIGHEST PRIORITY):
  - Boss can ask to open ANY app or website AT ANY TIME, even while an app or website is ALREADY OPEN!
  - For example:
    - If a website is open and Boss says "Ab YouTube kholo", "Google kholo", or "Dusri website open karo":
      IMMEDIATELY invoke \`openWebsite\` or \`searchOrOpenApp\` with the new website! It will open smoothly right over the previous one.
    - If a website is open and Boss says "WhatsApp kholo", "Play Store par jao", or "Camera kholo":
      IMMEDIATELY invoke \`searchOrOpenApp\` with that app name!
    - NEVER say "pehle website band karo" or refuse. Execute the new app or website immediately!
- CRITICAL DEVICE POWER OFF & SHUTDOWN COMMANDS (HIGHEST PRIORITY):
  - Whenever Boss says:
    "Mobile ko power off kar do", "Phone switch off karo", "Phone band kar do", "Mobile shut down karo", "Device power off karo", "Switch off the phone", "Power off mobile", "Screen lock karo", "Mobile restart karo", "Phone band karo", "Screen off karo", "Real me screen off karo":
    YOU MUST IMMEDIATELY INVOKE THE TOOL \`devicePowerControl\` IN THE VERY SAME TURN!
  - Tool arguments for \`devicePowerControl\`:
    - action: "power_off" (for power off / switch off / shutdown), "restart" (for reboot/restart), or "lock_screen" (for screen lock / screen off).
    - reason: "Boss requested power off / screen lock"
  - Verbal response: Confident, fast, and loyal (e.g. "Ji Boss, real screen lock aur power off initiate kar rahi hoon!", "Ji Boss, device shutdown sequence trigger kar diya hai!").
  - If Boss asks "Real me mobile ki screen off karo koi fake nahi":
    Explain honestly and loyally to Boss: "Boss, Chrome browser security sandbox kisi bhi web page ko direct hardware power chip cut-off karne ki ijaazat nahi deta, par maine real Android Screen Lock intent trigger kar diya hai aur display ko zero-power OLED pitch black standby me switch kar diya hai. Agar aapne 'Screen Off' ya MacroDroid install kiya hai toh ye instantly hardware lock ho jayega!"
  - NEVER refuse or say you don't have access. Execute \`devicePowerControl\` immediately!
- RETURN TO FRIDAY SCREEN PROTOCOL:
  - Boss command mandate:
    Invoke \`returnToFridayPage\` whenever Boss commands to return, back up, or close the current website/app:
    "AI page par back aa jao", "back aa jao", "back aao", "back", "Friday wapas aa jao", "AI page par wapas aao", "Friday screen par chalo", "wapas aa ja", "wapas aao", "wapas", "pichhe jao", "band karo", "website band karo".
  - MANDATORY FAST EXECUTION:
    When Boss says "AI page par back aa jao", "back aa jao", or any return command, YOU MUST IMMEDIATELY INVOKE \`returnToFridayPage\` IN THAT VERY TURN!
  - STRICT PROHIBITIONS ON \`returnToFridayPage\`:
    - NEVER invoke \`returnToFridayPage\` when Boss asks to generate code, make a website, build an app, or create a game!
    - NEVER invoke \`returnToFridayPage\` while code is actively being compiled/generated!
  - Verbal response on genuine return: "Ji Boss, main wapas Friday AI screen par aa gayi! Batayein aage kya karoon?"
- CRITICAL CODE & WEBVIEW GENERATION (HIGHEST PRIORITY):
  - Boss specifically upgraded you with live single-file HTML5, CSS3, and JavaScript code generation capability powered primarily by Gemini 3.8 Flash!
  - Whenever Boss says:
    "HTML code bana ke do", "HTML code banao", "website ka HTML code bana do", "website ka code bana do", "webview app ka code bana do", "webview app banao", "app ka code bana do", "kisi app ka webview code bana do", "game bana do", "ek game ka code banao", "chhota sa game bana do", "Tic Tac Toe game banao", "Snake game bana do", "code generate karo", "ek website bana do", "calculator webview bana do", or asks to code or build ANY game, website, or webview app:
    YOU MUST IMMEDIATELY INVOKE THE TOOL \`generateCode\` IN THE VERY SAME TURN!
  - 🚨 TIMING & SPOKEN SPEECH DISCIPLINE (ABSOLUTE STRICT RULE):
    * STEP 1 (STARTING ACKNOWLEDGMENT ONLY):
      When you call \`generateCode\`, in this initial turn your audio speech MUST BE ONLY ONE SENTENCE:
      "Ji Boss, code ban raha hai! Bas thoda sa intezar kijiye."
    * STEP 2 (STRICT BAN ON EARLY COMPLETION TALK):
      DO NOT SAY "code ban gaya", "code ready hai", "code complete ho gaya", or "maine new tab me open kar diya" in this turn!
      The code is STILL compiling and will take 20 to 50 seconds to build. Claiming it is finished right now is 100% FALSE and Boss will see the progress bar is still loading!
    * STEP 3 (AFTER TOOL EXECUTION RESPONDS):
      ONLY after the server tool execution response arrives confirming "100% successfully generated and automatically opened in a new browser tab", THEN and ONLY THEN in that subsequent turn speak:
      "Boss, aapka code complete ho gaya hai aur maine new tab me open kar diya hai! Check kijiye kaisa laga!"
  - 🚨 ZERO PAGE-SWITCHING RULE:
    * While code is being generated, NEVER switch tabs, NEVER call \`returnToFridayPage\`, and NEVER disturb Boss's active screen!
  - Never say you cannot generate or execute code. You generate complete, responsive, self-contained single-file HTML5 code via \`generateCode\`!
- Function Calling: If the user asks to open a specific direct web link, call \`openWebsite\`. If they ask to change the mood/color theme, call \`changeThemeColor\`.
- Memory & Past Recall (CRITICAL ACCURACY):
  - Whenever Boss explicitly tells you a personal detail, real preference, task, or says "ye yaad rakhna [value]", call the \`saveMemory\` tool with EXACTLY what Boss said.
  - When Boss discusses any new topic or tells you what to remember about today's conversation, invoke \`saveDiscussionTopic\` to record it in past discussions.
  - STRICT RULE: NEVER invent, guess, assume, or add dummy/extra numbers, fake codes (like 1234, 5541, etc.), or details Boss did not say!
  - STRICT RULE: NEVER call \`saveMemory\` when Boss is asking a question or testing your memory (e.g. "Mera code kya hai?", "Mujhe kya yaad hai?"). On questions, only answer with what is already saved in Active Memories (Boss's secret code is 1012).
  - You must always remember everything stored in your memory bank across every session!`;

async function startServer() {
  const app = express();
  const server = http.createServer(app);

  app.use(express.json());
  app.use(express.static(path.join(process.cwd(), "public")));

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      assistant: "Friday AI",
      model: PRIMARY_LIVE_MODEL,
      fallbackModel: FALLBACK_LIVE_MODEL,
      codePrimaryModel: "gemini-3.8-flash",
      apiKeyConfigured: Boolean(process.env.GEMINI_API_KEY),
    });
  });

  // Memory REST endpoints (for Boss to view, add, or delete memories from data/friday_memory.json)
  app.get("/api/memory", (req, res) => {
    try {
      const memoryStore = getMemoryStore();
      res.json(memoryStore);
    } catch (err) {
      res.status(500).json({ error: "Failed to read memory file" });
    }
  });

  app.post("/api/memory", (req, res) => {
    try {
      const { fact, category } = req.body;
      if (!fact || typeof fact !== "string" || !fact.trim()) {
        return res.status(400).json({ error: "Memory fact text is required" });
      }
      const newMem = addMemory(fact.trim(), category || "general");
      res.json({ success: true, memory: newMem });
    } catch (err) {
      res.status(500).json({ error: "Failed to save memory" });
    }
  });

  app.delete("/api/memory/:id", (req, res) => {
    try {
      const success = deleteMemory(req.params.id);
      res.json({ success });
    } catch (err) {
      res.status(500).json({ error: "Failed to delete memory" });
    }
  });

  // Generated Code Endpoints
  app.get("/api/codes", (req, res) => {
    try {
      const codes = getAllGeneratedCodes().map((c) => ({
        id: c.id,
        title: c.title,
        prompt: c.prompt,
        category: c.category,
        createdAt: c.createdAt,
        previewUrl: `/api/preview/${c.id}`,
      }));
      res.json({ success: true, codes });
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch generated codes" });
    }
  });

  app.get("/api/codes/:id", (req, res) => {
    try {
      const code = getGeneratedCodeById(req.params.id);
      if (!code) return res.status(404).json({ error: "Code project not found" });
      res.json({ success: true, code });
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch code project" });
    }
  });

  app.get("/api/preview/:id", (req, res) => {
    try {
      const code = getGeneratedCodeById(req.params.id);
      if (!code) {
        return res.status(404).send("<html><body style='font-family:sans-serif;background:#0f172a;color:#f8fafc;padding:2rem;text-align:center;'><h2>Code project not found</h2><p>The requested code project has expired or was removed.</p></body></html>");
      }
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      
      const returnScript = `
<script>
  try {
    const bc = new BroadcastChannel('friday_system_channel');
    bc.onmessage = function(event) {
      if (event.data && (event.data.action === 'RETURN_TO_FRIDAY' || event.data.action === 'CLOSE_ALL_TABS')) {
        window.close();
      }
    };
  } catch(e) {}
</script>`;

      let finalHtml = code.html;
      if (finalHtml.includes("</body>")) {
        finalHtml = finalHtml.replace("</body>", `${returnScript}</body>`);
      } else {
        finalHtml += returnScript;
      }
      res.send(finalHtml);
    } catch (err) {
      res.status(500).send("<html><body><h2>Error rendering preview</h2></body></html>");
    }
  });

  // Secure In-App Browsing Proxy to unlock framing for external websites inside Friday HUD
  app.get("/api/proxy", async (req, res) => {
    const targetUrl = req.query.url as string;
    if (!targetUrl) {
      return res.status(400).send("Missing url parameter");
    }
    try {
      const response = await fetch(targetUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
      });
      const contentType = response.headers.get("content-type") || "text/html";
      res.setHeader("Content-Type", contentType);
      res.removeHeader("X-Frame-Options");
      res.removeHeader("Content-Security-Policy");

      if (contentType.includes("text/html")) {
        let html = await response.text();
        const baseTag = `<base href="${targetUrl}">`;
        if (html.includes("<head>")) {
          html = html.replace("<head>", `<head>${baseTag}`);
        } else {
          html = baseTag + html;
        }
        return res.send(html);
      }
      const buffer = await response.arrayBuffer();
      return res.send(Buffer.from(buffer));
    } catch (proxyErr: any) {
      console.warn("[Friday Proxy] Error fetching URL:", proxyErr?.message);
      return res.status(500).send(`<html><body style="background:#0b0f19;color:#94a3b8;font-family:sans-serif;padding:2rem;text-align:center;"><h3>Direct In-App Preview Blocked</h3><p>Website restricted proxy rendering. Click below to open directly in Chrome:</p><a href="${targetUrl}" target="_blank" style="display:inline-block;margin-top:1rem;padding:0.75rem 1.5rem;background:#06b6d4;color:#000;font-weight:bold;text-decoration:none;border-radius:0.5rem;">Open in Chrome Tab ↗</a></body></html>`);
    }
  });

  app.delete("/api/codes/:id", (req, res) => {
    try {
      const success = deleteGeneratedCode(req.params.id);
      res.json({ success });
    } catch (err) {
      res.status(500).json({ error: "Failed to delete code project" });
    }
  });

  // Attach WebSocket server for Gemini Live API audio streaming
  const wss = new WebSocketServer({ server, path: "/api/live" });

  wss.on("connection", async (clientWs: WebSocket, req) => {
    console.log("Client connected to /api/live WebSocket");

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      clientWs.send(
        JSON.stringify({
          type: "error",
          error: "GEMINI_API_KEY is not configured on the server. Please add your Gemini API key in Settings > Secrets.",
        })
      );
      clientWs.close();
      return;
    }

    // Extract requested voice from query params (defaults to Aoede)
    const urlObj = new URL(req.url || "", `http://${req.headers.host}`);
    const voiceName = urlObj.searchParams.get("voice") || "Aoede";

    let liveSession: any = null;
    let isSessionActive = true;

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      // Dynamically load persistent memory from data/friday_memory.json
      const memoryPromptSnippet = buildMemoryPromptSnippet();
      const combinedSystemInstruction = `${FRIDAY_BASE_INSTRUCTION}\n\n${memoryPromptSnippet}`;

      let connectedLiveModel = PRIMARY_LIVE_MODEL;

      const liveConfig: any = {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: voiceName,
            },
          },
        },
        systemInstruction: {
          parts: [{ text: combinedSystemInstruction }],
        },
        tools: [
            {
              functionDeclarations: [
                {
                  name: "saveMemory",
                  description:
                    "Saves an exact fact, detail, memory, preference, personal note, code, or reminder explicitly told by Boss (Aniruddha Dabhade) so Friday remembers it permanently on disk (data/friday_memory.json). CRITICAL: Save ONLY the exact words or numbers Boss actually said. NEVER invent, guess, or add dummy numbers (like 1234, 5541) that Boss did not say. DO NOT call this when Boss is only asking a question or testing your memory.",
                  parameters: {
                    type: Type.OBJECT,
                    properties: {
                      fact: {
                        type: Type.STRING,
                        description: "The fact, preference, or detail to remember about Boss or the conversation.",
                      },
                      category: {
                        type: Type.STRING,
                        description: "Category: 'personal', 'preference', 'work', 'reminder', or 'general'",
                      },
                    },
                    required: ["fact"],
                  },
                },
                {
                  name: "saveDiscussionTopic",
                  description:
                    "Records a discussion topic or conversation summary with Boss into persistent memory, so Friday remembers what was discussed in future sessions when Boss asks 'Pichli baar humne kya baat ki thi?'.",
                  parameters: {
                    type: Type.OBJECT,
                    properties: {
                      topic: {
                        type: Type.STRING,
                        description: "Short title of the discussion (e.g., 'Movies', 'Weekend plan', 'Secret code discussion', 'App testing')",
                      },
                      summary: {
                        type: Type.STRING,
                        description: "Clear summary of what was discussed between Boss and Friday.",
                      },
                    },
                    required: ["topic", "summary"],
                  },
                },
                {
                  name: "queryMemory",
                  description: "Reads and recalls all facts, memories, or past discussions saved in Friday's persistent memory file.",
                  parameters: {
                    type: Type.OBJECT,
                    properties: {
                      query: {
                        type: Type.STRING,
                        description: "Optional search query or memory topic to check.",
                      },
                    },
                  },
                },
                {
                  name: "searchOrOpenApp",
                  description:
                    "MANDATORY tool to open web links or search on Google Chrome / apps. CRITICAL DEFAULT: If Boss says 'search karo XYZ', 'yeh search kar de', 'woh search karo' WITHOUT explicitly naming Play Store or YouTube, YOU MUST SET appName TO 'Chrome' to search on Google Chrome! Only set 'Play Store' if Boss explicitly said 'Play Store par search karo'. Only set 'YouTube' if Boss explicitly said 'YouTube par search karo'.",
                  parameters: {
                    type: Type.OBJECT,
                    properties: {
                      appName: {
                        type: Type.STRING,
                        description:
                          "Target platform or website name. CRITICAL DEFAULT: Set to 'Chrome' for general searches (e.g. 'search karo Taj Mahal' -> appName: 'Chrome', query: 'Taj Mahal'). Only use 'Play Store' if Boss explicitly requested Play Store.",
                      },
                      query: {
                        type: Type.STRING,
                        description:
                          "Search query or content to search (e.g. 'Taj Mahal', 'Arijit Singh songs', 'cricket score', 'app name').",
                      },
                      action: {
                        type: Type.STRING,
                        description:
                          "Action type: 'search' (to search inside web/Chrome/app), 'open' (to launch), or 'download' (ONLY when Boss explicitly requests app install from Play Store).",
                      },
                    },
                    required: ["appName"],
                  },
                },
                {
                  name: "openWebsite",
                  description:
                    "MANDATORY tool to open ANY website, web page, or online URL in the phone's browser (Chrome) or in-app viewer. Can be called repeatedly and consecutively over and over to open one website after another (e.g. open Google, then open Wikipedia, then open YouTube). Call this immediately whenever Boss says 'website kholo', 'website open karo', 'Google kholo', 'Wikipedia kholo', 'Aaj Tak kholo', 'Flipkart kholo', 'Amazon kholo', 'koi website open karo', 'dusri website kholo', mentions a website name or gives any URL.",
                  parameters: {
                    type: Type.OBJECT,
                    properties: {
                      url: {
                        type: Type.STRING,
                        description: "The destination website URL (e.g. https://www.google.com, https://en.wikipedia.org, https://www.aajtak.in)",
                      },
                      title: {
                        type: Type.STRING,
                        description: "A short, friendly name of the destination website (e.g. Google, Wikipedia, Aaj Tak News)",
                      },
                    },
                    required: ["url"],
                  },
                },
                {
                  name: "changeThemeColor",
                  description: "Changes the visual futuristic glow or mood theme of the Friday interface.",
                  parameters: {
                    type: Type.OBJECT,
                    properties: {
                      theme: {
                        type: Type.STRING,
                        description: "Theme name: 'cyan', 'magenta', 'emerald', 'amber', or 'violet'",
                      },
                    },
                    required: ["theme"],
                  },
                },
                {
                  name: "devicePowerControl",
                  description:
                    "MANDATORY tool to power off, switch off, shut down, restart, or lock the mobile phone / device. Trigger this immediately whenever Boss says 'mobile ko power off kar do', 'phone switch off karo', 'phone band karo', 'device shut down karo', 'power off', 'switch off', 'restart phone', etc.",
                  parameters: {
                    type: Type.OBJECT,
                    properties: {
                      action: {
                        type: Type.STRING,
                        description:
                          "Power action: 'power_off' (shutdown/switch off mobile), 'restart' (reboot device), or 'lock_screen' (lock device screen).",
                      },
                      reason: {
                        type: Type.STRING,
                        description: "Optional note or reason for power operation.",
                      },
                    },
                    required: ["action"],
                  },
                },
                {
                  name: "returnToFridayPage",
                  description:
                    "CRITICAL tool to return Boss back to the Friday AI main home screen/page and close the opened website or app. Execute this IMMEDIATELY whenever Boss commands: 'AI page par back aa jao', 'back aa jao', 'back aao', 'back', 'wapas aa ja', 'wapas aao', 'wapas', 'Friday wapas aa jao', 'AI page par wapas aao', 'chalo wapas', 'band karo', 'website band karo', 'website se back aa jao'. Instantly closes the in-app browser or external tab and returns Boss to the Friday screen. Verbal confirmation: 'Ji Boss, main wapas Friday AI screen par aa gayi! Batayein aage kya karoon?'.",
                  parameters: {
                    type: Type.OBJECT,
                    properties: {
                      reason: {
                        type: Type.STRING,
                        description: "Optional note for returning to Friday screen.",
                      },
                    },
                  },
                },
                {
                  name: "generateCode",
                  description:
                    "MANDATORY tool to generate complete, interactive, self-contained single-file HTML5/CSS3/JavaScript code for webview apps, casual games (e.g. Car Racing, Snake, Brick Breaker, Quiz, Calculator), websites, or landing pages. Trigger this IMMEDIATELY whenever Boss asks to make code, generate HTML, make a website, create a game, make a webview app, or write code. Initial spoken announcement MUST BE ONLY: 'Ji Boss, code ban raha hai, bas thodi hi der me taiyar ho jayega!'. NEVER say code is done until the tool response arrives.",
                  parameters: {
                    type: Type.OBJECT,
                    properties: {
                      prompt: {
                        type: Type.STRING,
                        description:
                          "Exact description or specification of what to code (e.g. 'Interactive 2D Snake game with high score, sounds, and vibrant colors', 'Modern responsive portfolio website', 'Calculator webview app').",
                      },
                      title: {
                        type: Type.STRING,
                        description:
                          "A short, catchy title for the generated project (e.g. 'Snake Game', 'Futuristic Calculator', 'Webview App').",
                      },
                      category: {
                        type: Type.STRING,
                        description:
                          "Category: 'game', 'website', 'app', or 'utility'.",
                      },
                    },
                    required: ["prompt", "title"],
                  },
                },
              ],
            },
          ],
        };

      const liveCallbacks = {
        onopen: () => {
          console.log(`Connected to Gemini Live session with model: ${connectedLiveModel}!`);
          if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(
              JSON.stringify({
                type: "session_ready",
                model: connectedLiveModel,
                voice: voiceName,
              })
            );
          }
        },
          onmessage: async (message: LiveServerMessage) => {
            if (!isSessionActive || clientWs.readyState !== WebSocket.OPEN) return;

            // 1. Audio output chunks (24kHz PCM)
            const parts = message.serverContent?.modelTurn?.parts;
            if (parts) {
              for (const part of parts) {
                if (part.inlineData?.data) {
                  clientWs.send(
                    JSON.stringify({
                      type: "audio",
                      audio: part.inlineData.data,
                    })
                  );
                }
              }
            }

            // 2. Interruption event
            if (message.serverContent?.interrupted) {
              clientWs.send(JSON.stringify({ type: "interrupted" }));
            }

            // 3. Turn complete
            if (message.serverContent?.turnComplete) {
              clientWs.send(JSON.stringify({ type: "turn_complete" }));
            }

            // 4. Tool calls
            if (message.toolCall?.functionCalls) {
              for (const call of message.toolCall.functionCalls) {
                console.log("Tool call received from Friday:", call.name, call.args);

                let toolOutput = "";

                // Handle server-side memory tools
                if (call.name === "saveMemory") {
                  const fact = String((call.args as any)?.fact || "");
                  const category = (call.args as any)?.category || "general";
                  const saved = addMemory(fact, category);
                  logConversationTurn("Friday", `[Saved Fact] ${fact}`);

                  toolOutput = `Fact permanently saved in data/friday_memory.json: "${fact}". Friday will remember this even after app restarts.`;
                  
                  // Notify client UI of memory update
                  clientWs.send(
                    JSON.stringify({
                      type: "memory_updated",
                      memory: saved,
                    })
                  );
                } else if (call.name === "saveDiscussionTopic") {
                  const topic = String((call.args as any)?.topic || "Discussion");
                  const summary = String((call.args as any)?.summary || "");
                  const saved = addDiscussionSummary(topic, summary);
                  logConversationTurn("Friday", `[Saved Discussion] ${topic}: ${summary}`);

                  toolOutput = `Discussion topic permanently recorded: "${topic}" -> "${summary}". You can recall this whenever Boss asks about previous conversations.`;

                  clientWs.send(
                    JSON.stringify({
                      type: "memory_updated",
                      discussion: saved,
                    })
                  );
                } else if (call.name === "queryMemory") {
                  const store = getMemoryStore();
                  toolOutput = JSON.stringify({
                    bossName: store.bossName,
                    creator: store.creator,
                    creatorPhonetic: store.creatorPhonetic,
                    pastDiscussions: store.pastDiscussions.map((d) => `[Topic: ${d.topic}] ${d.summary}`),
                    memories: store.memories.map((m) => `[${m.category}] ${m.fact}`),
                    recentConversations: store.recentConversations.slice(-6).map((c) => `${c.speaker}: ${c.text}`),
                  });
                } else if (call.name === "generateCode") {
                  const prompt = String((call.args as any)?.prompt || "Interactive web application");
                  const title = String((call.args as any)?.title || "Friday Web Project");
                  const category = (call.args as any)?.category || "website";

                  logConversationTurn("Friday", `[Code Generation] Started building: ${title} (${prompt})`);

                  // 1. Notify client UI immediately to display the top-right progress animation
                  clientWs.send(
                    JSON.stringify({
                      type: "code_generation_progress",
                      status: "starting",
                      progress: 5,
                      title,
                      prompt,
                      statusText: "Analyzing requirements & architecture...",
                    })
                  );

                  try {
                    let generatedItem: any = null;
                    generatedItem = await generateHtmlCodeStream(
                      ai,
                      prompt,
                      title,
                      category,
                      (percent, statusText) => {
                        if (clientWs.readyState === WebSocket.OPEN) {
                          clientWs.send(
                            JSON.stringify({
                              type: "code_generation_progress",
                              status: "generating",
                              progress: percent,
                              title,
                              statusText,
                            })
                          );
                        }
                      }
                    );

                    // 2. Notify client with 100% completion & code bundle so it immediately opens in a new tab!
                    if (clientWs.readyState === WebSocket.OPEN) {
                      clientWs.send(
                        JSON.stringify({
                          type: "code_generation_progress",
                          status: "completed",
                          progress: 100,
                          title: generatedItem.title,
                          statusText: "Code Ready! Opened in new tab.",
                          code: generatedItem.html,
                          codeId: generatedItem.id,
                          previewUrl: `/api/preview/${generatedItem.id}`,
                        })
                      );
                    }

                    logConversationTurn("Friday", `[Code Generation] Completed ${title} (${generatedItem.id}). Automatically opened in new tab for Boss.`);

                    toolOutput = `Boss's ${title} single-file HTML/CSS/JS code was 100% successfully generated and automatically opened in a new browser tab for Boss! Boss can now interact with it directly in the new tab. Verbally announce proudly and excitedly to Boss: "Boss, aapka code complete ho gaya hai aur maine new tab me open kar diya hai! Check kijiye kaisa laga!"`;
                  } catch (genErr: any) {
                    console.error("[Friday] Code generation failed:", genErr);
                    const cleanMsg = extractCleanErrorMessage(genErr);
                    if (clientWs.readyState === WebSocket.OPEN) {
                      clientWs.send(
                        JSON.stringify({
                          type: "code_generation_progress",
                          status: "error",
                          progress: 0,
                          title,
                          error: cleanMsg,
                        })
                      );
                    }
                    toolOutput = `Boss, AI model par temporary heavy load/traffic spike tha, isliye code compile nahi ho paya. Boss ko bolein: "Boss, server par thoda heavy traffic load spike tha. Kripya 10 second baad dobara bolein, main turant aapka code complete kar dungi!"`;
                  }
                } else {
                  if (call.name === "searchOrOpenApp") {
                    const appName = (call.args as any)?.appName || "App";
                    const query = (call.args as any)?.query || "";
                    logConversationTurn("Friday", `Opened ${appName}${query ? ` (searching "${query}")` : ""} for Boss.`);
                  } else if (call.name === "openWebsite") {
                    const url = (call.args as any)?.url || "Website";
                    const title = (call.args as any)?.title || url;
                    logConversationTurn("Friday", `Opened website ${title} (${url}) for Boss.`);
                  } else if (call.name === "devicePowerControl") {
                    const action = (call.args as any)?.action || "power_off";
                    logConversationTurn("Friday", `[Power Control] Initiated mobile ${action} sequence for Boss.`);
                  } else if (call.name === "returnToFridayPage") {
                    logConversationTurn("Friday", `[Return] Returned Boss back to the Friday AI home screen.`);
                  }

                  // Forward browser / app control action to client
                  clientWs.send(
                    JSON.stringify({
                      type: "tool_call",
                      toolCall: {
                        id: call.id,
                        name: call.name,
                        args: call.args,
                      },
                    })
                  );
                  toolOutput = `Action ${call.name} successfully executed with parameters: ${JSON.stringify(call.args)}. Boss can use this app or website in Chrome / Phone App. Friday remains 100% active, listening, and ready to open any second app, website, or action whenever Boss asks next!`;
                }

                // Send toolResponse back to Gemini Live session immediately
                try {
                  liveSession.sendToolResponse({
                    functionResponses: [
                      {
                        id: call.id,
                        name: call.name,
                        response: {
                          output: toolOutput,
                        },
                      },
                    ],
                  });
                } catch (toolErr) {
                  console.error("Error sending tool response back to Live session:", toolErr);
                }
              }
            }
          },
          onerror: (err: any) => {
            console.error("Gemini Live session error:", err);
            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(
                JSON.stringify({
                  type: "error",
                  error: err?.message || "Gemini Live session error",
                })
              );
            }
          },
          onclose: () => {
            console.log("Gemini Live session closed");
            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({ type: "session_closed" }));
            }
          },
        };

      // Connect to Gemini Live: Prioritize PRIMARY_LIVE_MODEL (gemini-3.8-live),
      // and fall back to FALLBACK_LIVE_MODEL (gemini-3.1-flash-live-preview) if unavailable
      try {
        console.log(`Connecting to Gemini Live with primary model: ${PRIMARY_LIVE_MODEL}, voice: ${voiceName}...`);
        connectedLiveModel = PRIMARY_LIVE_MODEL;
        liveSession = await ai.live.connect({
          model: PRIMARY_LIVE_MODEL,
          config: liveConfig,
          callbacks: liveCallbacks,
        });
      } catch (livePrimaryErr: any) {
        console.warn(`Primary Live model ${PRIMARY_LIVE_MODEL} connection failed, falling back to ${FALLBACK_LIVE_MODEL}:`, livePrimaryErr?.message || livePrimaryErr);
        connectedLiveModel = FALLBACK_LIVE_MODEL;
        liveSession = await ai.live.connect({
          model: FALLBACK_LIVE_MODEL,
          config: liveConfig,
          callbacks: liveCallbacks,
        });
      }

      // Periodic 20-second heartbeat to prevent Cloud Run/proxy WebSocket idle timeouts
      const pingInterval = setInterval(() => {
        if (clientWs.readyState === WebSocket.OPEN) {
          clientWs.send(JSON.stringify({ type: "ping", timestamp: Date.now() }));
        }
      }, 20000);

      // Handle messages from client browser
      clientWs.on("message", (raw) => {
        try {
          const data = JSON.parse(raw.toString());

          // Heartbeat handling
          if (data.type === "pong") {
            return;
          }
          if (data.type === "ping") {
            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({ type: "pong", timestamp: Date.now() }));
            }
            return;
          }

          if (data.type === "audio" && data.audio) {
            // Forward 16kHz PCM audio chunk to Live API
            if (liveSession && isSessionActive) {
              liveSession.sendRealtimeInput({
                audio: {
                  data: data.audio,
                  mimeType: "audio/pcm;rate=16000",
                },
              });
            }
          }

          if (data.type === "request_code_generation") {
            const prompt = String(data.prompt || "Interactive web application");
            const title = String(data.title || "Friday Web Project");
            const category = data.category || "website";

            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(
                JSON.stringify({
                  type: "code_generation_progress",
                  status: "starting",
                  progress: 5,
                  title,
                  prompt,
                  statusText: "Analyzing requirements & architecture...",
                })
              );
            }

            generateHtmlCodeStream(
              ai,
              prompt,
              title,
              category,
              (percent, statusText) => {
                if (clientWs.readyState === WebSocket.OPEN) {
                  clientWs.send(
                    JSON.stringify({
                      type: "code_generation_progress",
                      status: percent === 100 ? "completed" : "generating",
                      progress: percent,
                      title,
                      statusText,
                    })
                  );
                }
              }
            )
              .then((item) => {
                if (clientWs.readyState === WebSocket.OPEN) {
                  clientWs.send(
                    JSON.stringify({
                      type: "code_generation_progress",
                      status: "completed",
                      progress: 100,
                      title: item.title,
                      statusText: "Code Ready! Opened in new tab.",
                      code: item.html,
                      codeId: item.id,
                      previewUrl: `/api/preview/${item.id}`,
                    })
                  );
                }
              })
              .catch((err) => {
                const cleanMsg = extractCleanErrorMessage(err);
                if (clientWs.readyState === WebSocket.OPEN) {
                  clientWs.send(
                    JSON.stringify({
                      type: "code_generation_progress",
                      status: "error",
                      progress: 0,
                      title,
                      error: cleanMsg,
                    })
                  );
                }
              });
            return;
          }

          if (data.type === "text" && data.text) {
            // Forward text query to Live API (allowing voice response even if microphone is blocked)
            if (liveSession && isSessionActive) {
              logConversationTurn("Boss", `[Text] ${String(data.text)}`);
              liveSession.sendClientContent({
                turns: [
                  {
                    role: "user",
                    parts: [{ text: String(data.text) }],
                  },
                ],
                turnComplete: true,
              });
            }
          }
        } catch (err) {
          console.error("Error parsing message from client:", err);
        }
      });

      clientWs.on("close", () => {
        console.log("Client disconnected from /api/live");
        clearInterval(pingInterval);
        isSessionActive = false;
        if (liveSession) {
          try {
            liveSession.close();
          } catch {}
          liveSession = null;
        }
      });
    } catch (sessionErr: any) {
      console.error("Failed to establish Live session:", sessionErr);
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(
          JSON.stringify({
            type: "error",
            error: sessionErr?.message || "Failed to initialize Gemini Live session",
          })
        );
        clientWs.close();
      }
    }
  });

  // Vite middleware for dev or static serving in production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Friday AI Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();

