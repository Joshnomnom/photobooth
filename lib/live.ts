/**
 * Live strips (Phase 7): the booth grabs small frames around each shot, then
 * we develop them with the real film look and play them inside the strip.
 *
 * Frames are grabbed from the camera into canvases (no MediaRecorder needed
 * to capture), so it works the same in every browser. Exports:
 * - a live strip video (canvas → MediaRecorder; MP4 where supported, else WebM)
 * - a boomerang GIF (our own encoder)
 */

import { drawDecorations } from "./decorations";
import type { Filter } from "./filters";
import { encodeGif } from "./gif";
import { develop } from "./look";
import { drawCover, drawStrip, type StripOptions, windowPath } from "./strip";

export const CLIP_FPS = 12;
const CLIP_W = 480;
const CLIP_H = 360;
const MAX_FRAMES = 24;

/** Starts grabbing small 4:3 frames from the camera. Call the returned function to stop and get them. */
export function startClip(video: HTMLVideoElement, mirror: boolean): () => HTMLCanvasElement[] {
  const frames: HTMLCanvasElement[] = [];
  const grab = () => {
    if (frames.length >= MAX_FRAMES || video.readyState < 2) return;
    const c = document.createElement("canvas");
    c.width = CLIP_W;
    c.height = CLIP_H;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    let sw = vw;
    let sh = vh;
    if (vw / vh > CLIP_W / CLIP_H) sw = (vh * CLIP_W) / CLIP_H;
    else sh = (vw * CLIP_H) / CLIP_W;
    if (mirror) {
      ctx.translate(CLIP_W, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, (vw - sw) / 2, (vh - sh) / 2, sw, sh, 0, 0, CLIP_W, CLIP_H);
    frames.push(c);
  };
  grab();
  const id = window.setInterval(grab, 1000 / CLIP_FPS);
  return () => {
    window.clearInterval(id);
    return frames;
  };
}

export const hasClips = (clips: readonly (HTMLCanvasElement[] | undefined)[]) => clips.some((c) => c && c.length > 1);

/** Develops every clip frame with the film look, so motion matches the stills (grain, tone, dither…). */
function developClips(clips: readonly (HTMLCanvasElement[] | undefined)[], filter: Filter, seed: number) {
  return clips.map((clip, slot) =>
    (clip ?? []).map((f) => {
      const c = document.createElement("canvas");
      c.width = f.width;
      c.height = f.height;
      const ctx = c.getContext("2d", { willReadFrequently: true });
      if (!ctx) return f;
      ctx.drawImage(f, 0, 0);
      develop(c, ctx, filter, (seed + slot * 7919) >>> 0);
      return c;
    }),
  );
}

type LiveInput = {
  strip: StripOptions;
  clips: readonly (HTMLCanvasElement[] | undefined)[];
  filter: Filter;
  seed: number;
};

/**
 * Builds a function that draws frame `t` of the live strip at `scale`.
 * Each photo plays its clip forward and back (a boomerang); stickers stay on top.
 */
async function buildRenderer({ strip, clips, filter, seed }: LiveInput, maxSide: number) {
  await document.fonts?.ready;
  const base = document.createElement("canvas");
  const geo = drawStrip(base, { ...strip, decorations: undefined });
  if (!geo) throw new Error("Canvas is not supported");
  const frames = developClips(clips, filter, seed);
  const len = Math.max(2, ...frames.map((f) => f.length));
  const cycle = len * 2 - 2; // forward then back, without repeating the ends
  const scale = Math.min(1, maxSide / Math.max(base.width, base.height));
  // Even dimensions keep video encoders happy.
  const width = Math.max(2, Math.round((base.width * scale) / 2) * 2);
  const height = Math.max(2, Math.round((base.height * scale) / 2) * 2);
  const out = document.createElement("canvas");
  out.width = width;
  out.height = height;
  const ctx = out.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas is not supported");

  const draw = (t: number) => {
    const step = t % cycle;
    const idx = step < len ? step : cycle - step;
    ctx.save();
    ctx.scale(width / base.width, height / base.height);
    ctx.drawImage(base, 0, 0);
    geo.windows.forEach((w, i) => {
      const clip = frames[i];
      const still = strip.shots[i];
      const src = clip && clip.length ? clip[Math.min(idx, clip.length - 1)] : still;
      if (!src) return;
      ctx.save();
      windowPath(ctx, geo.shape, w.x, w.y, w.w, w.h, geo.radius);
      ctx.clip();
      drawCover(ctx, src, w.x, w.y, w.w, w.h);
      ctx.restore();
    });
    if (strip.decorations) drawDecorations(ctx, strip.decorations, strip.fonts);
    ctx.restore();
  };
  return { out, ctx, draw, cycle, width, height };
}

function pickMime() {
  if (typeof MediaRecorder === "undefined") return null;
  const options = ["video/mp4;codecs=avc1", "video/mp4", "video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];
  return options.find((m) => MediaRecorder.isTypeSupported(m)) ?? null;
}

export const canRecordVideo = () =>
  typeof document !== "undefined" && pickMime() !== null && typeof HTMLCanvasElement.prototype.captureStream === "function";

/** Records the live strip as a looping video (two boomerang cycles). */
export async function renderLiveVideo(input: LiveInput): Promise<{ blob: Blob; ext: string }> {
  const mime = pickMime();
  if (!mime) throw new Error("Video recording isn't supported in this browser");
  const r = await buildRenderer(input, 1600);
  r.draw(0);
  const stream = r.out.captureStream(CLIP_FPS);
  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 6_000_000 });
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => {
    if (e.data.size) chunks.push(e.data);
  };
  const done = new Promise<void>((resolve) => (rec.onstop = () => resolve()));
  rec.start();
  const total = r.cycle * 2;
  for (let t = 0; t < total; t++) {
    r.draw(t);
    await new Promise((res) => setTimeout(res, 1000 / CLIP_FPS));
  }
  rec.stop();
  await done;
  stream.getTracks().forEach((tr) => tr.stop());
  const type = mime.split(";")[0];
  return { blob: new Blob(chunks, { type }), ext: type === "video/mp4" ? "mp4" : "webm" };
}

/** A small looping boomerang GIF of the whole strip. */
export async function renderBoomerangGif(input: LiveInput): Promise<Blob> {
  // Small enough to send in a chat (big GIFs load slowly).
  const r = await buildRenderer(input, 440);
  const frames: ImageData[] = [];
  for (let t = 0; t < r.cycle; t++) {
    r.draw(t);
    frames.push(r.ctx.getImageData(0, 0, r.width, r.height));
  }
  return encodeGif(frames, Math.round(100 / CLIP_FPS));
}
