"use client";

// Web Audio API Synthesizer for high-tech sci-fi UI sound effects
// Does not depend on external audio files, works instantly with 0ms buffering.

let audioCtx: AudioContext | null = null;
let soundEnabled = true;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

export function isSoundMuted(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const stored = localStorage.getItem("sdn_sound_enabled");
    if (stored !== null) return stored === "false";
  } catch {
    // ignore localStorage errors
  }
  return !soundEnabled;
}

export function toggleSound(): boolean {
  const currentMuted = isSoundMuted();
  const nextEnabled = currentMuted; // toggle
  soundEnabled = nextEnabled;
  try {
    localStorage.setItem("sdn_sound_enabled", String(nextEnabled));
  } catch {
    // ignore
  }
  return nextEnabled;
}

/**
 * Play a cinematic futuristic warp / mission control launch sound effect
 * Features:
 * - Sub-bass punch (80Hz sine drop)
 * - Ascending hyperdrive frequency sweep (240Hz -> 1050Hz)
 * - Resonant high-pass filter swoosh
 * - Telemetry harmonic chime (1760Hz)
 */
export function playMissionControlLaunchSound(): void {
  if (isSoundMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  // Master Gain to prevent clipping
  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(0.7, now);
  masterGain.connect(ctx.destination);

  // 1. Sub-bass Punch (gives mechanical weight and impact)
  const subOsc = ctx.createOscillator();
  const subGain = ctx.createGain();
  subOsc.type = "sine";
  subOsc.frequency.setValueAtTime(110, now);
  subOsc.frequency.exponentialRampToValueAtTime(38, now + 0.35);
  subGain.gain.setValueAtTime(0.85, now);
  subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

  subOsc.connect(subGain);
  subGain.connect(masterGain);
  subOsc.start(now);
  subOsc.stop(now + 0.4);

  // 2. Ascending Cyber Warp Sweep (hyperdrive energy acceleration)
  const warpOsc = ctx.createOscillator();
  const warpGain = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  warpOsc.type = "sawtooth";
  warpOsc.frequency.setValueAtTime(196, now);
  warpOsc.frequency.exponentialRampToValueAtTime(880, now + 0.32);
  warpOsc.frequency.exponentialRampToValueAtTime(1320, now + 0.48);

  // Resonant lowpass opening up
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(450, now);
  filter.frequency.exponentialRampToValueAtTime(4800, now + 0.35);
  filter.Q.setValueAtTime(4, now);

  warpGain.gain.setValueAtTime(0.001, now);
  warpGain.gain.linearRampToValueAtTime(0.42, now + 0.08);
  warpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.52);

  warpOsc.connect(filter);
  filter.connect(warpGain);
  warpGain.connect(masterGain);
  warpOsc.start(now);
  warpOsc.stop(now + 0.55);

  // 3. High Chime Harmonic (futuristic glass/cyber shimmer)
  const chimeOsc = ctx.createOscillator();
  const chimeGain = ctx.createGain();
  chimeOsc.type = "sine";
  chimeOsc.frequency.setValueAtTime(880, now + 0.1);
  chimeOsc.frequency.exponentialRampToValueAtTime(1760, now + 0.4);

  chimeGain.gain.setValueAtTime(0.001, now);
  chimeGain.gain.setValueAtTime(0.001, now + 0.1);
  chimeGain.gain.linearRampToValueAtTime(0.25, now + 0.18);
  chimeGain.gain.exponentialRampToValueAtTime(0.001, now + 0.58);

  chimeOsc.connect(chimeGain);
  chimeGain.connect(masterGain);
  chimeOsc.start(now + 0.1);
  chimeOsc.stop(now + 0.6);
}

/**
 * Play a light telemetry click / pulse sound when clicking canvas nodes or cards
 */
export function playTelemetryPulseSound(): void {
  if (isSoundMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "sine";
  osc.frequency.setValueAtTime(780, now);
  osc.frequency.exponentialRampToValueAtTime(420, now + 0.08);

  gain.gain.setValueAtTime(0.18, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.09);
}
