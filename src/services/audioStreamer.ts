/**
 * AudioStreamer
 * Manages 24kHz Web Audio API playback for Gemini Live API audio output.
 * Handles gapless audio chunk scheduling, instant interruptions, and
 * audio analyser integration for visual feedback.
 */

import { setSharedAudioContext, playFridayReturnChime } from '../utils/fridaySounds';

export class AudioStreamer {
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private nextStartTime = 0;
  private activeSources: Set<AudioBufferSourceNode> = new Set();
  private isPlaying = false;
  private endTimeout: any = null;
  public onPlaybackStateChange?: (isPlaying: boolean) => void;

  constructor() {
    // AudioContext will be initialized on user gesture
  }

  public init() {
    if (!this.audioCtx || this.audioCtx.state === 'closed') {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioContextClass({ sampleRate: 24000 });
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.8;
      this.analyser.connect(this.audioCtx.destination);
      setSharedAudioContext(this.audioCtx);
    }

    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch((err) => {
        console.warn('Could not resume audioCtx:', err);
      });
    }
  }

  public getAudioContext(): AudioContext | null {
    return this.audioCtx;
  }

  public playReturnChime(): void {
    this.init();
    playFridayReturnChime(this.audioCtx);
  }

  /**
   * Decodes base64 PCM 16-bit (little-endian, 24kHz mono) and schedules playback.
   */
  public playAudioChunk(base64Pcm: string) {
    this.init();
    if (!this.audioCtx || !this.analyser) return;

    try {
      const binaryString = atob(base64Pcm);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // 16-bit PCM little endian
      const int16Array = new Int16Array(bytes.buffer);
      const float32Array = new Float32Array(int16Array.length);

      for (let i = 0; i < int16Array.length; i++) {
        // Convert to [-1.0, 1.0] range
        float32Array[i] = int16Array[i] / 32768.0;
      }

      if (float32Array.length === 0) return;

      const audioBuffer = this.audioCtx.createBuffer(1, float32Array.length, 24000);
      audioBuffer.copyToChannel(float32Array, 0);

      const source = this.audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.analyser);

      const currentTime = this.audioCtx.currentTime;
      const startTime = Math.max(currentTime, this.nextStartTime);
      source.start(startTime);
      this.nextStartTime = startTime + audioBuffer.duration;

      this.activeSources.add(source);
      this.setPlayingState(true);

      source.onended = () => {
        this.activeSources.delete(source);
        if (this.activeSources.size === 0) {
          // Check if queue has caught up
          if (this.audioCtx && this.audioCtx.currentTime >= this.nextStartTime - 0.05) {
            this.setPlayingState(false);
          }
        }
      };

      // Reset watchdog timeout to mark end of turn
      if (this.endTimeout) clearTimeout(this.endTimeout);
      const remainingTime = Math.max(0, (this.nextStartTime - currentTime) * 1000);
      this.endTimeout = setTimeout(() => {
        if (this.activeSources.size === 0) {
          this.setPlayingState(false);
        }
      }, remainingTime + 80);

    } catch (err) {
      console.error('Error in AudioStreamer playAudioChunk:', err);
    }
  }

  private setPlayingState(playing: boolean) {
    if (this.isPlaying !== playing) {
      this.isPlaying = playing;
      this.onPlaybackStateChange?.(playing);
    }
  }

  /**
   * Interrupt playback immediately: stops all playing buffers and resets queue.
   */
  public interrupt() {
    if (this.endTimeout) {
      clearTimeout(this.endTimeout);
      this.endTimeout = null;
    }

    for (const source of this.activeSources) {
      try {
        source.stop();
        source.disconnect();
      } catch {
        // Source may already have ended
      }
    }
    this.activeSources.clear();

    if (this.audioCtx) {
      this.nextStartTime = this.audioCtx.currentTime;
    } else {
      this.nextStartTime = 0;
    }

    this.setPlayingState(false);
  }

  public getVisualizerData(outputArray: Uint8Array): void {
    if (this.analyser && this.isPlaying) {
      this.analyser.getByteFrequencyData(outputArray as any);
    } else {
      outputArray.fill(0);
    }
  }

  public getVolume(): number {
    if (!this.analyser || !this.isPlaying) return 0;
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(data as any);
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum += data[i];
    }
    return sum / (data.length * 255);
  }

  public close() {
    this.interrupt();
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      this.audioCtx.close().catch(() => {});
      this.audioCtx = null;
    }
    this.analyser = null;
  }
}
