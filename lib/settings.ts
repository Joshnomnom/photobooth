import type { Filter, LookParams } from "./filters";
import { DEFAULT_MACHINE, LOOKS, type Machine, machineById, PAPERS, paperById, type StripStyle } from "./machines";
import type { SoundProfile } from "./sound";
import { LAYOUTS, layoutById } from "./strip";

export type Mode = "film" | "digital";
export type Timer = "0" | "1" | "3" | "5" | "10";
export type Effects = "off" | "low" | "normal" | "strong";
export type Pace = "quick" | "normal" | "relaxed";
/** "auto" = follow the chosen machine. Everything else overrides it (mix and match). */
export type Auto<T extends string> = "auto" | T;

export type Settings = {
  machineId: string;
  /** Any layout works with any machine. */
  layoutId: string;
  /** Countdown seconds before each pose; "0" = no countdown. */
  timer: Timer;
  /** Film: one press shoots the whole strip, no retakes. Digital: one shot per press, retakes allowed. */
  mode: Mode;
  mirror: boolean;
  // ── Mix & match ──
  lookId: Auto<string>;
  paperId: Auto<string>;
  effects: Effects;
  corners: Auto<"square" | "rounded" | "oval">;
  date: Auto<"footer" | "stamp" | "vhs">;
  frame: Auto<"plain" | "instant" | "receipt" | "ornate">;
  decorations: Auto<"none" | "sparkles">;
  sound: Auto<SoundProfile>;
  pace: Pace;
  prompts: boolean;
  flash: boolean;
};

export const DEFAULT_SETTINGS: Settings = {
  machineId: DEFAULT_MACHINE.id,
  layoutId: DEFAULT_MACHINE.layouts[0],
  timer: "3",
  mode: "film",
  mirror: true,
  lookId: "auto",
  paperId: "auto",
  effects: "normal",
  corners: "auto",
  date: "auto",
  frame: "auto",
  decorations: "auto",
  sound: "auto",
  pace: "normal",
  prompts: true,
  flash: true,
};

/** Overrides that "Reset to machine defaults" clears (layout, timer, mode and mirror are kept). */
export const MIX_DEFAULTS: Pick<
  Settings,
  "lookId" | "paperId" | "effects" | "corners" | "date" | "frame" | "decorations" | "sound" | "pace" | "prompts" | "flash"
> = {
  lookId: "auto",
  paperId: "auto",
  effects: "normal",
  corners: "auto",
  date: "auto",
  frame: "auto",
  decorations: "auto",
  sound: "auto",
  pace: "normal",
  prompts: true,
  flash: true,
};

export const isMixed = (s: Settings) => (Object.keys(MIX_DEFAULTS) as (keyof typeof MIX_DEFAULTS)[]).some((k) => s[k] !== MIX_DEFAULTS[k]);

/** Switching machines keeps every choice; "auto" values simply follow the new machine. */
export const withMachine = (settings: Settings, machine: Machine): Settings => ({ ...settings, machineId: machine.id });

const EFFECT_SCALE: Record<Effects, number> = { off: 0, low: 0.5, normal: 1, strong: 1.6 };
/** Gap between poses in film mode. */
const PACE_MS: Record<Pace, number> = { quick: 450, normal: 1100, relaxed: 2400 };

function scaleLook(filter: Filter, scale: number): Filter {
  if (scale === 1) return filter;
  // Dither is on/off, not a strength, so it isn't scaled.
  const keys: (keyof LookParams)[] = ["grain", "vignette", "halation", "leak", "flash", "soften", "chroma", "scanlines", "edgeBlur"];
  const base: Partial<LookParams> = { grain: 0.09, vignette: 0.32, halation: 0.3, leak: 0, flash: 0, ...filter.look };
  const look: Partial<LookParams> = { ...filter.look };
  for (const k of keys) look[k] = (base[k] ?? 0) * scale;
  if (scale === 0) look.drift = 0;
  return { ...filter, look };
}

/** Everything the rest of the app needs, with machine defaults and overrides merged. */
export function resolve(settings: Settings) {
  const machine = machineById(settings.machineId);
  const look = settings.lookId === "auto" ? machine.filter : (LOOKS.find((l) => l.id === settings.lookId) ?? machine.filter);
  const paper = (settings.paperId !== "auto" && paperById(settings.paperId)) || machine.papers[0];
  const style: StripStyle = {
    ...machine.strip,
    photoRadius:
      settings.corners === "auto" ? machine.strip.photoRadius : settings.corners === "rounded" ? Math.max(machine.strip.photoRadius, 0.05) : 0,
    photoShape: settings.corners === "auto" ? machine.strip.photoShape : settings.corners === "oval" ? "oval" : "rect",
    date: settings.date === "auto" ? machine.strip.date : settings.date,
    frame: settings.frame === "auto" ? machine.strip.frame : settings.frame,
    decorations: settings.decorations === "auto" ? machine.strip.decorations : settings.decorations,
  };
  return {
    machine,
    layout: layoutById(settings.layoutId),
    filter: scaleLook(look, EFFECT_SCALE[settings.effects]),
    paper,
    style,
    sound: settings.sound === "auto" ? machine.sound : settings.sound,
    countdown: Number(settings.timer),
    gapMs: PACE_MS[settings.pace],
  };
}

// ── Remembering the setup (this browser only) ──

const KEY = "snaproom:settings";

/** Reads saved settings, keeping only values that are still valid. */
export function loadSettings(): Settings | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as Partial<Settings>;
    const s: Settings = { ...DEFAULT_SETTINGS, ...saved };
    const oneOf = <T,>(v: unknown, list: readonly T[], fallback: T) => (list.includes(v as T) ? (v as T) : fallback);
    return {
      ...s,
      machineId: machineById(s.machineId).id,
      layoutId: LAYOUTS.some((l) => l.id === s.layoutId) ? s.layoutId : DEFAULT_SETTINGS.layoutId,
      timer: oneOf(s.timer, ["0", "1", "3", "5", "10"] as const, "3"),
      mode: oneOf(s.mode, ["film", "digital"] as const, "film"),
      lookId: s.lookId === "auto" || LOOKS.some((l) => l.id === s.lookId) ? s.lookId : "auto",
      paperId: s.paperId === "auto" || PAPERS.some((p) => p.id === s.paperId) ? s.paperId : "auto",
      effects: oneOf(s.effects, ["off", "low", "normal", "strong"] as const, "normal"),
      corners: oneOf(s.corners, ["auto", "square", "rounded", "oval"] as const, "auto"),
      date: oneOf(s.date, ["auto", "footer", "stamp", "vhs"] as const, "auto"),
      frame: oneOf(s.frame, ["auto", "plain", "instant", "receipt", "ornate"] as const, "auto"),
      decorations: oneOf(s.decorations, ["auto", "none", "sparkles"] as const, "auto"),
      sound: oneOf(s.sound, ["auto", "mechanical", "classic", "cute", "plastic", "victorian", "instant", "vhs", "thermal"] as const, "auto"),
      pace: oneOf(s.pace, ["quick", "normal", "relaxed"] as const, "normal"),
      mirror: s.mirror !== false,
      prompts: s.prompts !== false,
      flash: s.flash !== false,
    };
  } catch {
    return null;
  }
}

export function saveSettings(settings: Settings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    /* storage blocked: settings just won't be remembered */
  }
}

export const POSE_PROMPTS = [
  "Big smile!",
  "Now look serious.",
  "Silly face!",
  "Look surprised!",
  "Squeeze in close.",
  "Strike a pose.",
  "Look off into the distance.",
  "Peace sign!",
  "Laugh like you mean it.",
  "Blow a kiss.",
];
