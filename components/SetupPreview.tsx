"use client";

import { useEffect, useRef } from "react";
import type { Filter } from "@/lib/filters";
import { CANVAS_FONTS } from "@/lib/fonts";
import { develop } from "@/lib/look";
import type { Paper, StripStyle } from "@/lib/machines";
import { drawStrip, type Layout, shotCount } from "@/lib/strip";

/**
 * "What you'll get": the real strip renderer with the current setup, filled with
 * sample photos (faces from a real CC0 vintage booth strip) developed with the
 * chosen film look. Layout, paper, corners, date, decorations and look all show.
 */

const SAMPLE_SRC = "/assets/booth-strip-vintage.webp";
const SAMPLE_W = 360;
const SAMPLE_H = 270;

let sourcePromise: Promise<HTMLImageElement> | null = null;
function loadSource() {
  if (!sourcePromise) {
    sourcePromise = new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = SAMPLE_SRC;
    });
  }
  return sourcePromise;
}

// Developed samples, cached per look so changing paper or layout is instant.
const sampleCache = new Map<string, HTMLCanvasElement>();

function sample(src: HTMLImageElement, face: number, filter: Filter): HTMLCanvasElement {
  const key = `${JSON.stringify([filter.ops, filter.look])}|${face}`;
  const hit = sampleCache.get(key);
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = SAMPLE_W;
  c.height = SAMPLE_H;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  if (!ctx) return c;
  // The source strip has 4 faces side by side; crop a 4:3 window from each.
  // Inset a little from each frame edge and centre the window on the face.
  const fw = src.naturalWidth / 4;
  const sw = fw * 0.86;
  const sh = sw * 0.75;
  const sx = face * fw + (fw - sw) / 2;
  const sy = Math.min(src.naturalHeight - sh, src.naturalHeight * 0.3);
  ctx.drawImage(src, sx, sy, sw, sh, 0, 0, SAMPLE_W, SAMPLE_H);
  develop(c, ctx, filter, 101 + face);
  sampleCache.set(key, c);
  return c;
}

type Props = { layout: Layout; paper: Paper; style: StripStyle; filter: Filter };

export function SetupPreview({ layout, paper, style, filter }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let cancelled = false;
    // A short delay so clicking through options doesn't redraw on every step.
    const timer = window.setTimeout(async () => {
      try {
        const src = await loadSource();
        await document.fonts?.ready;
        if (cancelled || !ref.current) return;
        const shots = Array.from({ length: shotCount(layout) }, (_, i) => sample(src, i % 4, filter));
        drawStrip(ref.current, { layout, paper, style, shots, caption: "", showDate: true, fonts: CANVAS_FONTS, seed: 7 });
      } catch {
        /* preview is a nicety; the booth works without it */
      }
    }, 90);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [layout, paper, style, filter]);

  return (
    <figure className="rounded-xl border border-line bg-black/20 p-4">
      <canvas
        ref={ref}
        role="img"
        aria-label={`Preview: ${layout.name} on ${paper.name} paper`}
        className="mx-auto block h-auto max-h-[240px] w-auto max-w-full shadow-[0_12px_24px_-8px_rgb(0_0_0/0.7)]"
      />
      <figcaption className="mt-3 text-center text-[11px] text-muted">
        What you&apos;ll get · {layout.name} · {paper.name} paper. Sample photos from a real vintage strip.
      </figcaption>
    </figure>
  );
}
