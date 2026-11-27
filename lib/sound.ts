"use client";

/**
 * Synthesized booth sounds (Web Audio, no sample files).
 * Audio must be unlocked inside a click/tap handler; see docs/research/04-technical.md#web-audio.
 */

import { useSyncExternalStore } from "react";

export type SoundName = "coin" | "tick" | "shutter" | "whirr" | "drop" | "curtain" | "charge";

/** Each machine has its own voice. See lib/machines.ts. */
export type SoundProfile = "mechanical" | "classic" | "cute" | "plastic";

const KEY = "snaproom:muted";
let ctx: AudioContext | null = null;
let noise: AudioBuffer | null = null;
let muted = false;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded) return;
  loaded = true;
  try {
    muted = localStorage.getItem(KEY) === "1";
  } catch {
    /* storage blocked: default to sound on */
  }
}

export function isMuted() {
  load();
  return muted;
}

export function setMuted(value: boolean) {
  muted = value;
  try {
    localStorage.setItem(KEY, value ? "1" : "0");
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useMuted() {
  return useSyncExternalStore(subscribe, isMuted, () => false);
}

/** Call synchronously from a click/tap handler. */
export function unlockAudio() {
  try {
    if (!ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") ctx?.resume().catch(() => {});
      });
    }
    ctx.resume().catch(() => {});
    // Playing a silent buffer inside the gesture unlocks audio on iOS.
    const src = ctx.createBufferSource();
    src.buffer = ctx.createBuffer(1, 1, 22050);
    src.connect(ctx.destination);
    src.start(0);
  } catch {
    ctx = null;
  }
}

function noiseBuffer(c: AudioContext) {
  if (!noise) {
    noise = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  return noise;
}

function tone(c: AudioContext, start: number, dur: number, freq: number, gain: number, type: OscillatorType = "sine", freqEnd?: number) {
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (freqEnd) osc.frequency.exponentialRampToValueAtTime(freqEnd, start + dur);
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(gain, start + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(g).connect(c.destination);
  osc.start(start);
  osc.stop(start + dur + 0.02);
}

function hiss(c: AudioContext, start: number, dur: number, type: BiquadFilterType, freq: number, gain: number, q = 1) {
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c);
  const f = c.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(gain, start + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  src.connect(f).connect(g).connect(c.destination);
  src.start(start, Math.random() * 0.5);
  src.stop(start + dur + 0.02);
}

function motor(c: AudioContext, start: number, dur: number, freq = 68, level = 0.07) {
  const osc = c.createOscillator();
  osc.type = "sawtooth";
  osc.frequency.value = freq;
  const lp = c.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 520;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(level, start + 0.12);
  g.gain.setValueAtTime(level, start + dur - 0.2);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  // Wobble the level for a gear-train flutter.
  const lfo = c.createOscillator();
  lfo.frequency.value = 19;
  const depth = c.createGain();
  depth.gain.value = 0.025;
  lfo.connect(depth).connect(g.gain);
  osc.connect(lp).connect(g).connect(c.destination);
  osc.start(start);
  lfo.start(start);
  osc.stop(start + dur + 0.05);
  lfo.stop(start + dur + 0.05);
  hiss(c, start, dur, "bandpass", 900, 0.025, 0.7);
}

/** Ratchet clicks, like winding a disposable camera's thumbwheel. */
function wind(c: AudioContext, start: number) {
  for (let i = 0; i < 7; i++) hiss(c, start + i * 0.045, 0.018, "bandpass", 3200, 0.16, 3);
}

export function play(name: SoundName, opts: { profile?: SoundProfile; duration?: number } = {}) {
  if (!ctx || isMuted()) return;
  if (ctx.state !== "running") ctx.resume().catch(() => {});
  const c = ctx;
  const t = c.currentTime + 0.01;
  const profile = opts.profile ?? "classic";
  const duration = opts.duration ?? 2.8;
  switch (name) {
    case "coin":
      tone(c, t, 0.3, 2637, 0.1, "triangle");
      tone(c, t, 0.35, 3951, 0.04);
      tone(c, t + 0.09, 0.4, 2093, 0.09, "triangle");
      hiss(c, t + 0.28, 0.12, "lowpass", 600, 0.12);
      tone(c, t + 0.3, 0.15, 90, 0.25, "sine", 50);
      break;
    case "tick":
      if (profile === "mechanical") {
        hiss(c, t, 0.025, "bandpass", 2400, 0.25, 2);
        tone(c, t, 0.04, 700, 0.06);
      } else if (profile === "cute") {
        tone(c, t, 0.09, 900, 0.1, "sine", 1700);
      } else if (profile === "plastic") {
        tone(c, t, 0.05, 2200, 0.035, "square");
      } else {
        tone(c, t, 0.07, 1320, 0.1);
      }
      break;
    case "charge":
      // Flash capacitor whine (disposables).
      tone(c, t, 1.4, 1800, 0.018, "sine", 5600);
      break;
    case "shutter":
      if (profile === "cute") {
        hiss(c, t, 0.05, "highpass", 4000, 0.12);
        tone(c, t, 0.1, 1568, 0.09, "triangle");
        tone(c, t + 0.07, 0.25, 2093, 0.08, "triangle");
        tone(c, t + 0.12, 0.3, 3136, 0.03);
        break;
      }
      if (profile === "plastic") {
        hiss(c, t, 0.12, "highpass", 6500, 0.05);
        hiss(c, t, 0.02, "highpass", 4000, 0.3);
        tone(c, t, 0.025, 420, 0.12);
        wind(c, t + 0.35);
        break;
      }
      hiss(c, t, 0.12, "highpass", 6000, 0.06);
      hiss(c, t, 0.03, "highpass", 2500, 0.3);
      tone(c, t, 0.08, 150, 0.32, "sine", 60);
      hiss(c, t + 0.07, 0.035, "bandpass", 1800, 0.28, 1.2);
      tone(c, t + 0.07, 0.06, 115, 0.2, "sine", 55);
      if (profile === "mechanical") {
        // Heavier, slower mirror and a solenoid thunk.
        tone(c, t + 0.12, 0.14, 85, 0.3, "sine", 40);
        hiss(c, t + 0.13, 0.05, "lowpass", 900, 0.2);
      }
      break;
    case "whirr":
      if (profile === "mechanical") motor(c, t, duration, 48, 0.09);
      else if (profile === "cute") {
        motor(c, t, duration, 120, 0.035);
        tone(c, t + duration - 0.05, 0.25, 2637, 0.06, "triangle");
        tone(c, t + duration + 0.08, 0.35, 3520, 0.05, "triangle");
      } else if (profile === "plastic") motor(c, t, duration, 95, 0.05);
      else motor(c, t, duration);
      break;
    case "drop":
      hiss(c, t, 0.06, "lowpass", 2400, 0.22);
      tone(c, t, 0.06, 240, 0.08, "sine", 120);
      break;
    case "curtain":
      hiss(c, t, 0.7, "bandpass", 1400, 0.05, 0.5);
      hiss(c, t + 0.1, 0.5, "highpass", 3500, 0.025);
      break;
  }
}

export function vibrate(ms: number) {
  if (!isMuted()) navigator.vibrate?.(ms);
}
