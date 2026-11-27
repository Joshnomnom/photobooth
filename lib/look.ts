/**
 * Film look pipeline, applied to each photo at capture time.
 *
 * Order: drift → color ops → vignette → halation → grain.
 * See docs/research/04-technical.md for the reasoning behind each step.
 * Everything is plain canvas 2D + pixel loops (no ctx.filter), so it works in Safari.
 */

import { compileOps, type Filter, type LookParams } from "./filters";
import { rng } from "./random";

export const DEFAULT_LOOK: LookParams = {
  grain: 0.09,
  vignette: 0.32,
  halation: 0.3,
  drift: 0.05,
  leak: 0,
  flash: 0,
  soften: 0,
  chroma: 0,
  scanlines: 0,
  edgeBlur: 0,
  dither: 0,
};

export const lookFor = (filter: Filter): LookParams => ({ ...DEFAULT_LOOK, ...filter.look });

/** Every photo is captured at this size (4:3), so preview and export always match. */
export const PHOTO_W = 1200;
export const PHOTO_H = 900;

export type Shot = { canvas: HTMLCanvasElement; thumb: string };

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);

/** Crops the video to 4:3 (center), mirrors if asked, and develops it with the film look. */
export function capturePhoto(video: HTMLVideoElement, filter: Filter, mirror: boolean, seed: number): Shot {
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

  if (mirror) {
    ctx.translate(PHOTO_W, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(video, (vw - sw) / 2, (vh - sh) / 2, sw, sh, 0, 0, PHOTO_W, PHOTO_H);
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  develop(canvas, ctx, filter, seed);
  return { canvas, thumb: makeThumb(canvas) };
}

/** Applies the full film look to whatever is on the canvas (used for captures and the setup preview). */
export function develop(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, filter: Filter, seed: number) {
  const { width: w, height: h } = canvas;
  const look = lookFor(filter);
  const rand = rng(seed);

  // 1. Per-shot drift: slight exposure + white balance change, so a strip feels shot, not filtered.
  const exposure = 1 + (rand() * 2 - 1) * look.drift;
  const warmth = (rand() * 2 - 1) * look.drift * 0.6;
  const pre = [exposure * (1 + warmth), exposure, exposure * (1 - warmth)];
  const matrices = compileOps(filter.ops);

  // 1b. Softness: a low-resolution round trip (VHS tape, cheap lenses).
  if (look.soften > 0) soften(canvas, ctx, look.soften);

  // 2 + 3. Color ops and vignette in one pass.
  const image = ctx.getImageData(0, 0, w, h);
  const d = image.data;
  const cx = w / 2;
  const cy = h / 2;
  const maxR = Math.hypot(cx, cy);
  const vig = look.vignette * (0.85 + rand() * 0.3);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      let r = clamp01((d[i] / 255) * pre[0]);
      let g = clamp01((d[i + 1] / 255) * pre[1]);
      let b = clamp01((d[i + 2] / 255) * pre[2]);
      for (const m of matrices) {
        const nr = clamp01(m[0] * r + m[1] * g + m[2] * b + m[3]);
        const ng = clamp01(m[4] * r + m[5] * g + m[6] * b + m[7]);
        const nb = clamp01(m[8] * r + m[9] * g + m[10] * b + m[11]);
        r = nr;
        g = ng;
        b = nb;
      }
      if (vig > 0 || look.flash > 0) {
        const dist = Math.hypot(x - cx, y - cy) / maxR;
        const t = clamp01((dist - 0.35) / 0.65);
        const k = (1 - vig * t * t * (3 - 2 * t)) * (1 + look.flash * Math.max(0, 1 - dist * 1.6));
        r *= k;
        g *= k;
        b *= k;
      }
      d[i] = r * 255;
      d[i + 1] = g * 255;
      d[i + 2] = b * 255;
    }
  }
  ctx.putImageData(image, 0, 0);

  // 3b. Video artifacts: color bleed and scanlines.
  if (look.chroma > 0 || look.scanlines > 0) videoArtifacts(ctx, w, h, look.chroma, look.scanlines);

  // 4. Halation: bright areas → blurred warm glow, screened back on top.
  if (look.halation > 0) addHalation(canvas, ctx, look.halation);

  // 4b. Light leak: a warm blob bleeding in from an edge, on some frames only.
  if (look.leak > 0 && rand() < look.leak) addLightLeak(ctx, w, h, rand);

  // 4c. Old-lens edge blur: sharp center, soft swirl toward the corners.
  if (look.edgeBlur > 0) addEdgeBlur(canvas, ctx, look.edgeBlur);

  // 5. Grain last, so it sits on top. Monochrome, strongest in shadows/midtones.
  if (look.grain > 0) {
    const img = ctx.getImageData(0, 0, w, h);
    const p = img.data;
    const amount = look.grain * 255;
    for (let i = 0; i < p.length; i += 4) {
      const l = (0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2]) / 255;
      const weight = 1 - 0.85 * l * l;
      const n = (rand() + rand() - 1) * amount * weight;
      p[i] += n;
      p[i + 1] += n;
      p[i + 2] += n;
    }
    ctx.putImageData(img, 0, 0);
  }

  // 6. Thermal printers can only print black dots.
  if (look.dither >= 0.5) dither1bit(ctx, w, h);
}

function soften(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, amount: number) {
  const { width: w, height: h } = canvas;
  const f = 1 + amount * 3;
  const t = document.createElement("canvas");
  t.width = Math.max(1, Math.round(w / f));
  t.height = Math.max(1, Math.round(h / f));
  const tctx = t.getContext("2d");
  if (!tctx) return;
  tctx.imageSmoothingQuality = "high";
  tctx.drawImage(canvas, 0, 0, t.width, t.height);
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(t, 0, 0, w, h);
  ctx.restore();
}

function videoArtifacts(ctx: CanvasRenderingContext2D, w: number, h: number, chroma: number, scanlines: number) {
  const img = ctx.getImageData(0, 0, w, h);
  const src = new Uint8ClampedArray(img.data);
  const d = img.data;
  const o = Math.round(chroma * 6);
  const dark = 1 - scanlines * 0.35;
  for (let y = 0; y < h; y++) {
    const k = y % 4 < 2 ? dark : 1;
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const xr = Math.min(w - 1, x + o);
      const xb = Math.max(0, x - o);
      d[i] = src[(y * w + xr) * 4] * k;
      d[i + 1] = src[i + 1] * k;
      d[i + 2] = src[(y * w + xb) * 4 + 2] * k;
    }
  }
  ctx.putImageData(img, 0, 0);
}

function addEdgeBlur(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, strength: number) {
  const { width: w, height: h } = canvas;
  const t = document.createElement("canvas");
  t.width = w;
  t.height = h;
  const tctx = t.getContext("2d");
  if (!tctx) return;
  // Blurred copy via a small round trip, then keep it only toward the edges.
  const s = document.createElement("canvas");
  s.width = Math.max(1, Math.round(w / 12));
  s.height = Math.max(1, Math.round(h / 12));
  s.getContext("2d")?.drawImage(canvas, 0, 0, s.width, s.height);
  tctx.imageSmoothingQuality = "high";
  tctx.drawImage(s, 0, 0, w, h);
  const g = tctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.25, w / 2, h / 2, Math.hypot(w, h) / 2);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, `rgba(0,0,0,${Math.min(1, strength)})`);
  tctx.globalCompositeOperation = "destination-in";
  tctx.fillStyle = g;
  tctx.fillRect(0, 0, w, h);
  ctx.drawImage(t, 0, 0);
}

/** 1-bit Floyd–Steinberg dither: thermal-printer black on paper white. */
function dither1bit(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const lum = new Float32Array(w * h);
  for (let p = 0; p < w * h; p++) lum[p] = 0.299 * d[p * 4] + 0.587 * d[p * 4 + 1] + 0.114 * d[p * 4 + 2];
  const INK = [34, 33, 31];
  const PAPER = [243, 241, 234];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = y * w + x;
      const old = lum[p];
      const on = old < 128;
      const err = old - (on ? 0 : 255);
      const c = on ? INK : PAPER;
      d[p * 4] = c[0];
      d[p * 4 + 1] = c[1];
      d[p * 4 + 2] = c[2];
      if (x + 1 < w) lum[p + 1] += (err * 7) / 16;
      if (y + 1 < h) {
        if (x > 0) lum[p + w - 1] += (err * 3) / 16;
        lum[p + w] += (err * 5) / 16;
        if (x + 1 < w) lum[p + w + 1] += err / 16;
      }
    }
  }
  ctx.putImageData(img, 0, 0);
}

function addHalation(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, strength: number) {
  const { width: w, height: h } = canvas;
  const sw = Math.round(w / 8);
  const sh = Math.round(h / 8);
  const small = document.createElement("canvas");
  small.width = sw;
  small.height = sh;
  const sctx = small.getContext("2d", { willReadFrequently: true });
  if (!sctx) return;
  sctx.drawImage(canvas, 0, 0, sw, sh);
  const img = sctx.getImageData(0, 0, sw, sh);
  const p = img.data;
  for (let i = 0; i < p.length; i += 4) {
    const l = (0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2]) / 255;
    const b = clamp01((l - 0.7) / 0.3);
    p[i] = 255 * b;
    p[i + 1] = 255 * b * 0.42;
    p[i + 2] = 255 * b * 0.22;
  }
  sctx.putImageData(img, 0, 0);

  // A second, much smaller copy gives a wide soft glow when upscaled.
  const tiny = document.createElement("canvas");
  tiny.width = Math.max(1, Math.round(sw / 4));
  tiny.height = Math.max(1, Math.round(sh / 4));
  const tctx = tiny.getContext("2d");
  tctx?.drawImage(small, 0, 0, tiny.width, tiny.height);

  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.globalAlpha = strength * 0.7;
  ctx.drawImage(small, 0, 0, w, h);
  ctx.globalAlpha = strength;
  ctx.drawImage(tiny, 0, 0, w, h);
  ctx.restore();
}

function addLightLeak(ctx: CanvasRenderingContext2D, w: number, h: number, rand: () => number) {
  const fromLeft = rand() < 0.5;
  const x = fromLeft ? -w * 0.05 : w * 1.05;
  const y = h * (0.15 + rand() * 0.7);
  const r = w * (0.45 + rand() * 0.35);
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, "rgba(255,190,110,0.95)");
  g.addColorStop(0.35, "rgba(255,105,45,0.6)");
  g.addColorStop(1, "rgba(255,60,20,0)");
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = 0.35 + rand() * 0.35;
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

function makeThumb(source: HTMLCanvasElement) {
  const c = document.createElement("canvas");
  c.width = 240;
  c.height = 180;
  c.getContext("2d")?.drawImage(source, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.8);
}
