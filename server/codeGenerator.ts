import fs from "fs";
import path from "path";
import { GoogleGenAI } from "@google/genai";

export interface GeneratedCodeItem {
  id: string;
  title: string;
  prompt: string;
  category: "game" | "website" | "app" | "utility";
  html: string;
  createdAt: number;
}

const DATA_DIR = path.join(process.cwd(), "data");
const CODES_FILE_PATH = path.join(DATA_DIR, "friday_codes.json");

function ensureDirExists() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function getAllGeneratedCodes(): GeneratedCodeItem[] {
  try {
    ensureDirExists();
    if (!fs.existsSync(CODES_FILE_PATH)) {
      return [];
    }
    const raw = fs.readFileSync(CODES_FILE_PATH, "utf-8");
    return JSON.parse(raw);
  } catch (err) {
    console.error("[CodeGenerator] Error reading codes file:", err);
    return [];
  }
}

export function getGeneratedCodeById(id: string): GeneratedCodeItem | null {
  const codes = getAllGeneratedCodes();
  return codes.find((c) => c.id === id) || null;
}

export function saveGeneratedCode(item: GeneratedCodeItem): void {
  try {
    ensureDirExists();
    const codes = getAllGeneratedCodes();
    const existingIndex = codes.findIndex((c) => c.id === item.id);
    if (existingIndex >= 0) {
      codes[existingIndex] = item;
    } else {
      codes.unshift(item);
    }
    // Keep max 50 items
    if (codes.length > 50) {
      codes.splice(50);
    }
    fs.writeFileSync(CODES_FILE_PATH, JSON.stringify(codes, null, 2), "utf-8");
  } catch (err) {
    console.error("[CodeGenerator] Error saving code file:", err);
  }
}

export function deleteGeneratedCode(id: string): boolean {
  try {
    const codes = getAllGeneratedCodes();
    const filtered = codes.filter((c) => c.id !== id);
    if (filtered.length === codes.length) return false;
    fs.writeFileSync(CODES_FILE_PATH, JSON.stringify(filtered, null, 2), "utf-8");
    return true;
  } catch (err) {
    console.error("[CodeGenerator] Error deleting code:", err);
    return false;
  }
}

export function extractCleanErrorMessage(err: any): string {
  if (!err) return "Temporary generation issue. Please try again.";
  let str = typeof err === "string" ? err : err?.message || JSON.stringify(err);
  try {
    const parsed = JSON.parse(str);
    if (parsed?.error?.message) {
      str = parsed.error.message;
      try {
        const inner = JSON.parse(str);
        if (inner?.error?.message) str = inner.error.message;
      } catch {}
    }
  } catch {}
  if (str.includes("503") || str.includes("high demand") || str.includes("UNAVAILABLE")) {
    return "Server high demand spike (503). Retrying...";
  }
  if (str.includes("429") || str.includes("RESOURCE_EXHAUSTED")) {
    return "Rate limit reached. Please wait a moment.";
  }
  if (str.length > 70) {
    return str.slice(0, 70) + "...";
  }
  return str;
}

// Priority order: gemini-3.8-flash is ALWAYS attempted first as mandated by Boss!
// If high-demand spikes (503) or crashes occur, automatically fall back to rock-solid secondary engines.
const CANDIDATE_MODELS = [
  "gemini-3.8-flash",       // PRIMARY #1 - High-speed, powerful 3.8 engine
  "gemini-2.5-flash",       // Fallback #2 - Rock-solid high-quota workhorse
  "gemini-flash-latest",    // Fallback #3 - High-availability production engine
  "gemini-3.1-flash-lite",  // Fallback #4 - Ultra-fast lightweight fallback
  "gemini-2.5-pro",         // Fallback #5 - Deep reasoning engine
];

/**
 * Generates standalone, responsive HTML5/CSS3/JS code with real-time progress callbacks.
 * Features automatic multi-model fallback and retry on 503 high-demand or transient errors.
 */
export async function generateHtmlCodeStream(
  ai: GoogleGenAI,
  prompt: string,
  title: string,
  category: "game" | "website" | "app" | "utility" = "website",
  onProgress: (percent: number, statusText: string) => void
): Promise<GeneratedCodeItem> {
  const codeId = `code_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  
  onProgress(5, "Analyzing requirements with Gemini 3.8...");

  const systemPrompt = `You are a World-Class Principal Software Engineer & Elite Web Game Architect.
Your Boss Aniruddha Dabhade (अनिरुद्ध दाभाडे / Boss) commands you to build commercial-grade, hyper-realistic, production-level web applications and games.

CRITICAL DIRECTIVE FROM BOSS:
"Yeh code kisi AI ka banaya hua bilkul nahi lagna chahiye! Aisa lagna chahiye ki kisi top-tier pro developer ya Silicon Valley company ne banaya hai — 100% authentic, polished, realistic aur unique!"

STRICT PRODUCTION STANDARDS:
1. OUTPUT FORMAT:
   - Return ONLY the complete, self-contained single-file HTML document starting directly with <!DOCTYPE html> and ending with </html>.
   - ABSOLUTELY NO MARKDOWN WRAPPERS: Never output \`\`\`html or \`\`\` anywhere. Pure raw HTML only.
2. DESIGN SYSTEM & MODERN AESTHETICS (Anti-AI-Slop):
   - Include Google Fonts in <head> (<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">).
   - You MAY include Tailwind CSS CDN (<script src="https://cdn.tailwindcss.com"></script>) plus custom CSS in a <style> tag for custom keyframes, glowing gradients, glassmorphism, and custom scrollbars.
   - Color Palette: Deep luxury dark mode (e.g. #06080e, #0d111c, #161c2e), subtle neon accents, soft glows, crisp 1px borders (rgba(255,255,255,0.08)), sleek shadows, and micro-interactions with smooth cubic-bezier transitions.
   - ZERO "Lorem Ipsum" or placeholder text. Write authentic, realistic, engaging copy.
3. FOR GAMES (e.g. Snake, Pong, Flappy Bird, Brick Breaker, Space Shooter, Runner, Tetris, Tic Tac Toe, Car Racing, Maze):
   - 60FPS SMOOTH GAME ENGINE: Use requestAnimationFrame with delta-time calculation for silky smooth rendering on HTML5 <canvas> or reactive DOM.
   - DYNAMIC CAMERA & JUICE: Add camera shake on collisions/explosions, floating combo scores, and particle explosion systems on points or game over!
   - WEB AUDIO API SYNTHESIZER: Program rich procedural audio sound effects using AudioContext oscillators (crisp synth beep on score, chord fanfare on win, low rumble on impact, button click effects). NO dead silence! DO NOT use external audio file URLs.
   - CONTROLS FOR BOTH MOBILE & PC:
     * Desktop: Keyboard controls (Arrow keys + WASD + Space).
     * Mobile Touch: Sleek on-screen virtual touch controls (D-Pad, Virtual Joystick, or action buttons) with haptic feedback vibration (navigator.vibrate([35])).
   - GAMEPLAY FEATURES: Real-time score, high score saved in localStorage, pause menu (ESC / Pause button), sound mute toggle, level progression, restart button.
4. FOR WEBSITES / WEBVIEW APPS (e.g. Portfolios, SaaS Dashboards, Calculators, E-commerce, Weather, Notes, Finance trackers):
   - MULTI-VIEW / TAB NAVIGATION: Fully working tab switches or multi-section layout.
   - REAL FUNCTIONALITY: Live search bar with instant filtering, modal dialogs, data sorting, add/delete/update items persisted in localStorage.
   - MODERN DATA VISUALIZATION: Use SVG or Canvas for sleek interactive charts and metric cards.
   - RESPONSIVE FLUID LAYOUT: Must look flawless on mobile phone screens (360px-430px), tablets, and desktop widescreen displays.
5. CODE ROBUSTNESS:
   - Zero console errors, fully scoped variables (const/let), defensive null checks, and mobile viewport meta tag (<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">).`;

  const userPrompt = `Create a complete, interactive, self-contained single-file HTML/CSS/JS application for Boss:
Title: ${title}
Category: ${category}
User Requirements: ${prompt}

Generate the full, complete <!DOCTYPE html> code now:`;

  let accumulatedText = "";
  let lastReportedPercent = 15;
  let lastError: any = null;

  // Try across multiple models to survive 503 high demand spikes
  for (let mIdx = 0; mIdx < CANDIDATE_MODELS.length; mIdx++) {
    const modelName = CANDIDATE_MODELS[mIdx];
    accumulatedText = "";
    lastReportedPercent = Math.max(15, lastReportedPercent);

    onProgress(lastReportedPercent, mIdx === 0 
      ? "Synthesizing HTML5 structure & styles..." 
      : `Switching to high-capacity engine (${mIdx + 1}/${CANDIDATE_MODELS.length})...`
    );

    try {
      console.log(`[CodeGenerator] Attempting code generation with model: ${modelName}`);

      const responseStream = await ai.models.generateContentStream({
        model: modelName,
        contents: [
          {
            role: "user",
            parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }],
          },
        ],
        config: {
          temperature: 0.7,
        },
      });

      let chunkCount = 0;
      for await (const chunk of responseStream) {
        const text = chunk.text;
        if (text) {
          accumulatedText += text;
          chunkCount++;

          const estimatedByChars = Math.min(92, Math.floor(15 + (accumulatedText.length / 4500) * 75));
          const estimatedByChunks = Math.min(94, 15 + chunkCount * 3);
          const currentEstimated = Math.max(estimatedByChars, estimatedByChunks);

          if (currentEstimated > lastReportedPercent && currentEstimated <= 94) {
            lastReportedPercent = currentEstimated;
            let label = "Writing responsive styles...";
            if (currentEstimated > 45 && currentEstimated < 75) {
              label = "Coding interactive logic & features...";
            } else if (currentEstimated >= 75) {
              label = "Finalizing script and rendering...";
            }
            onProgress(lastReportedPercent, label);
          }
        }
      }

      // If we got sufficient code, exit the retry loop
      if (accumulatedText.length > 300) {
        console.log(`[CodeGenerator] Success with model ${modelName} (${accumulatedText.length} chars)`);
        break;
      }
    } catch (err: any) {
      lastError = err;
      console.warn(`[CodeGenerator] Model ${modelName} failed:`, err?.message || err);

      // If this wasn't the last model, wait a moment and try the next candidate
      if (mIdx < CANDIDATE_MODELS.length - 1) {
        onProgress(Math.max(20, lastReportedPercent - 10), "Server busy. Switching to alternate engine...");
        await new Promise((res) => setTimeout(res, 900));
      }
    }
  }

  // Fallback: If streaming failed on all models, try single generateContent call
  if (accumulatedText.length < 300) {
    console.log("[CodeGenerator] Streaming exhausted. Trying resilient direct generation fallback...");
    onProgress(50, "Direct synthesizing HTML5 bundle...");
    for (const fbModel of ["gemini-flash-latest", "gemini-3.1-flash-lite"]) {
      try {
        const res = await ai.models.generateContent({
          model: fbModel,
          contents: [
            {
              role: "user",
              parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }],
            },
          ],
        });
        const directText = res.text || "";
        if (directText.length > 200) {
          accumulatedText = directText;
          break;
        }
      } catch (fbErr) {
        console.warn(`[CodeGenerator] Direct fallback model ${fbModel} error:`, fbErr);
        lastError = fbErr;
      }
    }
  }

  if (accumulatedText.length < 200) {
    const cleanMsg = extractCleanErrorMessage(lastError);
    throw new Error(cleanMsg);
  }

  onProgress(96, "Validating HTML5 bundle...");

  // Clean any markdown backticks if the model accidentally included them
  let cleanHtml = accumulatedText.trim();
  if (cleanHtml.startsWith("```html")) {
    cleanHtml = cleanHtml.slice(7).trim();
  } else if (cleanHtml.startsWith("```")) {
    cleanHtml = cleanHtml.slice(3).trim();
  }
  if (cleanHtml.endsWith("```")) {
    cleanHtml = cleanHtml.slice(0, -3).trim();
  }

  // Ensure it is a valid HTML document
  if (!cleanHtml.includes("<!DOCTYPE") && !cleanHtml.includes("<html")) {
    cleanHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { margin: 0; font-family: system-ui, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; box-sizing: border-box; }
    .container { max-width: 600px; width: 100%; background: #1e293b; padding: 2rem; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
  </style>
</head>
<body>
  <div class="container">
    ${cleanHtml}
  </div>
</body>
</html>`;
  }

  const generatedItem: GeneratedCodeItem = {
    id: codeId,
    title: title || "Friday App",
    prompt,
    category,
    html: cleanHtml,
    createdAt: Date.now(),
  };

  saveGeneratedCode(generatedItem);
  onProgress(100, "Code Ready!");

  return generatedItem;
}
