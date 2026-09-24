/**
 * Friday High-Tech Sound FX Synthesizer
 * Uses Web Audio API to synthesize Iron-Man/Friday style power sounds,
 * return chimes, and system status cues.
 */

let sharedAudioContext: AudioContext | null = null;

export function getOrCreateAudioContext(): AudioContext | null {
  try {
    if (!sharedAudioContext || sharedAudioContext.state === 'closed') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        sharedAudioContext = new AudioCtx();
      }
    }
    if (sharedAudioContext && sharedAudioContext.state === 'suspended') {
      sharedAudioContext.resume().catch(() => {});
    }
    return sharedAudioContext;
  } catch (e) {
    console.warn('[Friday Sounds] AudioContext error:', e);
    return null;
  }
}

/**
 * Registers an already active/unlocked AudioContext (like AudioStreamer's context)
 */
export function setSharedAudioContext(ctx: AudioContext) {
  sharedAudioContext = ctx;
}

/**
 * Plays the iconic, unmistakable Friday "Returned to Screen" confirmation sound.
 * Features:
 * 1. Rapid dual sci-fi energy blip (880Hz -> 1320Hz)
 * 2. Ascending power-up harmonic chord (C5, E5, G5, C6) with rich harmonics
 * 3. Soft deep bass resonance tone
 */
export function playFridayReturnChime(customCtx?: AudioContext | null) {
  try {
    const ctx = customCtx || getOrCreateAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const t = ctx.currentTime;

    // Master bus gain for return chime
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.4, t);
    masterGain.connect(ctx.destination);

    // 1. Initial sci-fi tech chirp (Iron Man HUD initialization)
    const chirp = ctx.createOscillator();
    const chirpGain = ctx.createGain();
    chirp.type = 'sine';
    chirp.frequency.setValueAtTime(880, t);
    chirp.frequency.exponentialRampToValueAtTime(1760, t + 0.08);
    chirpGain.gain.setValueAtTime(0.35, t);
    chirpGain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    chirp.connect(chirpGain);
    chirpGain.connect(masterGain);
    chirp.start(t);
    chirp.stop(t + 0.11);

    // 2. Powerful Ascending Harmonic Chords: C5 (523Hz), E5 (659Hz), G5 (784Hz), C6 (1046Hz)
    const notes = [
      { freq: 523.25, time: 0.06, dur: 0.4 },
      { freq: 659.25, time: 0.13, dur: 0.45 },
      { freq: 783.99, time: 0.20, dur: 0.5 },
      { freq: 1046.5, time: 0.27, dur: 0.65 },
    ];

    notes.forEach(({ freq, time, dur }) => {
      const osc = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      // Main bell/sine tone
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + time);

      // Shimmering octave harmonic
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(freq * 2, t + time);

      gain.gain.setValueAtTime(0.28, t + time);
      gain.gain.exponentialRampToValueAtTime(0.0005, t + time + dur);

      osc.connect(gain);
      osc2.connect(gain);
      gain.connect(masterGain);

      osc.start(t + time);
      osc.stop(t + time + dur + 0.05);
      osc2.start(t + time);
      osc2.stop(t + time + dur + 0.05);
    });

    // 3. Warm Sub-Bass Pulse for visceral tactile feedback
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(130.81, t + 0.06); // C3
    subOsc.frequency.exponentialRampToValueAtTime(65.41, t + 0.35); // C2
    subGain.gain.setValueAtTime(0.3, t + 0.06);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    subOsc.connect(subGain);
    subGain.connect(masterGain);
    subOsc.start(t + 0.06);
    subOsc.stop(t + 0.45);

    // Also trigger mobile device haptic vibration pattern
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([80, 50, 120]);
      } catch {}
    }
  } catch (err) {
    console.warn('[Friday Sounds] Error playing return chime:', err);
  }
}

/**
 * Plays a triumphant celebratory sci-fi success chord precisely when code generation finishes
 */
export function playCodeCompleteChime(customCtx?: AudioContext | null) {
  try {
    const ctx = customCtx || getOrCreateAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const t = ctx.currentTime;
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.45, t);
    masterGain.connect(ctx.destination);

    // Brilliant ascending pentatonic chime (D5, F#5, A5, D6)
    const notes = [
      { freq: 587.33, time: 0.0, dur: 0.35 },
      { freq: 739.99, time: 0.09, dur: 0.4 },
      { freq: 880.0, time: 0.18, dur: 0.45 },
      { freq: 1174.66, time: 0.27, dur: 0.65 },
    ];

    notes.forEach(({ freq, time, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t + time);

      gain.gain.setValueAtTime(0.3, t + time);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + time + dur);

      osc.connect(gain);
      gain.connect(masterGain);

      osc.start(t + time);
      osc.stop(t + time + dur + 0.05);
    });

    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([50, 40, 90]);
      } catch {}
    }
  } catch (err) {
    console.warn('[Friday Sounds] Error playing code complete chime:', err);
  }
}
