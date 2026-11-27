"use client";

import { useEffect, useRef } from "react";
import { drawStrip, type StripOptions } from "@/lib/strip";

/** Live preview of the finished strip, drawn with the same code as the download. */
export function StripPreview(props: StripOptions) {
  const ref = useRef<HTMLCanvasElement>(null);
  const { layout, paper, style, shots, caption, showDate, fonts, seed } = props;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const opts = { layout, paper, style, shots, caption, showDate, fonts, seed };
    drawStrip(canvas, opts);
    // Redraw once web fonts finish loading so the caption uses the right face.
    let cancelled = false;
    document.fonts?.ready.then(() => {
      if (!cancelled) drawStrip(canvas, opts);
    });
    return () => {
      cancelled = true;
    };
  }, [layout, paper, style, shots, caption, showDate, fonts, seed]);

  const filled = shots.filter(Boolean).length;
  return (
    <canvas
      ref={ref}
      role="img"
      aria-label={`Photo strip preview, ${filled} of ${layout.cols * layout.rows} photos taken`}
      className="mx-auto block h-auto max-h-[68vh] w-auto max-w-full shadow-[0_18px_40px_-12px_rgb(28_26_23/0.35)]"
    />
  );
}
