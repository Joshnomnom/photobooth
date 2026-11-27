/**
 * Ready-to-post formats (Phase 7): the finished strip placed on a styled
 * background, sized for where it's going. Research: docs/research/07-user-outcomes.md.
 * Safe zones keep the strip clear of app UI (Story top/bottom bars, lock-screen clock).
 */

import type { Machine, Paper } from "./machines";
import { getPaperTile } from "./strip";

export type FormatId = "story" | "post" | "wallpaper";
export type Backdrop = "street" | "curtain" | "paper";

export const FORMATS: Record<FormatId, { name: string; hint: string; w: number; h: number; top: number; bottom: number; side: number }> = {
  story: { name: "Story", hint: "9:16 · Instagram, TikTok", w: 1080, h: 1920, top: 260, bottom: 300, side: 90 },
  post: { name: "Post", hint: "4:5 · feed post", w: 1080, h: 1350, top: 70, bottom: 120, side: 90 },
  wallpaper: { name: "Wallpaper", hint: "Phone lock screen", w: 1170, h: 2532, top: 900, bottom: 330, side: 110 },
};

const images = new Map<string, Promise<HTMLImageElement>>();
function loadImage(src: string) {
  let p = images.get(src);
  if (!p) {
    p = new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
    images.set(src, p);
  }
  return p;
}

function cover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, w: number, h: number) {
  const s = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const dw = img.naturalWidth * s;
  const dh = img.naturalHeight * s;
  ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
}

async function paintBackdrop(ctx: CanvasRenderingContext2D, w: number, h: number, backdrop: Backdrop, machine: Machine, paper: Paper) {
  if (backdrop === "street") {
    cover(ctx, await loadImage("/assets/street-bokeh.webp"), w, h);
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "rgba(10,12,17,0.55)");
    g.addColorStop(0.6, "rgba(10,12,17,0.35)");
    g.addColorStop(1, "rgba(10,12,17,0.8)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  } else if (backdrop === "curtain") {
    // Real velvet, recolored to the machine's curtain (same trick as the booths).
    ctx.fillStyle = machine.exterior.curtain[2];
    ctx.fillRect(0, 0, w, h);
    ctx.save();
    ctx.globalCompositeOperation = "luminosity";
    cover(ctx, await loadImage("/assets/curtain-flat.webp"), w, h);
    ctx.restore();
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "rgba(0,0,0,0.35)");
    g.addColorStop(0.5, "rgba(0,0,0,0.05)");
    g.addColorStop(1, "rgba(0,0,0,0.5)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  } else {
    ctx.fillStyle = paper.paper;
    ctx.fillRect(0, 0, w, h);
    const pattern = ctx.createPattern(getPaperTile(), "repeat");
    if (pattern) {
      ctx.fillStyle = pattern;
      ctx.fillRect(0, 0, w, h);
    }
  }
}

/** Composes the strip into a format. `strip` is the finished strip canvas (decorations included). */
export async function composeFormat(
  strip: HTMLCanvasElement,
  format: FormatId,
  backdrop: Backdrop,
  machine: Machine,
  paper: Paper,
  fonts: { body: string },
): Promise<HTMLCanvasElement> {
  const f = FORMATS[format];
  const c = document.createElement("canvas");
  c.width = f.w;
  c.height = f.h;
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("Canvas is not supported");
  await paintBackdrop(ctx, f.w, f.h, backdrop, machine, paper);

  // Fit the strip inside the safe area, with a little tilt and a soft shadow.
  const boxW = f.w - f.side * 2;
  const boxH = f.h - f.top - f.bottom;
  const s = Math.min(boxW / strip.width, boxH / strip.height) * 0.94;
  const dw = strip.width * s;
  const dh = strip.height * s;
  ctx.save();
  ctx.translate(f.w / 2, f.top + boxH / 2);
  ctx.rotate(-0.025);
  ctx.shadowColor = "rgba(0,0,0,0.45)";
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 18;
  ctx.drawImage(strip, -dw / 2, -dh / 2, dw, dh);
  ctx.restore();

  // A quiet maker's mark, inside the safe area.
  const light = backdrop !== "paper";
  ctx.save();
  ctx.fillStyle = light ? "rgba(255,255,255,0.72)" : paper.ink;
  ctx.globalAlpha = light ? 1 : 0.6;
  ctx.font = `600 ${Math.round(f.w * 0.022)}px ${fonts.body}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const spaced = ctx as CanvasRenderingContext2D & { letterSpacing?: string };
  if ("letterSpacing" in spaced) spaced.letterSpacing = `${Math.round(f.w * 0.006)}px`;
  ctx.fillText(`THE SNAP ROOM  ·  ${machine.year} ${machine.name.toUpperCase()}`, f.w / 2, f.h - f.bottom + f.bottom * 0.35);
  ctx.restore();
  return c;
}
