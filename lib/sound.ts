"use client";

/**
 * Booth sounds: real CC0 recordings (see public/sounds/CREDITS.txt), plus the
 * synthesized countdown tick, which is the one synth sound that worked well.
 *
 * Files are fetched early (preloadSounds) and decoded when audio is unlocked,
 * which must happen inside a click/tap handler (unlockAudio).
 * See docs/research/04-technical.md#web-audio.
 */

import { useSyncExternalStore } from "react";

export type SoundName = "coin" | "tick" | "shutter" | "whirr" | "drop" | "pop" | "ready" | "timeup";

/** Each machine has its own voice. See lib/machines.ts. */
export type SoundProfile = "mechanical" | "classic" | "cute" | "plastic";

const FILES = [
  "coin",
  "shutter-slr",
  "shutter-light",
  "shutter-compact",
  "sparkle",
  "motor",
  "paper-slide",
  "paper-place",
  "ready",
  "pop",
  "timeup",
] as const;
type FileName = (typeof FILES)[number];

const KEY = "snaproom:muted";
let ctx: AudioContext | null = null;
let bus: AudioNode | null = null;
let muted = false;
let loaded = false;
const listeners = new Set<() => void>();
const raw = new Map<FileName, Promise<ArrayBuffer | null>>();
const buffers = new Map<FileName, AudioBuffer>();
let decoding: Promise<void> | null = null;

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

/** Start downloading the sound files (no decoding yet). Safe to call repeatedly. */
export function preloadSounds() {
  if (raw.size) return;
  for (const f of FILES) {
    raw.set(
      f,
      fetch(`/sounds/${f}.wav`)
        .then((r) => (r.ok ? r.arrayBuffer() : null))
        .catch(() => null),
    );
  }
}

function decodeAll(c: AudioContext) {
  if (decoding) return decoding;
  preloadSounds();
  decoding = Promise.all(
    FILES.map(async (f) => {
      const data = await raw.get(f);
      if (!data) return;
      try {
        buffers.set(f, await c.decodeAudioData(data.slice(0)));
      } catch {
        /* skip a file that won't decode */
      }
    }),
  ).then(() => undefined);
  return decoding;
}

/** Call synchronously from a click/tap handler. */
export function unlockAudio() {
  try {
    if (!ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      // A gentle compressor keeps loud and quiet recordings at a similar level.
      const input = ctx.createGain();
      input.gain.value = 0.9;
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -16;
      comp.ratio.value = 2.5;
      input.connect(comp).connect(ctx.destination);
      bus = input;
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
    decodeAll(ctx);
  } catch {
    ctx = null;
    bus = null;
  }
}

type SampleOpts = { gain?: number; rate?: number; offset?: number; duration?: number; fade?: number };

/** Plays a decoded recording at time `at`. Returns false if it isn't loaded yet. */
function sample(name: FileName, at: number, opts: SampleOpts = {}) {
  const b = buffers.get(name);
  if (!ctx || !bus || !b) return false;
  const src = ctx.createBufferSource();
  src.buffer = b;
  src.playbackRate.value = opts.rate ?? 1;
  const g = ctx.createGain();
  const level = opts.gain ?? 1;
  const fade = opts.fade ?? 0;
  if (fade && opts.duration) {
    const end = at + opts.duration / (opts.rate ?? 1);
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(level, at + fade);
    g.gain.setValueAtTime(level, Math.max(at + fade, end - fade));
    g.gain.exponentialRampToValueAtTime(0.0001, end);
  } else {
    g.gain.value = level;
  }
  src.connect(g).connect(bus);
  src.start(at, opts.offset ?? 0, opts.duration);
  return true;
}

/** The synthesized countdown tick (kept from the first kit; it tested well). */
function tick(c: AudioContext, out: AudioNode, at: number, freq: number, glide: boolean) {
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.frequency.setValueAtTime(freq, at);
  if (glide) osc.frequency.exponentialRampToValueAtTime(freq * 1.25, at + 0.07);
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(0.1, at + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, at + 0.07);
  osc.connect(g).connect(out);
  osc.start(at);
  osc.stop(at + 0.09);
}

/** Matches the stepped @keyframes print-out in globals.css. */
const PRINT_PUSHES: [number, number][] = [
  [0, 0.2],
  [0.24, 0.48],
  [0.52, 0.76],
  [0.8, 1],
];

const MOTOR_RATE: Record<SoundProfile, number> = { mechanical: 0.8, classic: 1, cute: 1.25, plastic: 1.1 };

export function play(name: SoundName, opts: { profile?: SoundProfile; duration?: number } = {}) {
  if (!ctx || !bus || isMuted()) return;
  if (ctx.state !== "running") ctx.resume().catch(() => {});
  const c = ctx;
  const t = c.currentTime + 0.01;
  const profile = opts.profile ?? "classic";

  if (name === "tick") {
    const f = profile === "mechanical" ? 1050 : profile === "cute" ? 1600 : profile === "plastic" ? 1900 : 1320;
    tick(c, bus, t, f, profile === "cute");
    return;
  }

  // Recordings may still be decoding right after the Start press; play once ready if it's quick.
  const requested = performance.now();
  const fire = (at: number) => {
    switch (name) {
      case "coin":
        return sample("coin", at, { gain: 0.9 });
      case "shutter":
        if (profile === "plastic") return sample("shutter-compact", at);
        if (profile === "cute") {
          const ok = sample("shutter-light", at, { rate: 1.08 });
          sample("sparkle", at + 0.06, { gain: 0.7 });
          return ok;
        }
        return sample("shutter-slr", at, profile === "mechanical" ? { rate: 0.85 } : {});
      case "whirr": {
        const motor = buffers.get("motor");
        if (!motor) return false;
        const duration = opts.duration ?? 3;
        const rate = MOTOR_RATE[profile];
        for (const [a, b] of PRINT_PUSHES) {
          const len = (b - a) * duration * rate; // source seconds for this push
          const offset = Math.random() * Math.max(0, motor.duration - len);
          sample("motor", at + a * duration, { rate, offset, duration: len, gain: 0.55, fade: 0.04 });
          sample("paper-slide", at + a * duration + 0.05, { gain: 0.25, rate: 0.9 });
        }
        return true;
      }
      case "drop":
        return sample("paper-place", at, { gain: 0.8 });
      case "pop":
        return sample("pop", at, { gain: 0.8 });
      case "ready":
        return sample("ready", at, { gain: 0.7 });
      case "timeup":
        return sample("timeup", at, { gain: 0.7 });
    }
  };

  if (!fire(t) && decoding) {
    decoding.then(() => {
      if (ctx && performance.now() - requested < 600) fire(ctx.currentTime + 0.01);
    });
  }
}

export function vibrate(ms: number) {
  if (!isMuted()) navigator.vibrate?.(ms);
}
