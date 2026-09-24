import { AudioStreamer } from './audioStreamer';
import { AssistantState, ToolCallData } from '../types';
import { BackgroundKeepAlive } from './backgroundKeepAlive';

export interface LiveSessionCallbacks {
  onStateChange: (state: AssistantState) => void;
  onToolCall: (toolCall: ToolCallData) => void;
  onError: (error: string) => void;
  onInterrupted?: () => void;
  onMicBlocked?: () => void;
  onMicReady?: () => void;
  onCodeProgress?: (data: {
    status: 'idle' | 'starting' | 'generating' | 'completed' | 'error';
    progress: number;
    title: string;
    prompt?: string;
    statusText?: string;
    code?: string;
    codeId?: string;
    previewUrl?: string;
    error?: string;
  }) => void;
}

export class LiveSession {
  private ws: WebSocket | null = null;
  private inputAudioCtx: AudioContext | null = null;
  private micStream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private micAnalyser: AnalyserNode | null = null;
  private audioStreamer: AudioStreamer;
  private callbacks: LiveSessionCallbacks;
  private state: AssistantState = 'disconnected';
  private isMuted = false;
  private isConnecting = false;
  private intentionallyStopped = false;
  private micBlocked = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 4;
  private reconnectTimer: any = null;
  private pingTimer: any = null;
  private audioWatchdogTimer: any = null;
  private currentVoice = 'Aoede';
  private wakeLock: any = null;
  private visibilityListener: (() => void) | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private silentKeepAliveNode: OscillatorNode | null = null;

  constructor(audioStreamer: AudioStreamer, callbacks: LiveSessionCallbacks) {
    this.audioStreamer = audioStreamer;
    this.callbacks = callbacks;

    // Listen to playback transitions from AudioStreamer
    this.audioStreamer.onPlaybackStateChange = (isPlaying) => {
      if (this.state !== 'disconnected' && this.state !== 'connecting' && this.state !== 'reconnecting') {
        const nextState = isPlaying ? 'speaking' : 'listening';
        this.updateState(nextState);
      }
    };

    // Auto-resume AudioContext & keep mic streaming alive when on Home Screen or switching tabs
    this.visibilityListener = () => {
      if (document.visibilityState === 'hidden') {
        console.log('[Friday LiveSession] Boss minimized Chrome or went to Home Screen. Ensuring background mic & live connection stay active.');
        this.resumeAudioContexts();
      } else if (document.visibilityState === 'visible') {
        console.log('[Friday LiveSession] Chrome tab focused.');
        this.resumeAudioContexts();
        // Check if WebSocket died while in background
        if (!this.intentionallyStopped && this.state !== 'disconnected') {
          if (!this.ws || this.ws.readyState === WebSocket.CLOSED) {
            this.attemptAutoReconnect();
          }
        }
      }
    };
    document.addEventListener('visibilitychange', this.visibilityListener);

    // Periodic watchdog: verifies that Android OS has not suspended the microphone AudioContext
    this.audioWatchdogTimer = setInterval(() => {
      if (this.state !== 'disconnected' && !this.intentionallyStopped) {
        if (this.inputAudioCtx && this.inputAudioCtx.state === 'suspended') {
          this.inputAudioCtx.resume().catch(() => {});
        }
        if (this.micStream) {
          const track = this.micStream.getAudioTracks()[0];
          if (track && (track.readyState === 'ended' || (track.muted && !this.isMuted))) {
            console.log('[Friday LiveSession] Mic track interrupted, re-binding stream...');
            navigator.mediaDevices
              ?.getUserMedia({
                audio: {
                  channelCount: 1,
                  sampleRate: 16000,
                  echoCancellation: true,
                  noiseSuppression: true,
                  autoGainControl: true,
                },
              })
              .then((newStream) => {
                this.setupMicPipeline(newStream);
              })
              .catch(() => {});
          }
        }
      }
    }, 1500);
  }

  private updateState(newState: AssistantState) {
    if (this.state !== newState) {
      this.state = newState;
      this.callbacks.onStateChange(newState);
    }
  }

  public getState(): AssistantState {
    return this.state;
  }

  public isMicMuted(): boolean {
    return this.isMuted;
  }

  public isMicrophoneBlocked(): boolean {
    return this.micBlocked;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.micStream) {
      this.micStream.getAudioTracks().forEach((track) => {
        track.enabled = !muted;
      });
    }
  }

  private sendAudioChunk(inputData: Float32Array) {
    if (this.isMuted || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    const pcm16 = new Int16Array(inputData.length);
    for (let i = 0; i < inputData.length; i++) {
      const s = Math.max(-1, Math.min(1, inputData[i]));
      pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }

    const bytes = new Uint8Array(pcm16.buffer);
    let binary = '';
    const chunkSize = 1024;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode.apply(
        null,
        bytes.subarray(i, i + chunkSize) as any
      );
    }
    const base64 = btoa(binary);

    this.ws.send(
      JSON.stringify({
        type: 'audio',
        audio: base64,
      })
    );
  }

  private async setupMicPipeline(stream: MediaStream) {
    // Clean existing processor / worklet if any
    if (this.workletNode) {
      try {
        this.workletNode.disconnect();
      } catch {}
      this.workletNode = null;
    }
    if (this.processor) {
      try {
        this.processor.disconnect();
      } catch {}
      this.processor = null;
    }
    if (this.silentKeepAliveNode) {
      try {
        this.silentKeepAliveNode.stop();
        this.silentKeepAliveNode.disconnect();
      } catch {}
      this.silentKeepAliveNode = null;
    }

    if (this.micStream && this.micStream !== stream) {
      this.micStream.getTracks().forEach((t) => t.stop());
    }

    this.micStream = stream;

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!this.inputAudioCtx || this.inputAudioCtx.state === 'closed') {
      this.inputAudioCtx = new AudioContextClass({ sampleRate: 16000 });
    }

    // Ensure AudioContext is running
    if (this.inputAudioCtx.state === 'suspended') {
      try {
        await this.inputAudioCtx.resume();
      } catch {}
    }

    // Connect silent oscillator to destination to keep Android audio thread ticking when tab is backgrounded
    try {
      const osc = this.inputAudioCtx.createOscillator();
      const gain = this.inputAudioCtx.createGain();
      gain.gain.value = 0.00001; // Silent to human ear, active to Android OS hardware mixer
      osc.connect(gain);
      gain.connect(this.inputAudioCtx.destination);
      osc.start();
      this.silentKeepAliveNode = osc;
    } catch (e) {
      console.warn('[Friday LiveSession] Silent keepalive node setup skipped:', e);
    }

    const source = this.inputAudioCtx.createMediaStreamSource(stream);
    this.micAnalyser = this.inputAudioCtx.createAnalyser();
    this.micAnalyser.fftSize = 256;
    this.micAnalyser.smoothingTimeConstant = 0.5;
    source.connect(this.micAnalyser);

    // Strategy A: AudioWorklet (Runs in dedicated audio rendering thread, 100% immune to background tab throttle)
    let workletSuccess = false;
    if (this.inputAudioCtx.audioWorklet) {
      try {
        const workletCode = `
          class FridayPcmWorklet extends AudioWorkletProcessor {
            constructor() {
              super();
              // Buffer 1024 samples (64ms at 16000Hz) to prevent background tab queue congestion and packet delays
              this.buffer = new Float32Array(1024);
              this.bufferIndex = 0;
            }
            process(inputs) {
              const input = inputs[0];
              if (input && input[0]) {
                const channel = input[0];
                for (let i = 0; i < channel.length; i++) {
                  this.buffer[this.bufferIndex++] = channel[i];
                  if (this.bufferIndex >= 1024) {
                    this.port.postMessage(this.buffer.slice(0, 1024));
                    this.bufferIndex = 0;
                  }
                }
              }
              return true;
            }
          }
          registerProcessor('friday-pcm-worklet', FridayPcmWorklet);
        `;
        const blob = new Blob([workletCode], { type: 'application/javascript' });
        const url = URL.createObjectURL(blob);
        await this.inputAudioCtx.audioWorklet.addModule(url);
        URL.revokeObjectURL(url);

        this.workletNode = new AudioWorkletNode(this.inputAudioCtx, 'friday-pcm-worklet');
        this.workletNode.port.onmessage = (event) => {
          this.sendAudioChunk(event.data);
        };

        source.connect(this.workletNode);
        this.workletNode.connect(this.inputAudioCtx.destination);
        workletSuccess = true;
        console.log('[Friday LiveSession] AudioWorklet background pipeline active.');
      } catch (errWorklet) {
        console.warn('[Friday LiveSession] AudioWorklet init error, using ScriptProcessor fallback:', errWorklet);
      }
    }

    // Strategy B: ScriptProcessorNode fallback
    if (!workletSuccess) {
      this.processor = this.inputAudioCtx.createScriptProcessor(4096, 1, 1);
      this.processor.onaudioprocess = (e) => {
        this.sendAudioChunk(e.inputBuffer.getChannelData(0));
      };
      source.connect(this.processor);
      this.processor.connect(this.inputAudioCtx.destination);
    }

    this.micBlocked = false;
  }

  public async attachMicStream(): Promise<boolean> {
    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            sampleRate: 16000,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }

      await this.setupMicPipeline(stream);
      this.micBlocked = false;
      this.callbacks.onMicReady?.();
      return true;
    } catch (err) {
      console.warn('[Friday] attachMicStream failed:', err);
      this.micBlocked = true;
      this.callbacks.onMicBlocked?.();
      return false;
    }
  }

  public getAudioStreamer(): AudioStreamer {
    return this.audioStreamer;
  }

  public playReturnSound(): void {
    try {
      this.audioStreamer.playReturnChime();
    } catch (e) {
      console.warn('[Friday LiveSession] playReturnSound error:', e);
    }
  }

  public sendText(text: string): boolean {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'text', text }));
      return true;
    }
    return false;
  }

  private async resumeAudioContexts() {
    try {
      if (this.inputAudioCtx && this.inputAudioCtx.state === 'suspended') {
        await this.inputAudioCtx.resume();
      }
      this.audioStreamer.init();
    } catch (e) {
      console.warn('[Friday] Error resuming AudioContexts:', e);
    }
  }

  private async requestWakeLock() {
    try {
      if ('wakeLock' in navigator && (navigator as any).wakeLock?.request) {
        this.wakeLock = await (navigator as any).wakeLock.request('screen');
        this.wakeLock.addEventListener('release', () => {
          this.wakeLock = null;
        });
      }
    } catch {
      // Non-critical, ignore
    }
  }

  private releaseWakeLock() {
    if (this.wakeLock) {
      try {
        this.wakeLock.release();
      } catch {}
      this.wakeLock = null;
    }
  }

  public async start(voice: string = 'Aoede') {
    if (this.state !== 'disconnected' || this.isConnecting) {
      return;
    }

    this.currentVoice = voice;
    this.intentionallyStopped = false;
    this.reconnectAttempts = 0;
    this.isConnecting = true;
    this.updateState('connecting');

    try {
      // 1. Initialize audio playback streamer (speaker output) & Android background keepalive
      this.audioStreamer.init();
      await this.requestWakeLock();
      BackgroundKeepAlive.getInstance().start();

      // 2. Request mic permission and stream with fallback constraints
      if (navigator?.mediaDevices?.getUserMedia) {
        try {
          let stream: MediaStream;
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              audio: {
                channelCount: 1,
                sampleRate: 16000,
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
              },
            });
          } catch (firstErr: any) {
            if (firstErr.name === 'NotAllowedError' || firstErr.name === 'PermissionDeniedError') {
              throw firstErr;
            }
            console.warn('Advanced audio constraints failed, retrying simple audio...', firstErr);
            stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          }
          await this.setupMicPipeline(stream);
        } catch (micErr: any) {
          console.warn('[Friday] Microphone permission denied/failed:', micErr);
          this.micBlocked = true;
          this.callbacks.onMicBlocked?.();
          this.callbacks.onError(
            micErr.name === 'NotAllowedError' || micErr.name === 'PermissionDeniedError'
              ? 'Microphone permission was denied. Please allow microphone access in Chrome.'
              : 'Could not access microphone.'
          );
        }
      } else {
        this.micBlocked = true;
        this.callbacks.onMicBlocked?.();
        this.callbacks.onError('Microphone API is not supported in this browser.');
      }

      // 3. Connect WebSocket to server (Friday voice output and text tools remain ready)
      this.connectWebSocket();
    } catch (err: any) {
      console.error('Failed to start Live session:', err);
      this.isConnecting = false;
      this.callbacks.onError(err?.message || 'Could not start Live session.');
      this.cleanup();
    }
  }

  private connectWebSocket() {
    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
      this.ws = null;
    }

    clearInterval(this.pingTimer);

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/live?voice=${encodeURIComponent(this.currentVoice)}`;

    console.log('[Friday] Connecting WebSocket to:', wsUrl);
    const ws = new WebSocket(wsUrl);
    this.ws = ws;

    ws.onopen = () => {
      console.log('[Friday] WebSocket connected to Live Server');
      // Setup periodic client heartbeat to keep proxy alive
      this.pingTimer = setInterval(() => {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({ type: 'ping' }));
        }
      }, 20000);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);

        if (msg.type === 'ping') {
          // Respond to server heartbeat
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: 'pong' }));
          }
          return;
        }

        if (msg.type === 'pong') {
          return;
        }

        if (msg.type === 'session_ready') {
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.updateState('listening');
        } else if (msg.type === 'audio' && msg.audio) {
          this.audioStreamer.playAudioChunk(msg.audio);
        } else if (msg.type === 'interrupted') {
          this.audioStreamer.interrupt();
          this.updateState('listening');
          this.callbacks.onInterrupted?.();
        } else if (msg.type === 'turn_complete') {
          // Turn completed by model
        } else if (msg.type === 'tool_call' && msg.toolCall) {
          this.callbacks.onToolCall(msg.toolCall);
        } else if (msg.type === 'code_generation_progress') {
          this.callbacks.onCodeProgress?.(msg);
        } else if (msg.type === 'error') {
          console.warn('[Friday] Server sent error message:', msg.error);
          this.callbacks.onError(msg.error || 'Server error occurred');
        }
      } catch (err) {
        console.error('Error handling WebSocket message:', err);
      }
    };

    ws.onerror = (err) => {
      console.warn('[Friday] WebSocket network error:', err);
    };

    ws.onclose = (ev) => {
      console.log('[Friday] WebSocket closed:', ev.code, ev.reason);
      clearInterval(this.pingTimer);

      if (this.intentionallyStopped) {
        this.cleanup();
      } else {
        // Automatic reconnection on transient drops
        this.attemptAutoReconnect();
      }
    };
  }

  private attemptAutoReconnect() {
    if (this.intentionallyStopped) return;

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delayMs = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 4000);
      console.log(`[Friday] Auto-reconnecting in ${delayMs}ms (Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      
      this.updateState('reconnecting');
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = setTimeout(() => {
        if (!this.intentionallyStopped) {
          this.resumeAudioContexts();
          this.connectWebSocket();
        }
      }, delayMs);
    } else {
      console.warn('[Friday] Max reconnect attempts reached.');
      this.callbacks.onError('Network connection interrupted. Tap the core to resume Friday.');
      this.cleanup();
    }
  }

  public interrupt() {
    this.audioStreamer.interrupt();
    this.updateState('listening');
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'interrupt' }));
    }
  }

  public getMicVolume(): number {
    if (!this.micAnalyser || this.isMuted) return 0;
    const data = new Uint8Array(this.micAnalyser.frequencyBinCount);
    this.micAnalyser.getByteFrequencyData(data as any);
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum += data[i];
    }
    return sum / (data.length * 255);
  }

  public stop() {
    this.intentionallyStopped = true;
    clearTimeout(this.reconnectTimer);
    clearInterval(this.pingTimer);
    this.cleanup();
  }

  private cleanup() {
    this.isConnecting = false;
    this.releaseWakeLock();
    BackgroundKeepAlive.getInstance().stop();

    if (this.workletNode) {
      try {
        this.workletNode.disconnect();
      } catch {}
      this.workletNode = null;
    }

    if (this.processor) {
      try {
        this.processor.disconnect();
      } catch {}
      this.processor = null;
    }

    if (this.silentKeepAliveNode) {
      try {
        this.silentKeepAliveNode.stop();
        this.silentKeepAliveNode.disconnect();
      } catch {}
      this.silentKeepAliveNode = null;
    }

    if (this.micStream) {
      this.micStream.getTracks().forEach((track) => track.stop());
      this.micStream = null;
    }

    if (this.inputAudioCtx && this.inputAudioCtx.state !== 'closed') {
      try {
        this.inputAudioCtx.close();
      } catch {}
      this.inputAudioCtx = null;
    }
    this.micAnalyser = null;

    if (this.ws) {
      try {
        if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
          this.ws.close();
        }
      } catch {}
      this.ws = null;
    }

    this.audioStreamer.interrupt();
    this.updateState('disconnected');
  }

  public requestCodeGeneration(prompt: string, title?: string, category?: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: 'request_code_generation',
          prompt,
          title: title || 'Friday Web Project',
          category: category || 'website',
        })
      );
    }
  }

  public destroy() {
    this.stop();
    if (this.audioWatchdogTimer) {
      clearInterval(this.audioWatchdogTimer);
      this.audioWatchdogTimer = null;
    }
    if (this.visibilityListener) {
      document.removeEventListener('visibilitychange', this.visibilityListener);
      this.visibilityListener = null;
    }
  }
}
