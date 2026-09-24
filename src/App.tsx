/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AssistantState, ThemeMood, ToolCallData, ExecutedAction } from './types';
import { AudioStreamer } from './services/audioStreamer';
import { LiveSession } from './services/liveSession';
import { BackgroundKeepAlive } from './services/backgroundKeepAlive';
import { HeaderHUD } from './components/HeaderHUD';
import { InteractiveSphere } from './components/InteractiveSphere';
import { InitialActivationUI } from './components/InitialActivationUI';
import { ActionDrawer } from './components/ActionDrawer';
import { MicrophonePermissionModal } from './components/MicrophonePermissionModal';
import { InAppBrowserModal } from './components/InAppBrowserModal';
import { resolveMobileAppAction, launchMobileApp, returnToFridayTab, getPendingBackgroundLaunch, clearPendingBackgroundLaunch } from './utils/mobileIntent';
import { playFridayReturnChime, playCodeCompleteChime } from './utils/fridaySounds';
import { ShutdownOverlay, DevicePowerStatus } from './components/ShutdownOverlay';
import { CodeProgressWidget } from './components/CodeProgressWidget';
import { CodeGenerationStatus } from './types';
import { ExternalLink, AlertTriangle, X, Check } from 'lucide-react';

export default function App() {
  const [state, setState] = useState<AssistantState>('disconnected');
  const [theme, setTheme] = useState<ThemeMood>('cyan');
  const [voice, setVoice] = useState<'Aoede' | 'Kore' | 'Zephyr' | 'Puck' | 'Fenrir'>('Aoede');
  const [isMuted, setIsMuted] = useState(false);
  const [actions, setActions] = useState<ExecutedAction[]>([]);
  const [isActionDrawerOpen, setIsActionDrawerOpen] = useState(false);
  const [powerStatus, setPowerStatus] = useState<DevicePowerStatus>('online');
  const [codeStatus, setCodeStatus] = useState<CodeGenerationStatus | null>(null);
  const codeStatusRef = useRef<CodeGenerationStatus | null>(null);
  const lastCodeCompletedTimeRef = useRef<number>(0);
  const [inAppBrowser, setInAppBrowser] = useState<{
    url: string;
    title: string;
    appName?: string;
  } | null>(null);
  const [activeToast, setActiveToast] = useState<{
    title: string;
    desc: string;
    url?: string;
    nativeUri?: string;
    androidIntent?: string;
    isNativeApp?: boolean;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isMicPermissionModalOpen, setIsMicPermissionModalOpen] = useState(false);
  const [isMicBlocked, setIsMicBlocked] = useState(false);
  const [isPiPActive, setIsPiPActive] = useState(false);

  // Audio Streamer & Live Session references
  const audioStreamerRef = useRef<AudioStreamer>(new AudioStreamer());
  const liveSessionRef = useRef<LiveSession | null>(null);

  // Automatically opens generated single-file HTML/CSS/JS code in a new browser tab
  // CRITICAL: We DO NOT track code windows inside trackedWindows so returnToFridayTab NEVER closes Boss's game/app!
  const openGeneratedCodeInNewTab = useCallback((html: string, title: string, codeId?: string) => {
    try {
      let openedWin: Window | null = null;
      if (codeId) {
        openedWin = window.open(`/api/preview/${codeId}`, '_blank');
      }
      if (!openedWin || openedWin.closed || typeof openedWin.closed === 'undefined') {
        const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
        const blobUrl = URL.createObjectURL(blob);
        openedWin = window.open(blobUrl, '_blank');
      }
    } catch (err) {
      console.error('Error auto-opening generated code tab:', err);
      if (codeId) {
        window.open(`/api/preview/${codeId}`, '_blank');
      }
    }
  }, []);

  // Open external web view / website safely (Always web link in Chrome, NEVER native app)
  const handleOpenUrl = useCallback((rawUrl: string, _intent?: string, appName?: string) => {
    launchMobileApp({
      targetUrl: rawUrl,
      appName: appName,
      isNativeApp: false, // Critical: Always web link, NEVER native app!
    });
  }, []);

  // Execute tool calls dispatched from Gemini Live
  const handleToolCall = useCallback(
    (toolCall: ToolCallData) => {
      console.log('App executing toolCall:', toolCall);

      if (toolCall.name === 'searchOrOpenApp') {
        const appName = toolCall.args?.appName || 'App';
        const query = toolCall.args?.query || '';
        const action = toolCall.args?.action || 'open';
        const resolved = resolveMobileAppAction(appName, query, action);

        // Open in In-App Browser HUD for 100% instant voice return
        if (resolved.targetUrl) {
          setInAppBrowser({
            url: resolved.targetUrl,
            title: resolved.title,
            appName: resolved.appName,
          });
        }

        // Universal launcher: Android Intent for HopWeb/Android + window.open for Chrome
        const launchResult = launchMobileApp(resolved);

        const newAction: ExecutedAction = {
          id: toolCall.id,
          type: 'searchOrOpenApp',
          title: resolved.title,
          description: resolved.description,
          url: resolved.targetUrl,
          nativeUri: resolved.nativeUri,
          androidIntent: resolved.androidIntent || launchResult.androidIntent,
          isNativeApp: resolved.isNativeApp,
          appName: resolved.appName,
          timestamp: Date.now(),
          status: 'executed',
        };

        setActions((prev) => [newAction, ...prev]);
        setActiveToast({
          title: resolved.appName,
          desc: resolved.description,
          url: resolved.targetUrl,
          androidIntent: resolved.androidIntent || launchResult.androidIntent,
          nativeUri: resolved.nativeUri,
          isNativeApp: resolved.isNativeApp,
        });

        setTimeout(() => {
          setActiveToast(null);
        }, 4000);
      } else if (toolCall.name === 'openWebsite') {
        const rawUrl = toolCall.args?.url || '';
        const title = toolCall.args?.title || rawUrl;

        let formattedUrl = rawUrl.trim();
        if (!/^https?:\/\//i.test(formattedUrl)) {
          formattedUrl = 'https://' + formattedUrl;
        }

        const resolved = resolveMobileAppAction(title || 'Website', '', 'open');
        const effectiveTargetUrl = formattedUrl || resolved.targetUrl;

        // Open in In-App Browser HUD for instant voice return
        setInAppBrowser({
          url: effectiveTargetUrl,
          title: title || 'Website',
          appName: title || 'Website',
        });

        // Universal launcher: window.open for Chrome / Android
        const launchResult = launchMobileApp({
          targetUrl: effectiveTargetUrl,
          appName: title,
          androidIntent: resolved.androidIntent,
          isNativeApp: false,
        });

        const newAction: ExecutedAction = {
          id: toolCall.id,
          type: 'openWebsite',
          title: `Opened ${title || 'Website'}`,
          description: effectiveTargetUrl,
          url: effectiveTargetUrl,
          androidIntent: launchResult.androidIntent,
          timestamp: Date.now(),
          status: 'executed',
        };

        setActions((prev) => [newAction, ...prev]);
        setActiveToast({
          title: `Opening ${title || 'Website'}...`,
          desc: effectiveTargetUrl,
          url: effectiveTargetUrl,
          androidIntent: launchResult.androidIntent,
        });

        setTimeout(() => {
          setActiveToast(null);
        }, 4000);
      } else if (toolCall.name === 'returnToFridayPage') {
        // INSTANT 100% RETURN: Close any open In-App Browser HUD immediately
        setInAppBrowser(null);

        // STRICT RULE 1: If code is actively being compiled right now, do not interrupt compilation
        if (codeStatusRef.current && (codeStatusRef.current.status === 'starting' || codeStatusRef.current.status === 'generating')) {
          console.log('[Friday App] Skipped external tab return: Code generation is currently compiling.');
          return;
        }

        const { closedCount } = returnToFridayTab();

        // Close any overlays/drawers and reset power if in shutdown
        setPowerStatus('online');
        setIsActionDrawerOpen(false);
        setIsMicPermissionModalOpen(false);

        // Bring page to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
        try {
          window.focus();
        } catch {}

        // Play unmistakable futuristic Friday AI return sound
        try {
          if (liveSessionRef.current) {
            liveSessionRef.current.playReturnSound();
          } else {
            playFridayReturnChime();
          }
        } catch (audioErr) {
          console.warn('Return chime error:', audioErr);
        }

        const newAction: ExecutedAction = {
          id: toolCall.id,
          type: 'returnToFriday',
          title: 'Returned to Friday AI Screen',
          description: closedCount > 0
            ? `Closed ${closedCount} external tab(s) and returned to Friday screen.`
            : 'Returned to Friday AI main screen.',
          timestamp: Date.now(),
          status: 'executed',
        };

        setActions((prev) => [newAction, ...prev]);
        setActiveToast({
          title: 'Friday AI • Main Screen',
          desc: 'Wapas Friday AI screen par aa gaye, Boss!',
        });

        setTimeout(() => {
          setActiveToast(null);
        }, 4000);
      } else if (toolCall.name === 'changeThemeColor') {
        const newTheme = (toolCall.args?.theme || 'cyan').toLowerCase() as ThemeMood;
        if (['cyan', 'magenta', 'emerald', 'amber', 'violet'].includes(newTheme)) {
          setTheme(newTheme);

          const newAction: ExecutedAction = {
            id: toolCall.id,
            type: 'changeThemeColor',
            title: `Changed Mood Glow`,
            description: `Theme shifted to ${newTheme}`,
            timestamp: Date.now(),
            status: 'executed',
          };

          setActions((prev) => [newAction, ...prev]);
          setActiveToast({
            title: `Mood Shifted`,
            desc: `Theme aura changed to ${newTheme}`,
          });

          setTimeout(() => {
            setActiveToast(null);
          }, 4000);
        }
      } else if (toolCall.name === 'devicePowerControl') {
        const action = String(toolCall.args?.action || 'power_off').toLowerCase();

        if (action === 'power_off' || action === 'shutdown' || action === 'switch_off') {
          setPowerStatus('shutting_down');

          const newAction: ExecutedAction = {
            id: toolCall.id,
            type: 'devicePowerControl',
            title: 'Mobile Power Off Initiated',
            description: 'Boss Aniruddha Dabhade ke command par device shutdown kiya gaya.',
            timestamp: Date.now(),
            status: 'executed',
          };
          setActions((prev) => [newAction, ...prev]);

          setActiveToast({
            title: 'Powering Off Mobile...',
            desc: 'System shutdown sequence in progress',
          });

          // Android intent trigger if on Android device
          try {
            if (/android/i.test(navigator.userAgent)) {
              window.location.href = 'intent:#Intent;action=android.intent.action.ACTION_REQUEST_SHUTDOWN;end';
            }
          } catch (err) {
            console.log('Android shutdown intent:', err);
          }

          // Complete shutdown transition to black standby screen
          setTimeout(() => {
            if (liveSessionRef.current) {
              liveSessionRef.current.stop();
            }
            setPowerStatus('powered_off');
          }, 2400);
        } else if (action === 'restart' || action === 'reboot') {
          setPowerStatus('shutting_down');

          const newAction: ExecutedAction = {
            id: toolCall.id,
            type: 'devicePowerControl',
            title: 'Device Restart Initiated',
            description: "Phone reboot sequence initiated on Boss's command.",
            timestamp: Date.now(),
            status: 'executed',
          };
          setActions((prev) => [newAction, ...prev]);

          setTimeout(() => {
            setPowerStatus('booting');
            setTimeout(() => {
              setPowerStatus('online');
              if (liveSessionRef.current) {
                liveSessionRef.current.start(voice);
              }
            }, 3000);
          }, 2200);
        }
      }
    },
    [voice]
  );

  // Initialize LiveSession
  useEffect(() => {
    const session = new LiveSession(audioStreamerRef.current, {
      onStateChange: (newState) => {
        setState(newState);
      },
      onToolCall: (call) => {
        handleToolCall(call);
      },
      onError: (err) => {
        console.error('LiveSession error:', err);
        setErrorMessage(err);
        if (err.toLowerCase().includes('microphone') || err.toLowerCase().includes('permission')) {
          setIsMicBlocked(true);
          setIsMicPermissionModalOpen(true);
        }
        setTimeout(() => setErrorMessage(null), 7000);
      },
      onMicBlocked: () => {
        setIsMicBlocked(true);
        setIsMicPermissionModalOpen(true);
      },
      onMicReady: () => {
        setIsMicBlocked(false);
        setIsMicPermissionModalOpen(false);
        setErrorMessage(null);
      },
      onInterrupted: () => {
        console.log('Interruption handled');
      },
      onCodeProgress: (data) => {
        codeStatusRef.current = data;
        setCodeStatus(data);
        if (data.status === 'completed' && data.code) {
          lastCodeCompletedTimeRef.current = Date.now();

          // 1. Play celebratory completion sound!
          try {
            playCodeCompleteChime();
          } catch (sndErr) {
            console.warn('Completion chime error:', sndErr);
          }

          // 2. Automatically launch the generated app in a new tab!
          openGeneratedCodeInNewTab(data.code, data.title, data.codeId);

          // 3. Register in actions list
          const newAction: ExecutedAction = {
            id: data.codeId || `code_${Date.now()}`,
            type: 'generateCode',
            title: `Generated: ${data.title}`,
            description: `Single-file HTML5 code generated & opened in new tab.`,
            url: data.previewUrl || (data.codeId ? `/api/preview/${data.codeId}` : undefined),
            timestamp: Date.now(),
            status: 'executed',
          };
          setActions((prev) => [newAction, ...prev]);

          // 4. Inform via notification toast
          setActiveToast({
            title: `${data.title} Ready!`,
            desc: 'Code new tab me open kar diya hai, Boss!',
            url: data.previewUrl || (data.codeId ? `/api/preview/${data.codeId}` : undefined),
          });
          setTimeout(() => {
            setActiveToast(null);
          }, 5000);
        }
      },
    });

    liveSessionRef.current = session;

    return () => {
      session.stop();
      audioStreamerRef.current.close();
    };
  }, [handleToolCall]);

  // Listen for resume / tab focus from Android Home Screen to immediately execute pending background launches
  useEffect(() => {
    const handleResumeOrFocus = () => {
      if (document.visibilityState === 'visible') {
        const pending = getPendingBackgroundLaunch();
        if (pending) {
          clearPendingBackgroundLaunch();
          console.log('[Friday App] Resumed from Home Screen with pending launch:', pending);
          launchMobileApp({
            appName: pending.appName,
            targetUrl: pending.url,
            androidIntent: pending.intentUri,
            isNativeApp: pending.isNativeApp,
          });
          setActiveToast({
            title: `Opening ${pending.appName}...`,
            desc: pending.url,
            url: pending.url,
            androidIntent: pending.intentUri,
          });
          setTimeout(() => setActiveToast(null), 5000);
        }
      }
    };

    document.addEventListener('visibilitychange', handleResumeOrFocus);
    window.addEventListener('focus', handleResumeOrFocus);

    // Also handle Service Worker notification clicks forwarded to the window
    const handleSwMessage = (event: MessageEvent) => {
      if (event.data?.type === 'BACKGROUND_LAUNCH_CLICKED' && event.data?.url) {
        window.open(event.data.url, '_blank');
      }
    };
    navigator.serviceWorker?.addEventListener('message', handleSwMessage);

    return () => {
      document.removeEventListener('visibilitychange', handleResumeOrFocus);
      window.removeEventListener('focus', handleResumeOrFocus);
      navigator.serviceWorker?.removeEventListener('message', handleSwMessage);
    };
  }, []);

  // Activate AI (toggle on)
  const handleActivateAI = () => {
    if (!liveSessionRef.current) return;
    setErrorMessage(null);
    BackgroundKeepAlive.getInstance().requestNotificationPermission();
    liveSessionRef.current.start(voice);
  };

  // Toggle Picture-in-Picture Floating Orb for mobile Home Screen
  const handleTogglePiP = async () => {
    const active = await BackgroundKeepAlive.getInstance().togglePictureInPicture(state === 'listening');
    setIsPiPActive(active);
  };

  // Retry or re-request mic access dynamically
  const handleRetryMic = async () => {
    if (!liveSessionRef.current) return;
    setErrorMessage(null);
    if (liveSessionRef.current.getState() === 'disconnected') {
      liveSessionRef.current.start(voice);
    } else {
      const ok = await liveSessionRef.current.attachMicStream();
      if (ok) {
        setIsMicBlocked(false);
        setIsMicPermissionModalOpen(false);
      }
    }
  };

  // Send text query to Friday (works in voice mode and even when mic is blocked)
  const handleSendText = (text: string) => {
    if (!liveSessionRef.current) return;
    if (liveSessionRef.current.getState() === 'disconnected') {
      liveSessionRef.current.start(voice);
      setTimeout(() => {
        liveSessionRef.current?.sendText(text);
      }, 1200);
    } else {
      liveSessionRef.current.sendText(text);
    }
  };

  // Power On after shutdown
  const handlePowerOn = useCallback(() => {
    setPowerStatus('booting');
    setTimeout(() => {
      setPowerStatus('online');
      if (liveSessionRef.current) {
        liveSessionRef.current.start(voice);
      }
    }, 2800);
  }, [voice]);

  // Deactivate AI (toggle off / close X button)
  const handleDeactivateAI = () => {
    if (!liveSessionRef.current) return;
    liveSessionRef.current.stop();
  };

  // Tap sphere to toggle mic (or interrupt speech if speaking)
  const handleSphereClick = () => {
    if (!liveSessionRef.current) return;

    if (state === 'speaking') {
      // If speaking, tap sphere interrupts Friday immediately
      liveSessionRef.current.interrupt();
    } else {
      // Toggle mute/unmute
      const nextMuted = !isMuted;
      setIsMuted(nextMuted);
      liveSessionRef.current.setMuted(nextMuted);
    }
  };

  // Dynamic status text for the top status pill
  const getStatusText = (): string => {
    if (state === 'connecting') return 'CONNECTING...';
    if (state === 'reconnecting') return 'RECONNECTING IN CHROME ⚡';
    if (state === 'speaking') return 'FRIDAY IS SPEAKING 🎙️';
    if (state === 'listening') {
      return isMuted ? 'MIC MUTED' : 'LISTENING...';
    }
    return 'SYSTEM READY';
  };

  const isAIActive = state !== 'disconnected';

  // Ambient background glow per theme
  const themeGlows: Record<ThemeMood, string> = {
    cyan: 'radial-gradient(circle, rgba(0, 242, 254, 0.18) 0%, rgba(120, 0, 255, 0.08) 50%, rgba(0,0,0,0) 70%)',
    magenta: 'radial-gradient(circle, rgba(247, 37, 133, 0.18) 0%, rgba(114, 9, 183, 0.08) 50%, rgba(0,0,0,0) 70%)',
    emerald: 'radial-gradient(circle, rgba(16, 185, 129, 0.18) 0%, rgba(5, 150, 105, 0.08) 50%, rgba(0,0,0,0) 70%)',
    amber: 'radial-gradient(circle, rgba(245, 158, 11, 0.18) 0%, rgba(217, 119, 6, 0.08) 50%, rgba(0,0,0,0) 70%)',
    violet: 'radial-gradient(circle, rgba(168, 85, 247, 0.18) 0%, rgba(124, 58, 237, 0.08) 50%, rgba(0,0,0,0) 70%)',
  };

  return (
    <main
      id="friday-root"
      className="relative w-screen h-screen min-h-[100dvh] flex flex-col justify-between bg-[#020108] text-white overflow-hidden select-none"
    >
      {/* Dynamic Background Glow from requested UI design */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] h-[340px] rounded-full pointer-events-none animate-pulse-glow transition-all duration-1000 z-0"
        style={{
          background: themeGlows[theme] || themeGlows.cyan,
        }}
      />

      {/* Top Header HUD (Preserves all top features: voice selector, theme mood, tool drawer & info) */}
      <div className="relative z-30">
        <HeaderHUD
          theme={theme}
          onThemeChange={setTheme}
          voice={voice}
          onVoiceChange={(v) => {
            setVoice(v);
            if (isAIActive) {
              liveSessionRef.current?.stop();
            }
          }}
          actionCount={actions.length}
          onOpenActions={() => setIsActionDrawerOpen(true)}
          isConnected={isAIActive}
          state={state}
          onTogglePiP={handleTogglePiP}
          isPiPActive={isPiPActive}
        />
      </div>

      {/* Center Stage: Toggle Switch UI when disconnected, 3D Dot Sphere when activated */}
      <div className="relative flex-1 w-full h-full flex flex-col items-center justify-center z-10">
        {/* Initial UI: "Activate AI" Glass Toggle Box & Friday AI Display Title */}
        {!isAIActive && (
          <InitialActivationUI
            isActive={isAIActive}
            onActivate={handleActivateAI}
            theme={theme}
          />
        )}

        {/* Activated State: 3D Interactive Dot Sphere with STATUS pill and Hint text */}
        {isAIActive && (
          <InteractiveSphere
            state={state}
            theme={theme}
            isMuted={isMuted}
            isMicBlocked={isMicBlocked}
            onRequestMic={() => setIsMicPermissionModalOpen(true)}
            audioStreamer={audioStreamerRef.current}
            liveSession={liveSessionRef.current}
            onToggleMic={handleSphereClick}
            statusText={getStatusText()}
            onDeactivate={handleDeactivateAI}
            onSendText={handleSendText}
            onTogglePiP={handleTogglePiP}
            isPiPActive={isPiPActive}
          />
        )}
      </div>

      {/* Floating Action Toast Notification (Interactive & Non-blocking in Chrome) */}
      {activeToast && (
        <div className="fixed bottom-16 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-sm animate-in slide-in-from-bottom-3 duration-300">
          <div className="p-3 rounded-xl bg-neutral-900/95 border border-cyan-500/40 shadow-[0_0_30px_rgba(0,242,254,0.2)] backdrop-blur-xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
                <Check className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-semibold text-white truncate font-sans">
                  {activeToast.title}
                </h4>
                <p className="text-[11px] font-mono text-cyan-300/80 truncate">
                  {activeToast.desc}
                </p>
              </div>
            </div>

            {activeToast.url ? (
              <button
                type="button"
                onClick={() => handleOpenUrl(activeToast.url!, activeToast.androidIntent || activeToast.nativeUri, activeToast.title)}
                className="text-[11px] font-mono font-bold text-cyan-300 hover:text-white bg-cyan-500/20 hover:bg-cyan-500/30 px-2.5 py-1.5 rounded-lg border border-cyan-500/40 shrink-0 flex items-center gap-1 transition-all"
              >
                <span>View</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            ) : (
              <span className="text-[10px] font-mono font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/30 shrink-0">
                Opened
              </span>
            )}
          </div>
        </div>
      )}

      {/* Floating Error Notification */}
      {errorMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-md animate-in slide-in-from-top-4 duration-300">
          <div className="p-3.5 rounded-xl bg-rose-950/90 border border-rose-600/50 shadow-2xl backdrop-blur-xl flex items-center justify-between gap-3 text-rose-200">
            <div className="flex items-center gap-2.5 min-w-0">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
              <p className="text-xs font-sans leading-tight">{errorMessage}</p>
            </div>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="p-1 text-rose-400 hover:text-rose-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Browser Actions & Voice Cues Drawer */}
      <ActionDrawer
        isOpen={isActionDrawerOpen}
        onClose={() => setIsActionDrawerOpen(false)}
        actions={actions}
        onOpenUrl={handleOpenUrl}
        onSelectStarter={handleSendText}
        theme={theme}
      />

      {/* Microphone Permission Guide Modal */}
      <MicrophonePermissionModal
        isOpen={isMicPermissionModalOpen}
        onClose={() => setIsMicPermissionModalOpen(false)}
        onRetry={handleRetryMic}
        onContinueWithText={() => setIsMicPermissionModalOpen(false)}
      />

      {/* Top-Right AI Code Generation Progress Widget (Compact circular loader & modal) */}
      <CodeProgressWidget
        status={codeStatus}
        theme={theme}
        onClearStatus={() => setCodeStatus(null)}
        onOpenInNewTab={(html, title, codeId) => openGeneratedCodeInNewTab(html, title, codeId)}
      />

      {/* In-App Webview HUD Overlay: Allows browsing with 100% instant return to Friday screen */}
      {inAppBrowser && (
        <InAppBrowserModal
          url={inAppBrowser.url}
          title={inAppBrowser.title}
          appName={inAppBrowser.appName}
          onClose={() => setInAppBrowser(null)}
          onOpenExternal={(url) => {
            window.open(url, '_blank');
          }}
          isListening={state !== 'disconnected' && !isMuted}
        />
      )}

      {/* Fullscreen Cyber Shutdown / Standby Layer */}
      <ShutdownOverlay
        status={powerStatus}
        onPowerOn={handlePowerOn}
      />
    </main>
  );
}
