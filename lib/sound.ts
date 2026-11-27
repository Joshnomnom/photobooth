"use client";

/**
 * Synthesized booth sounds (Web Audio, no sample files).
 *
 * Design rule (after the first kit was too harsh): build everything from clean,
 * short tones like the countdown tick. Noise is used only in tiny, filtered
 * amounts. Every sound goes through one bus: high-cut → gentle compressor →
 * a touch of room reverb, so they sit together instead of poking out.
 *
 * Audio must be unlocked inside a click/tap handler; see docs/research/04-technical.md#web-audio.
 */

import { useSyncExternalStore } from "react";

export type SoundName = "coin" | "tick" | "shutter" | "whirr" | "drop" | "charge" | "pop" | "ready" | "timeup";

/** Each machine has its own voice. See lib/machines.ts. */
export type SoundProfile = "mechanical" | "classic" | "cute" | "plastic";

const KEY = "snaproom:muted";
let ctx: AudioContext | null = null;
let bus: AudioNode | null = null;
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

/** A short, dark room impulse: decaying stereo noise, smoothed. */
function roomImpulse(c: AudioContext) {
  const len = Math.floor(c.sampleRate * 0.7);
  const ir = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch);
    let prev = 0;
    for (let i = 0; i < len; i++) {
      const t = i / len;
      const n = (Math.random() * 2 - 1) * (1 - t) ** 3;
      prev = prev * 0.6 + n * 0.4; // simple low-pass so the tail isn't hissy
      d[i] = prev;
    }
  }
  return ir;
}

function buildBus(c: AudioContext) {
  const input = c.createGain();
  input.gain.value = 0.8;
  const hiCut = c.createBiquadFilter();
  hiCut.type = "lowpass";
  hiCut.frequency.value = 7500;
  const comp = c.createDynamicsCompressor();
  comp.threshold.value = -20;
  comp.ratio.value = 3;
  comp.attack.value = 0.003;
  comp.release.value = 0.15;
  input.connect(hiCut).connect(comp).connect(c.destination);

  const verb = c.createConvolver();
  verb.buffer = roomImpulse(c);
  const wet = c.createGain();
  wet.gain.value = 0.14;
  comp.connect(verb).connect(wet).connect(c.destination);
  return input;
}

/** Call synchronously from a click/tap handler. */
export function unlockAudio() {
  try {
    if (!ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      bus = buildBus(ctx);
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
    bus = null;
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

type ToneOpts = { type?: OscillatorType; to?: number; attack?: number };

/** A clean enveloped tone. The building block for almost everything. */
function tone(c: AudioContext, out: AudioNode, start: number, dur: number, freq: number, gain: number, opts: ToneOpts = {}) {
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = opts.type ?? "sine";
  osc.frequency.setValueAtTime(freq, start);
  if (opts.to) osc.frequency.exponentialRampToValueAtTime(opts.to, start + dur);
  const attack = opts.attack ?? 0.004;
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(gain, start + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(g).connect(out);
  osc.start(start);
  osc.stop(start + dur + 0.02);
}

/** A tiny touch of band-limited noise, for texture only. */
function grit(c: AudioContext, out: AudioNode, start: number, dur: number, freq: number, gain: number, q = 2) {
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c);
  const f = c.createBiquadFilter();
  f.type = "bandpass";
  f.frequency.value = freq;
  f.Q.value = q;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(gain, start + 0.003);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  src.connect(f).connect(g).connect(out);
  src.start(start, Math.random() * 0.5);
  src.stop(start + dur + 0.02);
}

/** A soft bell: fundamental plus two inharmonic partials. */
function bell(c: AudioContext, out: AudioNode, start: number, freq: number, gain: number, decay = 0.8) {
  tone(c, out, start, decay, freq, gain, { attack: 0.006 });
  tone(c, out, start, decay * 0.5, freq * 2.76, gain * 0.25, { attack: 0.004 });
  tone(c, out, start, decay * 0.25, freq * 5.4, gain * 0.08, { attack: 0.003 });
}

/** A crisp, quiet mechanical click. */
function click(c: AudioContext, out: AudioNode, start: number, gain = 1) {
  tone(c, out, start, 0.012, 1900, 0.09 * gain, { attack: 0.001 });
  grit(c, out, start, 0.02, 2600, 0.04 * gain, 3);
}

/** One push of the print motor: a smooth low hum with a gentle flutter. */
function motorPush(c: AudioContext, out: AudioNode, start: number, dur: number, freq: number, level: number) {
  const osc = c.createOscillator();
  osc.frequency.value = freq;
  const lp = c.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 420;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(level, start + 0.04);
  g.gain.setValueAtTime(level, Math.max(start + 0.05, start + dur - 0.07));
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  const lfo = c.createOscillator();
  lfo.frequency.value = 26;
  const depth = c.createGain();
  depth.gain.value = level * 0.35;
  lfo.connect(depth).connect(g.gain);
  osc.connect(lp).connect(g).connect(out);
  osc.start(start);
  lfo.start(start);
  osc.stop(start + dur + 0.05);
  lfo.stop(start + dur + 0.05);
  // Faint gear ticks over the hum.
  for (let t = start + 0.05; t < start + dur - 0.05; t += 1 / 12) tone(c, out, t, 0.006, 1300, 0.012, { attack: 0.001 });
}

/** Matches the stepped @keyframes print-out in globals.css. */
const PRINT_PUSHES: [number, number][] = [
  [0, 0.2],
  [0.24, 0.48],
  [0.52, 0.76],
  [0.8, 1],
];

export function play(name: SoundName, opts: { profile?: SoundProfile; duration?: number } = {}) {
  if (!ctx || !bus || isMuted()) return;
  if (ctx.state !== "running") ctx.resume().catch(() => {});
  const c = ctx;
  const out = bus;
  const t = c.currentTime + 0.01;
  const profile = opts.profile ?? "classic";
  const duration = opts.duration ?? 3;

  switch (name) {
    case "tick": {
      // The one everybody liked. Profiles only shift the pitch.
      const f = profile === "mechanical" ? 1050 : profile === "cute" ? 1600 : profile === "plastic" ? 1900 : 1320;
      tone(c, out, t, 0.07, f, 0.1, profile === "cute" ? { to: f * 1.25 } : {});
      break;
    }
    case "coin":
      // Two-note welcome chime, then the coin landing.
      bell(c, out, t, 1568, 0.07, 0.7);
      bell(c, out, t + 0.12, 2093, 0.06, 0.9);
      tone(c, out, t + 0.24, 0.09, 140, 0.08, { to: 80 });
      break;
    case "shutter":
      if (profile === "cute") {
        // Sparkly arpeggio instead of a mechanism.
        [1047, 1319, 1568, 2093].forEach((f, i) => bell(c, out, t + i * 0.05, f, 0.05, 0.35));
      } else if (profile === "plastic") {
        click(c, out, t, 0.9);
        // Film-advance thumbwheel: soft ratchet ticks.
        for (let i = 0; i < 6; i++) tone(c, out, t + 0.3 + i * 0.045, 0.006, 2800, 0.03, { attack: 0.001 });
      } else {
        const heavy = profile === "mechanical";
        click(c, out, t);
        tone(c, out, t, heavy ? 0.09 : 0.06, heavy ? 115 : 145, heavy ? 0.16 : 0.11, { to: heavy ? 55 : 70 });
        click(c, out, t + (heavy ? 0.09 : 0.055), 0.8);
      }
      break;
    case "whirr": {
      const freq = profile === "mechanical" ? 68 : profile === "cute" ? 140 : profile === "plastic" ? 110 : 88;
      const level = profile === "cute" ? 0.035 : 0.055;
      for (const [a, b] of PRINT_PUSHES) motorPush(c, out, t + a * duration, (b - a) * duration, freq, level);
      if (profile === "cute") {
        bell(c, out, t + duration, 2637, 0.04, 0.5);
        bell(c, out, t + duration + 0.1, 3136, 0.035, 0.6);
      }
      break;
    }
    case "drop":
      tone(c, out, t, 0.05, 260, 0.07, { to: 140 });
      grit(c, out, t, 0.03, 1200, 0.02, 1);
      break;
    case "charge":
      // Disposable flash charging: kept very quiet on purpose.
      tone(c, out, t, 1.2, 700, 0.01, { to: 2200, attack: 0.2 });
      break;
    case "pop":
      // Sticker placed.
      tone(c, out, t, 0.06, 520, 0.07, { to: 900 });
      tone(c, out, t + 0.02, 0.04, 1400, 0.02);
      break;
    case "ready":
      // Strip developed.
      bell(c, out, t, 1319, 0.05, 0.8);
      bell(c, out, t + 0.1, 1760, 0.05, 1);
      break;
    case "timeup":
      bell(c, out, t, 1047, 0.06, 0.6);
      bell(c, out, t + 0.16, 784, 0.06, 0.9);
      break;
  }
}

export function vibrate(ms: number) {
  if (!isMuted()) navigator.vibrate?.(ms);
}
