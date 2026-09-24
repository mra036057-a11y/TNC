/**
 * BackgroundKeepAlive Service
 * Ensures Friday stays 100% active, listening, and capable of executing voice commands
 * (like opening apps and websites) even when the user minimizes Chrome and goes to the
 * mobile Home Screen.
 *
 * Utilizes:
 * 1. HTML5 Background Audio Loop & MediaSession API (Foreground Media Service on Android)
 * 2. Screen WakeLock API
 * 3. Notification Engine for background navigation alerts
 * 4. Picture-in-Picture (PiP) Floating Core for the mobile Home Screen
 */

/**
 * Generates an active 1-second 24Hz PCM WAV.
 * 24Hz is sub-audible to human ears on phone/laptop speakers, but has
 * real non-zero audio energy (> -60dB RMS) that activates Chrome's
 * AudioStreamMonitor, granting the Friday tab the "Audio Tab Exemption" (speaker icon 🔊).
 * This completely prevents Chrome from freezing/throttling the tab or killing the mic/WebSocket
 * when Boss is browsing other websites!
 */
function generateKeepAliveWav(): string {
  const sampleRate = 8000;
  const numSamples = sampleRate; // 1 second
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + numSamples * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, 1, true); // Mono channel
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true); // 16-bit
  writeString(36, 'data');
  view.setUint32(40, numSamples * 2, true);

  for (let i = 0; i < numSamples; i++) {
    const sample = Math.sin((2 * Math.PI * 24 * i) / sampleRate) * 0.05;
    view.setInt16(44 + i * 2, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
  }

  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return 'data:audio/wav;base64,' + btoa(binary);
}

export class BackgroundKeepAlive {
  private static instance: BackgroundKeepAlive | null = null;
  private audioEl: HTMLAudioElement | null = null;
  private wakeLock: any = null;
  private isRunning = false;
  private pipVideo: HTMLVideoElement | null = null;
  private pipCanvas: HTMLCanvasElement | null = null;
  private pipAnimId: number | null = null;

  public static getInstance(): BackgroundKeepAlive {
    if (!BackgroundKeepAlive.instance) {
      BackgroundKeepAlive.instance = new BackgroundKeepAlive();
    }
    return BackgroundKeepAlive.instance;
  }

  private constructor() {
    // Setup document visibility listener to ensure background audio never drops
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        console.log('[Friday Background] Page minimized / on Home Screen. Keeping live audio active.');
        this.ensureAudioPlaying();
      } else {
        console.log('[Friday Background] Page in foreground.');
        this.ensureAudioPlaying();
      }
    });
  }

  /**
   * Starts background keepalive engine using an HTML5 looping silent audio track & MediaSession.
   * On Android, this grants Chrome "Foreground Media Service" status so Android will never
   * suspend the tab, JavaScript execution, WebSockets, or microphone input while on the Home Screen.
   */
  public async start(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    try {
      this.initSilentAudio();
      this.initMediaSession();
      await this.acquireWakeLock();
      this.requestNotificationPermission();
    } catch (err) {
      console.warn('[Friday Background] Failed to initialize keepalive:', err);
    }
  }

  /**
   * Initializes a sub-audible audio loop with HTML5 audio element.
   * Keeps Chrome audio stream actively registered with Android OS and browser media engine.
   */
  private initSilentAudio() {
    if (this.audioEl) return;

    try {
      const audio = new Audio();
      audio.src = generateKeepAliveWav();
      audio.loop = true;
      audio.volume = 0.05;
      audio.setAttribute('playsinline', 'true');
      audio.setAttribute('autoplay', 'true');

      this.audioEl = audio;
      this.ensureAudioPlaying();
    } catch (e) {
      console.warn('[Friday Background] initSilentAudio error:', e);
    }
  }

  private ensureAudioPlaying() {
    if (!this.audioEl || !this.isRunning) return;
    this.audioEl.play().catch((err) => {
      console.warn('[Friday Background] audio play rejected:', err);
    });
  }

  /**
   * Registers Android MediaSession metadata.
   * This displays a sleek media notification in Android's notification shade:
   * "Friday AI Assistant - Active on Home Screen (Boss Mode)"
   */
  private initMediaSession() {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;

    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: 'Friday AI Assistant',
        artist: 'Active in Background (Boss Mode)',
        album: 'AI Voice Command Center',
        artwork: [
          { src: '/favicon.ico', sizes: '96x96', type: 'image/png' },
          { src: '/favicon.ico', sizes: '192x192', type: 'image/png' },
        ],
      });

      navigator.mediaSession.playbackState = 'playing';

      navigator.mediaSession.setActionHandler('play', () => {
        this.ensureAudioPlaying();
        if (navigator.mediaSession) navigator.mediaSession.playbackState = 'playing';
      });

      navigator.mediaSession.setActionHandler('pause', () => {
        // Keep active even if paused, or quickly resume
        this.ensureAudioPlaying();
      });
    } catch (e) {
      console.warn('[Friday Background] MediaSession error:', e);
    }
  }

  private async acquireWakeLock() {
    try {
      if ('wakeLock' in navigator && (navigator as any).wakeLock?.request) {
        this.wakeLock = await (navigator as any).wakeLock.request('screen');
        this.wakeLock.addEventListener('release', () => {
          this.wakeLock = null;
          // Re-acquire if still running
          if (this.isRunning && document.visibilityState === 'visible') {
            this.acquireWakeLock();
          }
        });
      }
    } catch {}
  }

  /**
   * Gently requests browser notification permissions for background app/website launches
   */
  public async requestNotificationPermission(): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window)) return false;
    try {
      if (Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
      }
      return Notification.permission === 'granted';
    } catch {
      return false;
    }
  }

  /**
   * Sends a system notification when an app or website is launched while the user is on the Home Screen.
   * On Android Chrome, window.Notification constructor is disallowed and throws an error;
   * this uses ServiceWorkerRegistration.showNotification() which is fully supported and delivers
   * a high-priority banner notification directly onto the Android Home Screen.
   */
  public async showLaunchNotification(title: string, url: string, isNativeApp = false) {
    if (typeof window === 'undefined') return;

    const notifTitle = `🚀 Friday: ${title}`;
    const notifOptions: any = {
      body: isNativeApp
        ? `Boss, tap here to launch ${title} on your phone!`
        : `Tap to open ${url} in Chrome now!`,
      icon: '/icon.svg',
      badge: '/icon.svg',
      tag: 'friday-launch-' + Date.now(),
      requireInteraction: true,
      silent: false,
      vibrate: [250, 100, 250],
      data: { url: url },
      actions: [
        { action: 'open', title: '👉 OPEN NOW' },
        { action: 'dismiss', title: '✕ Close' },
      ],
    };

    // 1. Android Chrome Primary Method: ServiceWorkerRegistration.showNotification
    if ('serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.ready;
        if (reg && reg.showNotification) {
          await reg.showNotification(notifTitle, notifOptions);
          console.log('[Friday Background] Dispatched high-priority Android notification via ServiceWorker.');
          return;
        }
      } catch (swErr) {
        console.warn('[Friday Background] SW showNotification failed:', swErr);
      }
    }

    // 2. Desktop Browser fallback
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        const notif = new Notification(notifTitle, {
          body: notifOptions.body,
          icon: notifOptions.icon,
          tag: notifOptions.tag,
        });
        notif.onclick = () => {
          window.focus();
          try {
            window.open(url, '_blank');
          } catch {}
          notif.close();
        };
      } catch (e) {
        console.warn('[Friday Background] Desktop Notification dispatch failed:', e);
      }
    }
  }

  /**
   * Dispatches high-priority notification when Friday returns to the AI Screen
   * Allows Boss in Chrome on Android to tap and immediately bring Friday to the front
   */
  public async showReturnNotification() {
    if (typeof window === 'undefined') return;

    const notifTitle = '⚡ Friday AI • Main Screen';
    const notifOptions: any = {
      body: 'Boss, Friday screen par wapas aa gaye! Tap karein Friday AI open karne ke liye.',
      icon: '/icon.svg',
      badge: '/icon.svg',
      tag: 'friday-return-to-screen',
      requireInteraction: true,
      silent: false,
      vibrate: [150, 80, 150],
      data: { action: 'focus-friday' },
      actions: [
        { action: 'open', title: '👉 OPEN FRIDAY' },
      ],
    };

    if ('serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.ready;
        if (reg && reg.showNotification) {
          await reg.showNotification(notifTitle, notifOptions);
          return;
        }
      } catch (swErr) {
        console.warn('[Friday Background] Return SW showNotification failed:', swErr);
      }
    }

    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        const notif = new Notification(notifTitle, {
          body: notifOptions.body,
          icon: notifOptions.icon,
          tag: notifOptions.tag,
        });
        notif.onclick = () => {
          window.focus();
          notif.close();
        };
      } catch (e) {
        console.warn('[Friday Background] Desktop Return Notification failed:', e);
      }
    }
  }

  /**
   * Picture-in-Picture (PiP) Floating Widget for Android Home Screen:
   * Spawns a floating circular widget displaying Friday's glowing reactor core
   * that stays on top of the mobile Home Screen!
   */
  public async togglePictureInPicture(isListening: boolean): Promise<boolean> {
    if (typeof document === 'undefined') return false;

    // If already in PiP, exit
    if (document.pictureInPictureElement) {
      try {
        await document.exitPictureInPicture();
        this.stopPipCanvas();
        return false;
      } catch {}
    }

    if (!('pictureInPictureEnabled' in document) || !(document as any).pictureInPictureEnabled) {
      return false;
    }

    try {
      if (!this.pipCanvas) {
        this.pipCanvas = document.createElement('canvas');
        this.pipCanvas.width = 256;
        this.pipCanvas.height = 256;
      }

      const ctx = this.pipCanvas.getContext('2d');
      if (!ctx) return false;

      // Draw pulsating reactor core animation onto canvas
      let phase = 0;
      const render = () => {
        phase += 0.05;
        ctx.fillStyle = '#05070a';
        ctx.fillRect(0, 0, 256, 256);

        const centerX = 128;
        const centerY = 128;
        const radius = 60 + Math.sin(phase) * 8;

        // Outer glow
        const grad = ctx.createRadialGradient(centerX, centerY, 10, centerX, centerY, radius + 40);
        grad.addColorStop(0, '#00ffcc');
        grad.addColorStop(0.5, '#0088ff');
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius + 40, 0, Math.PI * 2);
        ctx.fill();

        // Core ring
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.stroke();

        // Inner core
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius * 0.4, 0, Math.PI * 2);
        ctx.fill();

        // Text label
        ctx.font = 'bold 16px monospace';
        ctx.fillStyle = '#00ffff';
        ctx.textAlign = 'center';
        ctx.fillText('FRIDAY ACTIVE', centerX, 230);

        this.pipAnimId = requestAnimationFrame(render);
      };

      this.pipAnimId = requestAnimationFrame(render);

      // Stream canvas to video
      const stream = this.pipCanvas.captureStream(30);
      if (!this.pipVideo) {
        this.pipVideo = document.createElement('video');
        this.pipVideo.muted = true;
        this.pipVideo.playsInline = true;
        this.pipVideo.autoplay = true;
        this.pipVideo.style.position = 'fixed';
        this.pipVideo.style.top = '-9999px';
        document.body.appendChild(this.pipVideo);
      }

      this.pipVideo.srcObject = stream;
      await this.pipVideo.play();
      await this.pipVideo.requestPictureInPicture();
      return true;
    } catch (err) {
      console.warn('[Friday PiP] Picture-in-picture failed:', err);
      this.stopPipCanvas();
      return false;
    }
  }

  private stopPipCanvas() {
    if (this.pipAnimId) {
      cancelAnimationFrame(this.pipAnimId);
      this.pipAnimId = null;
    }
  }

  public stop(): void {
    this.isRunning = false;
    if (this.audioEl) {
      try {
        this.audioEl.pause();
        this.audioEl.src = '';
      } catch {}
      this.audioEl = null;
    }

    if (this.wakeLock) {
      try {
        this.wakeLock.release();
      } catch {}
      this.wakeLock = null;
    }

    this.stopPipCanvas();
    if (this.pipVideo && document.body.contains(this.pipVideo)) {
      try {
        document.body.removeChild(this.pipVideo);
      } catch {}
      this.pipVideo = null;
    }
  }
}
