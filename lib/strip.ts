import { applyFilter, type Filter } from "./filters";

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

/** Every photo is captured at this size (4:3), so the preview and the export always match. */
export const PHOTO_W = 1200;
export const PHOTO_H = 900;

/** Crops the video to 4:3 from the center, mirrors it if needed, applies the filter, and returns the result. */
export function capturePhoto(video: HTMLVideoElement, filter: Filter, mirror: boolean): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = PHOTO_W;
  canvas.height = PHOTO_H;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas is not supported in this browser.");

  const vw = video.videoWidth;
  const vh = video.videoHeight;
  const target = PHOTO_W / PHOTO_H;
  let sw = vw;
  let sh = vh;
  if (vw / vh > target) sw = vh * target;
  else sh = vw / target;
  const sx = (vw - sw) / 2;
  const sy = (vh - sh) / 2;

  if (mirror) {
    ctx.translate(PHOTO_W, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(video, sx, sy, sw, sh, 0, 0, PHOTO_W, PHOTO_H);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  applyFilter(ctx, PHOTO_W, PHOTO_H, filter);
  return canvas;
}

export type StripOptions = {
  layout: Layout;
  frame: Frame;
  shots: readonly (HTMLCanvasElement | null)[];
  caption: string;
  showDate: boolean;
  /** Font families as resolved by next/font. */
  fonts: { display: string; body: string };
};

/**
 * Draws the finished strip. The on-screen preview and the downloaded file both
 * come from this function, so what you see is exactly what you get.
 */
export function drawStrip(canvas: HTMLCanvasElement, opts: StripOptions) {
  const { layout, frame, shots, caption, showDate, fonts } = opts;
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

  for (let i = 0; i < shotCount(layout); i++) {
    const col = i % layout.cols;
    const row = Math.floor(i / layout.cols);
    const x = pad + col * (cellW + gap);
    const y = pad + row * (cellH + gap);
    const shot = shots[i];
    if (shot) {
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
  }

  const footerTop = height - footer;
  ctx.fillStyle = frame.ink;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const title = caption.trim() || "The Snap Room";
  const titleSize = Math.round(footer * 0.3);
  ctx.font = `italic 400 ${titleSize}px ${fonts.display}`;
  const maxTextW = width - pad * 2;
  ctx.fillText(title, width / 2, footerTop + footer * (showDate ? 0.4 : 0.5), maxTextW);

  if (showDate) {
    const date = new Date()
      .toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
      .toUpperCase();
    ctx.globalAlpha = 0.6;
    ctx.font = `600 ${Math.round(footer * 0.1)}px ${fonts.body}`;
    if ("letterSpacing" in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = "4px";
    ctx.fillText(date, width / 2, footerTop + footer * 0.7, maxTextW);
    if ("letterSpacing" in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = "0px";
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
