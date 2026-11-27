/**
 * Machines: each era is a complete identity, not just a filter.
 * A machine sets the film look, papers, strip style, typography, countdown,
 * sounds and the booth's exterior. See docs/PLAN.md, Phase 2.
 */

import type { Filter } from "./filters";
import type { FontKey } from "./fonts";
import type { SoundProfile } from "./sound";
import type { StickerKind } from "./stickers";

export type Paper = {
  id: string;
  name: string;
  /** Strip background. */
  paper: string;
  /** Caption and decoration color. */
  ink: string;
  /** Empty-slot fill. */
  slot: string;
};

export type StripStyle = {
  /** Corner radius of each photo, as a fraction of the photo width. */
  photoRadius: number;
  captionFont: FontKey;
  captionItalic: boolean;
  captionUpper: boolean;
  /** Caption size relative to the footer height. */
  captionScale: number;
  /** Outline around the caption (sticker style), or null. */
  captionOutline: string | null;
  /** Where the date goes: under the caption, burned in like a disposable, or a VHS on-screen display. */
  date: "footer" | "stamp" | "vhs";
  dateFont: FontKey;
  /** Paper decorations drawn around the photos. */
  decorations: "none" | "sparkles";
  /** Footer height relative to the photo width. */
  footer: number;
  defaultCaption: string;
  /** How each photo is framed: plain, on its own instant-print card (square), a receipt, or an ornate double rule. */
  frame?: "plain" | "instant" | "receipt" | "ornate";
  /** Photo window shape. */
  photoShape?: "rect" | "oval";
};

export type CountdownStyle = "stencil" | "bulb" | "bubble" | "lcd" | "plate" | "marker" | "vhs" | "receipt";

export type Exterior = {
  body: string;
  /** Darker shade for the base and the button's pressed edge. */
  base: string;
  marquee: string;
  marqueeText: string;
  /** Curtain fold colors, dark → light. */
  curtain: [string, string, string];
  startText: string;
  /** Text color on the cabinet body (dark for light cabinets). */
  bodyText?: string;
};

export type Machine = {
  id: string;
  year: string;
  name: string;
  tagline: string;
  filter: Filter;
  papers: readonly Paper[];
  layouts: readonly string[];
  strip: StripStyle;
  countdown: CountdownStyle;
  sound: SoundProfile;
  exterior: Exterior;
  /** Booth interior background. */
  interior: string;
  /** Flash color inside the booth. */
  flash: string;
  /** Sticker drawer for the decorate step. */
  stickers: readonly StickerKind[];
  /** Pen colors for the decorate step. */
  pens: readonly string[];
  /** White glow around pen lines (purikura style). */
  penHalo: boolean;
};

const ALL_MACHINES: Machine[] = [
  {
    id: "chemical-62",
    year: "'62",
    name: "Chemical",
    tagline: "Silver-toned black & white. Heavy grain, cream paper.",
    filter: {
      id: "chemical",
      name: "Chemical",
      ops: [["grayscale", 1], ["sepia", 0.14], ["contrast", 1.25], ["brightness", 1.03]],
      look: { grain: 0.15, vignette: 0.45, halation: 0.12, drift: 0.08 },
    },
    papers: [
      { id: "cream", name: "Cream", paper: "#f1e9d6", ink: "#2a251d", slot: "#e2d8c1" },
      { id: "white", name: "White", paper: "#f7f5ef", ink: "#1f1d1a", slot: "#e7e3da" },
    ],
    layouts: ["strip-4", "strip-3"],
    strip: {
      photoRadius: 0,
      captionFont: "typewriter",
      captionItalic: false,
      captionUpper: true,
      captionScale: 0.2,
      captionOutline: null,
      date: "footer",
      dateFont: "typewriter",
      decorations: "none",
      footer: 0.22,
      defaultCaption: "The Snap Room",
    },
    countdown: "stencil",
    sound: "mechanical",
    exterior: {
      body: "#3f5d4e",
      base: "#24372d",
      marquee: "#161a17",
      marqueeText: "#f1e9d6",
      curtain: ["#5c1212", "#7f1b19", "#992622"],
      startText: "#24372d",
    },
    interior: "#0d0f0e",
    flash: "#ffffff",
    stickers: ["tape-smile", "tape-snap", "text-xoxo", "heart", "star", "arrow", "bubble-hi", "sparkle"],
    pens: ["#1f1d1a", "#ffffff", "#b3261e"],
    penHalo: false,
  },
  {
    id: "color-79",
    year: "'79",
    name: "Color",
    tagline: "Faded warm color with a glow. Rounded corners.",
    filter: {
      id: "color",
      name: "Color",
      ops: [["sepia", 0.3], ["saturate", 1.2], ["contrast", 0.88], ["brightness", 1.06], ["hue-rotate", -8]],
      look: { grain: 0.1, vignette: 0.35, halation: 0.45, drift: 0.07 },
    },
    papers: [
      { id: "butter", name: "Butter", paper: "#f3d98a", ink: "#3b2414", slot: "#e4c873" },
      { id: "rust", name: "Rust", paper: "#cf5f2c", ink: "#fff1dc", slot: "#b8521f" },
      { id: "cocoa", name: "Cocoa", paper: "#4a2f1e", ink: "#f6dfb4", slot: "#5d3d28" },
    ],
    layouts: ["strip-4", "strip-3", "grid-4"],
    strip: {
      photoRadius: 0.045,
      captionFont: "groovy",
      captionItalic: false,
      captionUpper: false,
      captionScale: 0.3,
      captionOutline: null,
      date: "footer",
      dateFont: "body",
      decorations: "none",
      footer: 0.28,
      defaultCaption: "Good Times",
    },
    countdown: "bulb",
    sound: "classic",
    exterior: {
      body: "#d9622b",
      base: "#94391a",
      marquee: "#3b2414",
      marqueeText: "#f6d98c",
      curtain: ["#5a3112", "#8a4a19", "#b0651f"],
      startText: "#94391a",
    },
    interior: "#120b07",
    flash: "#fff6e3",
    stickers: ["flower", "rainbow", "sun", "peace", "text-groovy", "text-farout", "heart", "smiley"],
    pens: ["#3b2414", "#fff1dc", "#e8862a", "#4f8a3c"],
    penHalo: false,
  },
  {
    id: "sticker-98",
    year: "'98",
    name: "Sticker",
    tagline: "Bright, soft and sparkly. Hearts included.",
    filter: {
      id: "sticker",
      name: "Sticker",
      ops: [["brightness", 1.12], ["saturate", 1.25], ["contrast", 0.94], ["hue-rotate", -6]],
      look: { grain: 0.03, vignette: 0.1, halation: 0.3, drift: 0.02 },
    },
    papers: [
      { id: "bubblegum", name: "Bubblegum", paper: "#ffc6dc", ink: "#8a2c5c", slot: "#f7b2cd" },
      { id: "lavender", name: "Lavender", paper: "#d8c9ff", ink: "#41307a", slot: "#c7b5f5" },
      { id: "mint", name: "Mint", paper: "#c2efd9", ink: "#1d5b44", slot: "#ade3c9" },
    ],
    layouts: ["grid-4", "grid-6", "strip-4"],
    strip: {
      photoRadius: 0.06,
      captionFont: "rounded",
      captionItalic: false,
      captionUpper: false,
      captionScale: 0.34,
      captionOutline: "#ffffff",
      date: "footer",
      dateFont: "rounded",
      decorations: "sparkles",
      footer: 0.32,
      defaultCaption: "best friends ♡",
    },
    countdown: "bubble",
    sound: "cute",
    exterior: {
      body: "#ff8fbf",
      base: "#c75c8f",
      marquee: "#5b2a6e",
      marqueeText: "#ffe3f1",
      curtain: ["#b77ad9", "#cf98ec", "#e6bdf7"],
      startText: "#c2457f",
    },
    interior: "#140a13",
    flash: "#fff0f7",
    stickers: ["heart", "star", "sparkle", "crown", "ears", "text-bff", "text-cutie", "bubble-hi", "flower"],
    pens: ["#ff4f8b", "#8a5cf6", "#2ec4b6", "#ffffff"],
    penHalo: true,
  },
  {
    id: "disposable-04",
    year: "'04",
    name: "Disposable",
    tagline: "Harsh flash, light leaks, orange date stamp.",
    filter: {
      id: "disposable",
      name: "Disposable",
      ops: [["contrast", 1.18], ["saturate", 1.3], ["sepia", 0.08], ["hue-rotate", 5], ["brightness", 1.02]],
      look: { grain: 0.12, vignette: 0.55, halation: 0.18, drift: 0.1, leak: 0.45, flash: 0.35 },
    },
    papers: [
      { id: "print", name: "Print", paper: "#fbfbf8", ink: "#222222", slot: "#ececea" },
      { id: "black", name: "Black", paper: "#121212", ink: "#f2f2f2", slot: "#262626" },
    ],
    layouts: ["grid-4", "strip-3", "strip-4"],
    strip: {
      photoRadius: 0,
      captionFont: "body",
      captionItalic: false,
      captionUpper: true,
      captionScale: 0.16,
      captionOutline: null,
      date: "stamp",
      dateFont: "body",
      decorations: "none",
      footer: 0.18,
      defaultCaption: "The Snap Room",
    },
    countdown: "lcd",
    sound: "plastic",
    exterior: {
      body: "#2457c5",
      base: "#163a8a",
      marquee: "#0f1520",
      marqueeText: "#ff9a3d",
      curtain: ["#121212", "#1e1e1e", "#2b2b2b"],
      startText: "#163a8a",
    },
    interior: "#090c12",
    flash: "#ffffff",
    stickers: ["bolt", "shades", "smiley", "text-lol", "text-omg", "star", "arrow", "heart"],
    pens: ["#ffffff", "#111111", "#ff7a1a", "#2f7bff"],
    penHalo: true,
  },
  {
    id: "tintype-1890",
    year: "'1890",
    name: "Tintype",
    tagline: "Victorian plate portrait. Oval mat, soft edges, hold still.",
    filter: {
      id: "tintype",
      name: "Tintype",
      ops: [["grayscale", 1], ["sepia", 0.55], ["contrast", 1.35], ["brightness", 0.88]],
      look: { grain: 0.12, vignette: 0.7, halation: 0.15, drift: 0.06, edgeBlur: 0.85 },
    },
    papers: [
      { id: "velvet", name: "Velvet", paper: "#1b1612", ink: "#dcc79a", slot: "#2a221b" },
      { id: "walnut", name: "Walnut", paper: "#3b2a1d", ink: "#ead6ad", slot: "#4a3726" },
      { id: "cabinet", name: "Cabinet card", paper: "#e7dbc0", ink: "#3a2c1c", slot: "#d8cbb0" },
    ],
    layouts: ["strip-3", "grid-4"],
    strip: {
      photoRadius: 0,
      captionFont: "display",
      captionItalic: true,
      captionUpper: false,
      captionScale: 0.28,
      captionOutline: null,
      date: "footer",
      dateFont: "display",
      decorations: "none",
      footer: 0.26,
      defaultCaption: "A Portrait",
      frame: "ornate",
      photoShape: "oval",
    },
    countdown: "plate",
    sound: "victorian",
    exterior: {
      body: "#4a3423",
      base: "#2b1d12",
      marquee: "#1a120b",
      marqueeText: "#e9d6a8",
      curtain: ["#0f2a1e", "#1a4030", "#265a43"],
      startText: "#4a3423",
    },
    interior: "#0f0b07",
    flash: "#fff4dc",
    stickers: ["mustache", "tophat", "monocle", "text-xoxo", "heart", "star", "tape-smile", "sparkle"],
    pens: ["#e9d6a8", "#1a120b", "#7a1f1f"],
    penHalo: false,
  },
  {
    id: "instant-72",
    year: "'72",
    name: "Instant",
    tagline: "Square prints on white cards. Shake it (don't).",
    filter: {
      id: "instant",
      name: "Instant",
      ops: [["sepia", 0.18], ["saturate", 0.85], ["contrast", 0.88], ["brightness", 1.08], ["hue-rotate", 6]],
      look: { grain: 0.06, vignette: 0.28, halation: 0.35, drift: 0.09 },
    },
    papers: [
      { id: "sunbleached", name: "Sunbleached", paper: "#efe7d6", ink: "#3b3127", slot: "#e2d9c6" },
      { id: "denim", name: "Denim", paper: "#3d5a80", ink: "#f2efe6", slot: "#4a678c" },
      { id: "peach", name: "Peach", paper: "#f4c7a8", ink: "#4a2c1e", slot: "#e8b796" },
    ],
    layouts: ["grid-4", "wide-3"],
    strip: {
      photoRadius: 0.008,
      captionFont: "hand",
      captionItalic: false,
      captionUpper: false,
      captionScale: 0.34,
      captionOutline: null,
      date: "footer",
      dateFont: "hand",
      decorations: "none",
      footer: 0.24,
      defaultCaption: "summer days",
      frame: "instant",
    },
    countdown: "marker",
    sound: "instant",
    exterior: {
      body: "#ece6d8",
      base: "#a39b8b",
      marquee: "#24211d",
      marqueeText: "#f6efe0",
      curtain: ["#0e4f55", "#16707a", "#22939e"],
      startText: "#c4532a",
      bodyText: "#2a2620",
    },
    interior: "#0f1313",
    flash: "#ffffff",
    stickers: ["text-summer", "flower", "sun", "shades", "heart", "rainbow", "smiley", "star"],
    pens: ["#1d1d1d", "#c4532a", "#2f6fad"],
    penHalo: false,
  },
  {
    id: "camcorder-89",
    year: "'89",
    name: "Camcorder",
    tagline: "Home video freeze-frames. Scanlines, color bleed, PLAY.",
    filter: {
      id: "camcorder",
      name: "Camcorder",
      ops: [["saturate", 1.35], ["contrast", 1.12], ["brightness", 1.04], ["hue-rotate", -4]],
      look: { grain: 0.05, vignette: 0.25, halation: 0.25, drift: 0.05, soften: 0.6, chroma: 0.7, scanlines: 0.6 },
    },
    papers: [
      { id: "tape", name: "Tape black", paper: "#0f0f12", ink: "#e8e8e8", slot: "#1c1c22" },
      { id: "bluescreen", name: "Blue screen", paper: "#1d3fbf", ink: "#ffffff", slot: "#2a4fd1" },
      { id: "sleeve", name: "VHS sleeve", paper: "#d8d2c4", ink: "#1a1a1a", slot: "#c9c2b2" },
    ],
    layouts: ["grid-4", "wide-3"],
    strip: {
      photoRadius: 0.025,
      captionFont: "pixel",
      captionItalic: false,
      captionUpper: true,
      captionScale: 0.34,
      captionOutline: null,
      date: "vhs",
      dateFont: "pixel",
      decorations: "none",
      footer: 0.2,
      defaultCaption: "Home Video",
    },
    countdown: "vhs",
    sound: "vhs",
    exterior: {
      body: "#2d3036",
      base: "#15161a",
      marquee: "#0a0a0c",
      marqueeText: "#ff4a4a",
      curtain: ["#14182a", "#1f2640", "#2c3557"],
      startText: "#2d3036",
    },
    interior: "#05060c",
    flash: "#e8f0ff",
    stickers: ["rec-badge", "play-badge", "bolt", "shades", "smiley", "star", "text-omg", "heart"],
    pens: ["#ff3b3b", "#ffffff", "#39ff14", "#ffd400"],
    penHalo: true,
  },
  {
    id: "thermal-25",
    year: "'25",
    name: "Thermal",
    tagline: "Receipt-printer photos. Dithered, torn off, kept forever.",
    filter: {
      id: "thermal",
      name: "Thermal",
      ops: [["grayscale", 1], ["contrast", 1.25], ["brightness", 1.08]],
      look: { grain: 0.03, vignette: 0, halation: 0, drift: 0.03, dither: 1 },
    },
    papers: [
      { id: "thermal", name: "Thermal", paper: "#f3f1ea", ink: "#222120", slot: "#e5e2d8" },
      { id: "thermal-pink", name: "Receipt pink", paper: "#f6e0e0", ink: "#2a1f1f", slot: "#ead0d0" },
      { id: "thermal-yellow", name: "Receipt yellow", paper: "#f4ecc6", ink: "#26231a", slot: "#e8deb2" },
    ],
    layouts: ["strip-4", "strip-3"],
    strip: {
      photoRadius: 0,
      captionFont: "typewriter",
      captionItalic: false,
      captionUpper: true,
      captionScale: 0.15,
      captionOutline: null,
      date: "footer",
      dateFont: "typewriter",
      decorations: "none",
      footer: 0.34,
      defaultCaption: "Thank you, come again",
      frame: "receipt",
    },
    countdown: "receipt",
    sound: "thermal",
    exterior: {
      body: "#e6e3dc",
      base: "#97938a",
      marquee: "#1d1d1d",
      marqueeText: "#f3f1ea",
      curtain: ["#2e2e2e", "#474747", "#616161"],
      startText: "#1d1d1d",
      bodyText: "#1d1d1d",
    },
    interior: "#0e0e0e",
    flash: "#ffffff",
    stickers: ["barcode", "paid-stamp", "star", "arrow", "heart", "smiley", "text-lol", "tape-snap"],
    pens: ["#1d1d1d", "#c0392b"],
    penHalo: false,
  },
];

/** "'1890" → 1890, "'62" → 1962, "'25" → 2025. */
const yearOf = (m: Machine) => {
  const n = Number(m.year.replace("'", ""));
  return n >= 1000 ? n : n < 30 ? 2000 + n : 1900 + n;
};

/** The street, in chronological order. */
export const MACHINES: readonly Machine[] = [...ALL_MACHINES].sort((a, b) => yearOf(a) - yearOf(b));

export const DEFAULT_MACHINE = MACHINES.find((m) => m.id === "color-79") ?? MACHINES[0];

export const machineById = (id: string) => MACHINES.find((m) => m.id === id) ?? DEFAULT_MACHINE;

/** Extra papers beyond the machines' own sets. */
const EXTRA_PAPERS: readonly Paper[] = [
  { id: "kraft", name: "Kraft", paper: "#c9a57b", ink: "#2b2014", slot: "#b8936a" },
  { id: "tomato", name: "Tomato", paper: "#e5482f", ink: "#fff6ef", slot: "#c93b25" },
  { id: "sky", name: "Sky", paper: "#bcd9ee", ink: "#14283a", slot: "#a7c8e0" },
  { id: "sage", name: "Sage", paper: "#c9dbc6", ink: "#1b2b1d", slot: "#b4caae" },
  { id: "midnight", name: "Midnight", paper: "#18203a", ink: "#ece6d6", slot: "#232c4a" },
  { id: "silver", name: "Silver", paper: "#d4d6d8", ink: "#1c1d1f", slot: "#c2c4c7" },
];

/** Every paper, from every machine plus extras, for mixing and matching. */
export const PAPERS: readonly Paper[] = [...MACHINES.flatMap((m) => m.papers), ...EXTRA_PAPERS].filter(
  (p, i, all) => all.findIndex((q) => q.id === p.id) === i,
);

export const paperById = (id: string) => PAPERS.find((p) => p.id === id);

/** Extra film looks beyond the machines' own. */
const EXTRA_LOOKS: readonly Filter[] = [
  { id: "natural", name: "Natural", ops: [], look: { grain: 0.06, halation: 0.2 } },
  { id: "pop", name: "Pop", ops: [["contrast", 1.15], ["saturate", 1.5]] },
  { id: "soft", name: "Soft", ops: [["contrast", 0.85], ["brightness", 1.1], ["saturate", 0.8]], look: { halation: 0.4 } },
  { id: "cool", name: "Cool", ops: [["hue-rotate", -12], ["saturate", 0.9], ["brightness", 1.05]] },
  { id: "rose", name: "Rose", ops: [["sepia", 0.15], ["hue-rotate", -20], ["saturate", 1.2]] },
  { id: "noir", name: "Noir", ops: [["grayscale", 1], ["contrast", 1.6], ["brightness", 0.9]], look: { grain: 0.16, vignette: 0.5 } },
];

/** Every look: each machine's own (named after the machine) plus extras. */
export const LOOKS: readonly Filter[] = [
  ...MACHINES.map((m) => ({ ...m.filter, id: m.id, name: `${m.year} ${m.name}` })),
  ...EXTRA_LOOKS,
];

export const lookById = (id: string) => LOOKS.find((l) => l.id === id);
