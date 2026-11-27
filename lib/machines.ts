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
  /** Where the date goes: under the caption, or burned into each photo like a disposable. */
  date: "footer" | "stamp";
  dateFont: FontKey;
  /** Paper decorations drawn around the photos. */
  decorations: "none" | "sparkles";
  /** Footer height relative to the photo width. */
  footer: number;
  defaultCaption: string;
};

export type CountdownStyle = "stencil" | "bulb" | "bubble" | "lcd";

export type Exterior = {
  body: string;
  /** Darker shade for the base and the button's pressed edge. */
  base: string;
  marquee: string;
  marqueeText: string;
  /** Curtain fold colors, dark → light. */
  curtain: [string, string, string];
  startText: string;
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

export const MACHINES: readonly Machine[] = [
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
];

export const DEFAULT_MACHINE = MACHINES[1];

export const machineById = (id: string) => MACHINES.find((m) => m.id === id) ?? DEFAULT_MACHINE;
