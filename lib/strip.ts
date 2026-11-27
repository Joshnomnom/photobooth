import { PHOTO_H, PHOTO_W } from "./look";
import { rng } from "./random";

export type Layout = { id: string; name: string; cols: number; rows: number };

export const LAYOUTS: readonly Layout[] = [
  { id: "strip-3", name: "Strip · 3", cols: 1, rows: 3 },
  { id: "strip-4", name: "Strip · 4", cols: 1, rows: 4 },
  { id: "grid-4", name: "Grid · 4", cols: 2, rows: 2 },
  { id: "grid-6", name: "Grid · 6", cols: 2, rows: 3 },
];

export const shotCount = (layout: Layout) => layout.cols * layout.rows;

export type Frame = {
  id: string;
  name: string;
  /** Strip background. */
  paper: string;
  /** Caption and placeholder text. */
  ink: string;
  /** Empty-slot fill. */
  slot: string;
};

export const FRAMES: readonly Frame[] = [
  { id: "paper", name: "Paper", paper: "#fbf8f2", ink: "#1c1a17", slot: "#ebe5da" },
  { id: "noir", name: "Noir", paper: "#151413", ink: "#f3eee6", slot: "#2a2826" },
  { id: "tomato", name: "Tomato", paper: "#e5482f", ink: "#fff6ef", slot: "#c93b25" },
  { id: "butter", name: "Butter", paper: "#f5d76e", ink: "#2b2414", slot: "#e6c75c" },
  { id: "sky", name: "Sky", paper: "#bcd9ee", ink: "#14283a", slot: "#a7c8e0" },
  { id: "sage", name: "Sage", paper: "#c9dbc6", ink: "#1b2b1d", slot: "#b4caae" },
];

/** Color of a photo that hasn't developed yet: murky grey-green, like fresh print paper. */
const UNDEVELOPED = "#a9a596";

export type StripOptions = {
  layout: Layout;
  frame: Frame;
  shots: readonly (HTMLCanvasElement | null)[];
  caption: string;
  showDate: boolean;
  /** Font families as resolved by next/font. */
  fonts: { display: string; body: string };
  /** Draw photo slots as blank, undeveloped paper (used for the print animation). */
  undeveloped?: boolean;
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

/**
 * Draws the finished strip. The on-screen preview, the print animation and
 * the downloaded file all come from this function, so they always match.
 */
export function drawStrip(canvas: HTMLCanvasElement, opts: StripOptions) {
  const { layout, frame, shots, caption, showDate, fonts, undeveloped } = opts;
  const cellW = layout.cols === 1 ? 900 : 720;
  const cellH = (cellW * PHOTO_H) / PHOTO_W;
  const pad = Math.round(cellW * 0.07);
  const gap = Math.round(cellW * 0.035);
  const footer = Math.round(cellW * (layout.cols === 1 ? 0.26 : 0.36));

  const width = pad * 2 + layout.cols * cellW + (layout.cols - 1) * gap;
  const height = pad + layout.rows * cellH + (layout.rows - 1) * gap + footer;
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.fillStyle = frame.paper;
  ctx.fillRect(0, 0, width, height);
  const pattern = ctx.createPattern(getPaperTile(), "repeat");
  if (pattern) {
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, width, height);
  }

  for (let i = 0; i < shotCount(layout); i++) {
    const col = i % layout.cols;
    const row = Math.floor(i / layout.cols);
    const x = pad + col * (cellW + gap);
    const y = pad + row * (cellH + gap);
    const shot = shots[i];
    if (undeveloped) {
      ctx.fillStyle = UNDEVELOPED;
      ctx.fillRect(x, y, cellW, cellH);
    } else if (shot) {
      ctx.drawImage(shot, x, y, cellW, cellH);
    } else {
      ctx.fillStyle = frame.slot;
      ctx.fillRect(x, y, cellW, cellH);
      ctx.fillStyle = frame.ink;
      ctx.globalAlpha = 0.35;
      ctx.font = `400 ${Math.round(cellH * 0.28)}px ${fonts.display}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(i + 1), x + cellW / 2, y + cellH / 2);
      ctx.globalAlpha = 1;
    }
    // A soft edge where the photo meets the paper.
    ctx.strokeStyle = "rgba(0,0,0,0.14)";
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, cellW - 2, cellH - 2);
  }

  const footerTop = height - footer;
  ctx.fillStyle = frame.ink;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const title = caption.trim() || "The Snap Room";
  ctx.font = `italic 400 ${Math.round(footer * 0.3)}px ${fonts.display}`;
  const maxTextW = width - pad * 2;
  ctx.fillText(title, width / 2, footerTop + footer * (showDate ? 0.4 : 0.5), maxTextW);

  if (showDate) {
    const date = new Date()
      .toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
      .toUpperCase();
    ctx.globalAlpha = 0.6;
    ctx.font = `600 ${Math.round(footer * 0.1)}px ${fonts.body}`;
    const spaced = ctx as CanvasRenderingContext2D & { letterSpacing?: string };
    if ("letterSpacing" in spaced) spaced.letterSpacing = "4px";
    ctx.fillText(date, width / 2, footerTop + footer * 0.7, maxTextW);
    if ("letterSpacing" in spaced) spaced.letterSpacing = "0px";
    ctx.globalAlpha = 1;
  }
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
