/**
 * Flipbook: the session's photos as a looping GIF, each frame framed on the
 * machine's paper with its caption, like flicking through the strip.
 */

import type { Fonts } from "./fonts";
import { encodeGif } from "./gif";
import { PHOTO_H, PHOTO_W } from "./look";
import type { Paper, StripStyle } from "./machines";
import { drawCover } from "./strip";

const PHOTO_OUT_W = 480;
const PHOTO_OUT_H = Math.round((PHOTO_OUT_W * PHOTO_H) / PHOTO_W);
const BORDER = 24;
const FOOTER = 56;

export async function makeFlipbook(shots: HTMLCanvasElement[], paper: Paper, style: StripStyle, caption: string, fonts: Fonts): Promise<Blob> {
  await document.fonts?.ready;
  const photoH = style.frame === "instant" ? PHOTO_OUT_W : PHOTO_OUT_H;
  const w = PHOTO_OUT_W + BORDER * 2;
  const h = photoH + BORDER + FOOTER;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas is not supported");

  let text = caption.trim() || style.defaultCaption;
  if (style.captionUpper) text = text.toUpperCase();
  const radius = style.photoRadius * PHOTO_OUT_W;

  const frames = shots.map((shot, i) => {
    ctx.fillStyle = paper.paper;
    ctx.fillRect(0, 0, w, h);
    ctx.save();
    ctx.beginPath();
    if (style.photoShape === "oval") ctx.ellipse(BORDER + PHOTO_OUT_W / 2, BORDER + photoH / 2, PHOTO_OUT_W / 2, photoH / 2, 0, 0, Math.PI * 2);
    else if (radius > 0 && ctx.roundRect) ctx.roundRect(BORDER, BORDER, PHOTO_OUT_W, photoH, radius);
    else ctx.rect(BORDER, BORDER, PHOTO_OUT_W, photoH);
    ctx.clip();
    drawCover(ctx, shot, BORDER, BORDER, PHOTO_OUT_W, photoH);
    ctx.restore();

    const size = 22;
    ctx.font = `${style.captionItalic ? "italic " : ""}700 ${size}px ${fonts[style.captionFont]}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const y = BORDER + photoH + FOOTER / 2;
    if (style.captionOutline) {
      ctx.lineJoin = "round";
      ctx.lineWidth = 5;
      ctx.strokeStyle = style.captionOutline;
      ctx.strokeText(text, w / 2, y, w - 120);
    }
    ctx.fillStyle = paper.ink;
    ctx.fillText(text, w / 2, y, w - 120);
    // Frame counter, like the numbers on a film strip.
    ctx.globalAlpha = 0.55;
    ctx.font = `600 13px ${fonts.body}`;
    ctx.textAlign = "right";
    ctx.fillText(`${i + 1}/${shots.length}`, w - BORDER, y);
    ctx.globalAlpha = 1;
    return ctx.getImageData(0, 0, w, h);
  });

  return encodeGif(frames, 60);
}
