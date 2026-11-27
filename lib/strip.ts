import { type Decorations, drawDecorations } from "./decorations";
import type { FontKey, Fonts } from "./fonts";
import { PHOTO_H, PHOTO_W } from "./look";
import type { Paper, StripStyle } from "./machines";
import { rng } from "./random";
import { drawSevenSeg, stampText, textWidth } from "./sevenSeg";

export type Layout = { id: string; name: string; cols: number; rows: number };

/** Every layout works with every machine. Vertical strips, wide strips, and grids. */
export const LAYOUTS: readonly Layout[] = [
  { id: "strip-2", name: "Strip · 2", cols: 1, rows: 2 },
  { id: "strip-3", name: "Strip · 3", cols: 1, rows: 3 },
  { id: "strip-4", name: "Strip · 4", cols: 1, rows: 4 },
  { id: "strip-6", name: "Strip · 6", cols: 1, rows: 6 },
  { id: "wide-3", name: "Wide · 3", cols: 3, rows: 1 },
  { id: "wide-4", name: "Wide · 4", cols: 4, rows: 1 },
  { id: "grid-4", name: "Grid · 4", cols: 2, rows: 2 },
  { id: "grid-6", name: "Grid · 6", cols: 2, rows: 3 },
  { id: "grid-6w", name: "Grid · 6 wide", cols: 3, rows: 2 },
  { id: "grid-8", name: "Grid · 8", cols: 2, rows: 4 },
  { id: "grid-9", name: "Grid · 9", cols: 3, rows: 3 },
];

export const layoutById = (id: string) => LAYOUTS.find((l) => l.id === id) ?? LAYOUTS[2];
export const shotCount = (layout: Layout) => layout.cols * layout.rows;

/** Color of a photo that hasn't developed yet: murky grey-green, like fresh print paper. */
const UNDEVELOPED = "#a9a596";

const WEIGHT: Record<FontKey, number> = { display: 400, body: 700, typewriter: 700, groovy: 400, rounded: 700, hand: 600, pixel: 400 };

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
export function getPaperTile() {
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

export type Rect = { x: number; y: number; w: number; h: number };

/** Draws an image so it fills the box, cropping the middle (like CSS object-fit: cover). */
export function drawCover(ctx: CanvasRenderingContext2D, img: CanvasImageSource & { width: number; height: number }, x: number, y: number, w: number, h: number) {
  const target = w / h;
  let sw = img.width;
  let sh = img.height;
  if (sw / sh > target) sw = sh * target;
  else sh = sw / target;
  ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, x, y, w, h);
}

/** Path for one photo window: rectangle (optionally rounded) or oval. */
export function windowPath(ctx: CanvasRenderingContext2D, shape: "rect" | "oval", x: number, y: number, w: number, h: number, r: number) {
  if (shape === "oval") {
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
  } else {
    roundedPath(ctx, x, y, w, h, r);
  }
}

/**
 * Draws the finished strip. The on-screen preview, the darkroom print and
 * the downloaded file all come from this function, so they always match.
 */
/** Where the photo windows ended up, so live strips can animate exactly those areas. */
export type StripGeometry = { windows: Rect[]; shape: "rect" | "oval"; radius: number };

export function drawStrip(canvas: HTMLCanvasElement, opts: StripOptions): StripGeometry | undefined {
  const { layout, paper, style, shots, caption, showDate, fonts, undeveloped, seed } = opts;
  const frame = style.frame ?? "plain";
  const shape = style.photoShape ?? "rect";
  const instant = frame === "instant";
  const receipt = frame === "receipt";

  const cellW = layout.cols === 1 ? 900 : 720;
  // Instant prints: a square photo on its own white card with a thick bottom edge.
  const matSide = instant ? Math.round(cellW * 0.06) : 0;
  const matBottom = instant ? Math.round(cellW * 0.2) : 0;
  const photoW = cellW - matSide * 2;
  const photoH = instant ? photoW : Math.round((photoW * PHOTO_H) / PHOTO_W);
  const cellH = matSide + photoH + matBottom;
  const pad = Math.round(cellW * 0.07);
  const gap = Math.round(cellW * (instant ? 0.05 : 0.035));
  const header = receipt ? Math.round(cellW * 0.26) : 0;
  const footer = Math.round(cellW * style.footer * (layout.cols === 1 ? 1 : 1.35));
  const radius = style.photoRadius * photoW;
  const tooth = receipt ? Math.round(pad * 0.35) : 0;

  const width = pad * 2 + layout.cols * cellW + (layout.cols - 1) * gap;
  const height = pad + header + layout.rows * cellH + (layout.rows - 1) * gap + footer + tooth;
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

  const spaced = ctx as CanvasRenderingContext2D & { letterSpacing?: string };
  const setSpacing = (v: string) => {
    if ("letterSpacing" in spaced) spaced.letterSpacing = v;
  };
  const maxTextW = width - pad * 2;

  if (receipt) drawReceiptHeader(ctx, width, pad + tooth, header, pad, paper.ink, fonts, seed, setSpacing);

  const photos: Rect[] = [];
  const windows: Rect[] = [];
  for (let i = 0; i < shotCount(layout); i++) {
    const col = i % layout.cols;
    const row = Math.floor(i / layout.cols);
    const x = pad + col * (cellW + gap);
    const y = pad + tooth + header + row * (cellH + gap);
    const px = x + matSide;
    const py = y + matSide;
    photos.push({ x, y, w: cellW, h: cellH });
    windows.push({ x: px, y: py, w: photoW, h: photoH });
    const shot = shots[i];

    if (instant) {
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.28)";
      ctx.shadowBlur = 18;
      ctx.shadowOffsetY = 6;
      ctx.fillStyle = "#fbfaf5";
      ctx.fillRect(x, y, cellW, cellH);
      ctx.restore();
    }

    ctx.save();
    windowPath(ctx, shape, px, py, photoW, photoH, radius);
    ctx.clip();
    if (undeveloped) {
      ctx.fillStyle = UNDEVELOPED;
      ctx.fillRect(px, py, photoW, photoH);
    } else if (shot) {
      drawCover(ctx, shot, px, py, photoW, photoH);
      if (showDate && style.date === "stamp") drawDateStamp(ctx, px, py, photoW, photoH);
      if (showDate && style.date === "vhs") drawVhsOverlay(ctx, px, py, photoW, photoH, fonts);
    } else {
      ctx.fillStyle = paper.slot;
      ctx.fillRect(px, py, photoW, photoH);
      ctx.fillStyle = paper.ink;
      ctx.globalAlpha = 0.35;
      ctx.font = `400 ${Math.round(photoH * 0.28)}px ${fonts.display}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(i + 1), px + photoW / 2, py + photoH / 2);
    }
    ctx.restore();

    // A soft edge where the photo meets the paper.
    ctx.strokeStyle = "rgba(0,0,0,0.14)";
    ctx.lineWidth = 2;
    windowPath(ctx, shape, px + 1, py + 1, photoW - 2, photoH - 2, radius);
    ctx.stroke();

    // Victorian mount: a fine double rule around the window.
    if (frame === "ornate") {
      ctx.save();
      ctx.strokeStyle = paper.ink;
      ctx.globalAlpha = 0.6;
      ctx.lineWidth = 3;
      const o1 = photoW * 0.012;
      windowPath(ctx, shape, px - o1, py - o1, photoW + o1 * 2, photoH + o1 * 2, radius + o1);
      ctx.stroke();
      ctx.lineWidth = 1.5;
      const o2 = photoW * 0.026;
      windowPath(ctx, shape, px - o2, py - o2, photoW + o2 * 2, photoH + o2 * 2, radius + o2);
      ctx.stroke();
      ctx.restore();
    }
  }

  if (style.decorations === "sparkles") drawSparkles(ctx, width, height, photos, pad, paper.ink, seed);

  // Footer: caption, then the date if it's printed (not stamped or on-screen).
  const footerTop = height - footer - tooth;
  const dateInFooter = showDate && style.date === "footer";
  let title = caption.trim() || style.defaultCaption;
  if (style.captionUpper) title = title.toUpperCase();
  const size = Math.round(footer * style.captionScale);
  ctx.font = `${style.captionItalic ? "italic " : ""}${WEIGHT[style.captionFont]} ${size}px ${fonts[style.captionFont]}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  setSpacing(style.captionUpper ? `${Math.round(size * 0.12)}px` : "0px");
  const ty = footerTop + footer * (receipt ? 0.24 : dateInFooter ? 0.42 : 0.5);
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
    ctx.font = `600 ${Math.round(footer * (receipt ? 0.075 : 0.11))}px ${fonts[style.dateFont]}`;
    setSpacing("4px");
    ctx.fillText(date, width / 2, footerTop + footer * (receipt ? 0.42 : 0.74), maxTextW);
    ctx.globalAlpha = 1;
  }
  setSpacing("0px");

  if (receipt) {
    drawReceiptFooter(ctx, width, footerTop, footer, pad, paper.ink, seed);
    tearEdges(ctx, width, height, tooth);
  }

  if (opts.decorations) drawDecorations(ctx, opts.decorations, fonts);
  return { windows, shape, radius };
}

/** Receipt header: shop name, receipt number, dashed rule. */
function drawReceiptHeader(
  ctx: CanvasRenderingContext2D,
  width: number,
  top: number,
  header: number,
  pad: number,
  ink: string,
  fonts: Fonts,
  seed: number,
  setSpacing: (v: string) => void,
) {
  ctx.save();
  ctx.fillStyle = ink;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `700 ${Math.round(header * 0.2)}px ${fonts.typewriter}`;
  setSpacing(`${Math.round(header * 0.03)}px`);
  ctx.fillText("THE SNAP ROOM", width / 2, top + header * 0.22);
  ctx.font = `400 ${Math.round(header * 0.1)}px ${fonts.typewriter}`;
  setSpacing("2px");
  const no = String((seed >>> 0) % 10000).padStart(4, "0");
  ctx.fillText(`PHOTO RECEIPT  ·  No. ${no}`, width / 2, top + header * 0.48);
  ctx.fillText("4 POSES  ·  1 STRIP  ·  0.00", width / 2, top + header * 0.64);
  setSpacing("0px");
  dashedRule(ctx, pad, width - pad, top + header * 0.86, ink);
  ctx.restore();
}

/** Receipt footer: dashed rule, barcode. */
function drawReceiptFooter(ctx: CanvasRenderingContext2D, width: number, top: number, footer: number, pad: number, ink: string, seed: number) {
  dashedRule(ctx, pad, width - pad, top + footer * 0.08, ink);
  const rand = rng(seed ^ 0xbadc0de);
  const bw = Math.min(width - pad * 2, footer * 1.6);
  let x = (width - bw) / 2;
  const y = top + footer * 0.56;
  const h = footer * 0.3;
  ctx.save();
  ctx.fillStyle = ink;
  while (x < (width + bw) / 2) {
    const w = (1 + Math.floor(rand() * 3)) * (footer * 0.008);
    if (rand() > 0.35) ctx.fillRect(x, y, w, h);
    x += w + footer * 0.006;
  }
  ctx.restore();
}

function dashedRule(ctx: CanvasRenderingContext2D, x1: number, x2: number, y: number, ink: string) {
  ctx.save();
  ctx.strokeStyle = ink;
  ctx.globalAlpha = 0.6;
  ctx.lineWidth = 3;
  ctx.setLineDash([12, 10]);
  ctx.beginPath();
  ctx.moveTo(x1, y);
  ctx.lineTo(x2, y);
  ctx.stroke();
  ctx.restore();
}

/** Torn paper: zig-zag cut out of the top and bottom edges (transparent in the PNG). */
function tearEdges(ctx: CanvasRenderingContext2D, width: number, height: number, tooth: number) {
  if (tooth <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = "destination-out";
  ctx.beginPath();
  for (let x = 0; x <= width; x += tooth * 2) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x + tooth, tooth);
    ctx.lineTo(x + tooth * 2, 0);
    ctx.moveTo(x, height);
    ctx.lineTo(x + tooth, height - tooth);
    ctx.lineTo(x + tooth * 2, height);
  }
  ctx.fill();
  ctx.restore();
}

/** Camcorder on-screen display: PLAY, tape speed, time and date. */
function drawVhsOverlay(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fonts: Fonts) {
  const size = Math.round(h * 0.085);
  const now = new Date();
  const hh = now.getHours();
  const time = `${hh < 12 ? "AM" : "PM"} ${((hh + 11) % 12) + 1}:${String(now.getMinutes()).padStart(2, "0")}`;
  const date = now
    .toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })
    .toUpperCase()
    .replace(",", "")
    .replace(" ", ".");
  ctx.save();
  ctx.font = `400 ${size}px ${fonts.pixel}`;
  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = "rgba(0,0,0,0.85)";
  ctx.shadowOffsetX = size * 0.06;
  ctx.shadowOffsetY = size * 0.06;
  ctx.textBaseline = "top";
  ctx.textAlign = "left";
  ctx.fillText("PLAY \u25B6", x + w * 0.05, y + h * 0.05);
  ctx.textAlign = "right";
  ctx.fillText("SP", x + w * 0.95, y + h * 0.05);
  ctx.textAlign = "left";
  ctx.textBaseline = "bottom";
  ctx.fillText(time, x + w * 0.05, y + h * 0.95 - size);
  ctx.fillText(date, x + w * 0.05, y + h * 0.95);
  ctx.restore();
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
