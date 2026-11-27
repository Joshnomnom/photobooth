/**
 * Decorations added after the shoot (Phase 3): stickers and pen strokes.
 * Coordinates are in strip-canvas pixels, so they export at full resolution.
 */

import type { Fonts } from "./fonts";
import { drawSticker, type StickerKind } from "./stickers";

export type PlacedSticker = { id: string; kind: StickerKind; x: number; y: number; size: number; rotation: number };
export type Stroke = { id: string; color: string; width: number; halo: boolean; points: number[] };
export type Decorations = { stickers: PlacedSticker[]; strokes: Stroke[] };

export const EMPTY_DECORATIONS: Decorations = { stickers: [], strokes: [] };

export const isEmpty = (d: Decorations) => d.stickers.length === 0 && d.strokes.length === 0;

let counter = 0;
export const newId = () => `d${Date.now().toString(36)}${(counter++).toString(36)}`;

export function drawDecorations(ctx: CanvasRenderingContext2D, deco: Decorations, fonts: Fonts) {
  for (const s of deco.strokes) drawStroke(ctx, s);
  for (const s of deco.stickers) drawSticker(ctx, s.kind, s.x, s.y, s.size, s.rotation, fonts);
}

function strokePath(points: number[]) {
  const p = new Path2D();
  if (points.length < 2) return p;
  p.moveTo(points[0], points[1]);
  if (points.length === 2) {
    p.lineTo(points[0] + 0.1, points[1]);
    return p;
  }
  // Smooth with quadratic curves through midpoints.
  for (let i = 2; i < points.length - 2; i += 2) {
    const mx = (points[i] + points[i + 2]) / 2;
    const my = (points[i + 1] + points[i + 3]) / 2;
    p.quadraticCurveTo(points[i], points[i + 1], mx, my);
  }
  p.lineTo(points[points.length - 2], points[points.length - 1]);
  return p;
}

function drawStroke(ctx: CanvasRenderingContext2D, s: Stroke) {
  const path = strokePath(s.points);
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (s.halo) {
    // Purikura-style pen: a white glow around the line.
    ctx.lineWidth = s.width * 2;
    ctx.strokeStyle = "rgba(255,255,255,0.95)";
    ctx.stroke(path);
  }
  ctx.lineWidth = s.width;
  ctx.strokeStyle = s.color;
  ctx.stroke(path);
  ctx.restore();
}

/** A new sticker near the middle of the strip, slightly tilted, so it reads as hand-placed. */
export function placeSticker(kind: StickerKind, width: number, height: number, size: number): PlacedSticker {
  return {
    id: newId(),
    kind,
    x: width * (0.5 + (Math.random() - 0.5) * 0.3),
    y: height * (0.35 + Math.random() * 0.3),
    size,
    rotation: (Math.random() - 0.5) * 0.5,
  };
}

/** Topmost sticker under (x, y), or -1. Stickers are treated as circles for hit-testing. */
export function hitSticker(deco: Decorations, x: number, y: number) {
  for (let i = deco.stickers.length - 1; i >= 0; i--) {
    const s = deco.stickers[i];
    if (Math.hypot(x - s.x, y - s.y) < s.size * 0.55) return i;
  }
  return -1;
}

/** Where the resize/rotate handle sits for a sticker. */
export function handlePos(s: PlacedSticker) {
  const d = s.size * 0.62;
  const a = s.rotation + Math.PI / 4;
  return { x: s.x + Math.cos(a) * d, y: s.y + Math.sin(a) * d };
}
