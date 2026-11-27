"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { play } from "@/lib/sound";
import { drawStrip, type StripOptions } from "@/lib/strip";

type Props = { strip: StripOptions; onCollect: () => void };

const SLIDE_MS = 3000;
const DEVELOPED_MS = 8400; // matches the .develop animation delay + duration in globals.css

/**
 * The signature moment: the strip slides out of the print slot and develops
 * from blank paper to full color. Tap or press any key to skip.
 */
export function PrintSlot({ strip, onCollect }: Props) {
  const blankRef = useRef<HTMLCanvasElement>(null);
  const finalRef = useRef<HTMLCanvasElement>(null);
  const collectRef = useRef<HTMLButtonElement>(null);
  const [phase, setPhase] = useState<"printing" | "developing" | "ready">("printing");
  const [skipped, setSkipped] = useState(false);

  useEffect(() => {
    const draw = () => {
      if (blankRef.current) drawStrip(blankRef.current, { ...strip, undeveloped: true });
      if (finalRef.current) drawStrip(finalRef.current, strip);
    };
    draw();
    document.fonts?.ready.then(draw);
  }, [strip]);

  useEffect(() => {
    play("whirr", SLIDE_MS / 1000);
    const t1 = window.setTimeout(() => {
      play("drop");
      setPhase((p) => (p === "printing" ? "developing" : p));
    }, SLIDE_MS);
    const t2 = window.setTimeout(() => setPhase("ready"), DEVELOPED_MS);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, []);

  const skip = useCallback(() => {
    setSkipped(true);
    setPhase("ready");
  }, []);

  useEffect(() => {
    if (phase === "ready") collectRef.current?.focus();
  }, [phase]);

  useEffect(() => {
    if (phase === "ready") return;
    const onKey = () => skip();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, skip]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Your strip is printing"
      onPointerDown={phase === "ready" ? undefined : skip}
      className="fixed inset-0 z-50 flex flex-col items-center overflow-hidden bg-[#0e0d0c] text-[#f3eee6]"
    >
      <div className="mt-[max(6vh,env(safe-area-inset-top))] flex w-[min(90vw,440px)] flex-col items-center">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.3em] text-white/40">The Snap Room</p>
        <div className="relative z-10 h-5 w-full rounded-full bg-black shadow-[inset_0_3px_6px_rgb(0_0_0/0.9),0_1px_0_rgb(255_255_255/0.08)]" aria-hidden />
        <div className={`-mt-2.5 overflow-hidden px-3 pb-6 pt-2.5 ${skipped ? "skip" : ""}`}>
          <div className="print-out relative">
            <canvas
              ref={blankRef}
              className="block h-auto max-h-[62dvh] w-auto max-w-[78vw] shadow-[0_20px_40px_-10px_rgb(0_0_0/0.7)]"
              aria-hidden
            />
            <canvas ref={finalRef} className="develop absolute inset-0 h-full w-full" role="img" aria-label="Your photo strip" />
          </div>
        </div>
      </div>

      <div className="mt-auto flex min-h-28 flex-col items-center justify-center gap-2 px-4 pb-[max(2rem,env(safe-area-inset-bottom))] text-center" aria-live="polite">
        {phase === "printing" && <p className="text-sm text-white/70">Printing…</p>}
        {phase === "developing" && (
          <>
            <p className="font-display text-xl italic">Developing…</p>
            <p className="text-xs text-white/45">Tap anywhere to skip</p>
          </>
        )}
        {phase === "ready" && (
          <button
            ref={collectRef}
            type="button"
            onClick={onCollect}
            className="h-12 rounded-full bg-[#fbe3b5] px-7 text-sm font-semibold text-ink transition hover:bg-white"
          >
            Take your strip →
          </button>
        )}
      </div>
    </div>
  );
}
