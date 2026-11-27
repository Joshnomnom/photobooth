"use client";

/**
 * Synthesized booth sounds (Web Audio, no sample files).
 * Audio must be unlocked inside a click/tap handler; see docs/research/04-technical.md#web-audio.
 */

import { useSyncExternalStore } from "react";

export type SoundName = "coin" | "tick" | "shutter" | "whirr" | "drop" | "curtain";

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

function motor(c: AudioContext, start: number, dur: number) {
  const osc = c.createOscillator();
  osc.type = "sawtooth";
  osc.frequency.value = 68;
  const lp = c.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 520;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(0.07, start + 0.12);
  g.gain.setValueAtTime(0.07, start + dur - 0.2);
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

export function play(name: SoundName, durationSec = 2.8) {
  if (!ctx || isMuted()) return;
  if (ctx.state !== "running") ctx.resume().catch(() => {});
  const c = ctx;
  const t = c.currentTime + 0.01;
  switch (name) {
    case "coin":
      tone(c, t, 0.3, 2637, 0.1, "triangle");
      tone(c, t, 0.35, 3951, 0.04);
      tone(c, t + 0.09, 0.4, 2093, 0.09, "triangle");
      hiss(c, t + 0.28, 0.12, "lowpass", 600, 0.12);
      tone(c, t + 0.3, 0.15, 90, 0.25, "sine", 50);
      break;
    case "tick":
      tone(c, t, 0.07, 1320, 0.1);
      break;
    case "shutter":
      hiss(c, t, 0.12, "highpass", 6000, 0.06);
      hiss(c, t, 0.03, "highpass", 2500, 0.3);
      tone(c, t, 0.08, 150, 0.32, "sine", 60);
      hiss(c, t + 0.07, 0.035, "bandpass", 1800, 0.28, 1.2);
      tone(c, t + 0.07, 0.06, 115, 0.2, "sine", 55);
      break;
    case "whirr":
      motor(c, t, durationSec);
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
