import { type Decorations, drawDecorations } from "./decorations";
import type { FontKey, Fonts } from "./fonts";
import { PHOTO_H, PHOTO_W } from "./look";
import type { Paper, StripStyle } from "./machines";
import { rng } from "./random";
import { drawSevenSeg, stampText, textWidth } from "./sevenSeg";

export type Layout = { id: string; name: string; cols: number; rows: number };

export const LAYOUTS: readonly Layout[] = [
  { id: "strip-3", name: "Strip · 3", cols: 1, rows: 3 },
  { id: "strip-4", name: "Strip · 4", cols: 1, rows: 4 },
  { id: "grid-4", name: "Grid · 4", cols: 2, rows: 2 },
  { id: "grid-6", name: "Grid · 6", cols: 2, rows: 3 },
];

export const layoutById = (id: string) => LAYOUTS.find((l) => l.id === id) ?? LAYOUTS[0];
export const shotCount = (layout: Layout) => layout.cols * layout.rows;

/** Color of a photo that hasn't developed yet: murky grey-green, like fresh print paper. */
const UNDEVELOPED = "#a9a596";

const WEIGHT: Record<FontKey, number> = { display: 400, body: 700, typewriter: 700, groovy: 400, rounded: 700 };

export type StripOptions = {
  layout: Layout;
  paper: Paper;
  style: StripStyle;
  shots: readonly (HTMLCanvasElement | null)[];
  caption: string;
  showDate: boolean;
  fonts: Fonts;
  /** Seeds decoration placement so it stays put between redraws. */
  seed: number;
  /** Draw photo slots as blank, undeveloped paper (used for the print animation). */
  undeveloped?: boolean;
  /** Stickers and pen strokes from the decorate step, drawn on top. */
  decorations?: Decorations;
};

let paperTile: HTMLCanvasElement | null = null;

/** A small tile of light and dark specks that gives the strip a paper feel on any color. */
function getPaperTile() {
  if (paperTile) return paperTile;
  const size = 160;
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d");
  if (!ctx) return c;
  const img = ctx.createImageData(size, size);
  const rand = rng(1925);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = rand() > 0.5 ? 255 : 0;
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = rand() * 22;
  }
  ctx.putImageData(img, 0, 0);
  paperTile = c;
  return c;
}

function roundedPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  if (r > 0 && ctx.roundRect) ctx.roundRect(x, y, w, h, r);
  else ctx.rect(x, y, w, h);
}

type Rect = { x: number; y: number; w: number; h: number };

/**
 * Draws the finished strip. The on-screen preview, the print animation and
 * the downloaded file all come from this function, so they always match.
 */
export function drawStrip(canvas: HTMLCanvasElement, opts: StripOptions) {
  const { layout, paper, style, shots, caption, showDate, fonts, undeveloped, seed } = opts;
  const cellW = layout.cols === 1 ? 900 : 720;
  const cellH = (cellW * PHOTO_H) / PHOTO_W;
  const pad = Math.round(cellW * 0.07);
  const gap = Math.round(cellW * 0.035);
  const footer = Math.round(cellW * style.footer * (layout.cols === 1 ? 1 : 1.35));
  const radius = style.photoRadius * cellW;

  const width = pad * 2 + layout.cols * cellW + (layout.cols - 1) * gap;
  const height = pad + layout.rows * cellH + (layout.rows - 1) * gap + footer;
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.fillStyle = paper.paper;
  ctx.fillRect(0, 0, width, height);
  const pattern = ctx.createPattern(getPaperTile(), "repeat");
  if (pattern) {
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, width, height);
  }

  const photos: Rect[] = [];
  for (let i = 0; i < shotCount(layout); i++) {
    const col = i % layout.cols;
    const row = Math.floor(i / layout.cols);
    const x = pad + col * (cellW + gap);
    const y = pad + row * (cellH + gap);
    photos.push({ x, y, w: cellW, h: cellH });
    const shot = shots[i];

    ctx.save();
    roundedPath(ctx, x, y, cellW, cellH, radius);
    ctx.clip();
    if (undeveloped) {
      ctx.fillStyle = UNDEVELOPED;
      ctx.fillRect(x, y, cellW, cellH);
    } else if (shot) {
      ctx.drawImage(shot, x, y, cellW, cellH);
      if (showDate && style.date === "stamp") drawDateStamp(ctx, x, y, cellW, cellH);
    } else {
      ctx.fillStyle = paper.slot;
      ctx.fillRect(x, y, cellW, cellH);
      ctx.fillStyle = paper.ink;
      ctx.globalAlpha = 0.35;
      ctx.font = `400 ${Math.round(cellH * 0.28)}px ${fonts.display}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(i + 1), x + cellW / 2, y + cellH / 2);
    }
    ctx.restore();

    // A soft edge where the photo meets the paper.
    ctx.strokeStyle = "rgba(0,0,0,0.14)";
    ctx.lineWidth = 2;
    roundedPath(ctx, x + 1, y + 1, cellW - 2, cellH - 2, radius);
    ctx.stroke();
  }

  if (style.decorations === "sparkles") drawSparkles(ctx, width, height, photos, pad, paper.ink, seed);

  // Footer: caption, then the date if it isn't stamped on the photos.
  const footerTop = height - footer;
  const dateInFooter = showDate && style.date === "footer";
  const maxTextW = width - pad * 2;
  const spaced = ctx as CanvasRenderingContext2D & { letterSpacing?: string };
  const setSpacing = (v: string) => {
    if ("letterSpacing" in spaced) spaced.letterSpacing = v;
  };

  let title = caption.trim() || style.defaultCaption;
  if (style.captionUpper) title = title.toUpperCase();
  const size = Math.round(footer * style.captionScale);
  ctx.font = `${style.captionItalic ? "italic " : ""}${WEIGHT[style.captionFont]} ${size}px ${fonts[style.captionFont]}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  setSpacing(style.captionUpper ? `${Math.round(size * 0.12)}px` : "0px");
  const ty = footerTop + footer * (dateInFooter ? 0.42 : 0.5);
  if (style.captionOutline) {
    ctx.lineJoin = "round";
    ctx.lineWidth = size * 0.22;
    ctx.strokeStyle = style.captionOutline;
    ctx.strokeText(title, width / 2, ty, maxTextW);
  }
  ctx.fillStyle = paper.ink;
  ctx.fillText(title, width / 2, ty, maxTextW);

  if (dateInFooter) {
    const date = new Date()
      .toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
      .toUpperCase();
    ctx.globalAlpha = 0.65;
    ctx.font = `600 ${Math.round(footer * 0.11)}px ${fonts[style.dateFont]}`;
    setSpacing("4px");
    ctx.fillText(date, width / 2, footerTop + footer * 0.74, maxTextW);
    ctx.globalAlpha = 1;
  }
  setSpacing("0px");

  if (opts.decorations) drawDecorations(ctx, opts.decorations, fonts);
}

/** Orange seven-segment date, burned into the bottom-right of a photo. */
function drawDateStamp(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  const text = stampText();
  const digitH = h * 0.075;
  const unit = digitH / 18;
  const tw = textWidth(text) * unit;
  ctx.save();
  ctx.fillStyle = "#ff8a2a";
  ctx.shadowColor = "rgba(255,110,20,0.85)";
  ctx.shadowBlur = unit * 4;
  ctx.globalAlpha = 0.92;
  drawSevenSeg(ctx, text, x + w - tw - w * 0.05, y + h - digitH - h * 0.06, unit);
  ctx.restore();
}

/** Stars, hearts and sparkles scattered on the paper, never over a photo. */
function drawSparkles(ctx: CanvasRenderingContext2D, w: number, h: number, photos: Rect[], pad: number, ink: string, seed: number) {
  const rand = rng(seed ^ 0x51ab);
  const target = 8 + photos.length * 3;
  let placed = 0;
  for (let tries = 0; tries < 400 && placed < target; tries++) {
    const size = pad * (0.35 + rand() * 0.45);
    const x = rand() * w;
    const y = rand() * h;
    const m = size * 0.7;
    const overlaps = photos.some((p) => x > p.x - m && x < p.x + p.w + m && y > p.y - m && y < p.y + p.h + m);
    if (overlaps || x < m || y < m || x > w - m || y > h - m) continue;
    const kind = Math.floor(rand() * 4);
    ctx.fillStyle = rand() < 0.55 ? ink : "#ffffff";
    ctx.globalAlpha = 0.85;
    if (kind === 0) star(ctx, x, y, size / 2);
    else if (kind === 1) heart(ctx, x, y, size / 2);
    else if (kind === 2) sparkle(ctx, x, y, size / 2);
    else {
      ctx.beginPath();
      ctx.arc(x, y, size * 0.14, 0, Math.PI * 2);
      ctx.fill();
    }
    placed++;
  }
  ctx.globalAlpha = 1;
}

function star(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (Math.PI / 5) * i - Math.PI / 2;
    const rr = i % 2 ? r * 0.45 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
}

function sparkle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (Math.PI / 4) * i - Math.PI / 2;
    const rr = i % 2 ? r * 0.18 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
}

function heart(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x, y + r * 0.8);
  ctx.bezierCurveTo(x - r * 1.2, y, x - r * 0.7, y - r * 0.9, x, y - r * 0.35);
  ctx.bezierCurveTo(x + r * 0.7, y - r * 0.9, x + r * 1.2, y, x, y + r * 0.8);
  ctx.fill();
}

export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Couldn't export the image."))), "image/png"),
  );
}

export function stripFilename() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `snap-room-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}.png`;
}
