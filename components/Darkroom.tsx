"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Machine } from "@/lib/machines";
import { play } from "@/lib/sound";
import { drawStrip, type StripOptions } from "@/lib/strip";

type Props = { strip: StripOptions; machine: Machine; onCollect: () => void };

type Phase = "dropping" | "developing" | "developed" | "lit";

const DROP_MS = 900;
const DEVELOPED_MS = 8400; // matches the .develop animation (delay + duration) in globals.css

/**
 * The darkroom (signature moment). Under a red safelight the strip drops into
 * the developer tray and slowly appears. Then you switch the lights on and the
 * real colors show. Real props: film-strip.webp and darkroom-timer.webp (CC0).
 */
export function Darkroom({ strip, machine, onCollect }: Props) {
  const blankRef = useRef<HTMLCanvasElement>(null);
  const finalRef = useRef<HTMLCanvasElement>(null);
  const actionRef = useRef<HTMLButtonElement>(null);
  const [phase, setPhase] = useState<Phase>("dropping");
  const [skipped, setSkipped] = useState(false);
  const lit = phase === "lit";

  useEffect(() => {
    const draw = () => {
      if (blankRef.current) drawStrip(blankRef.current, { ...strip, undeveloped: true });
      if (finalRef.current) drawStrip(finalRef.current, strip);
    };
    draw();
    document.fonts?.ready.then(draw);
  }, [strip]);

  useEffect(() => {
    play("whirr", { profile: machine.sound, duration: 0.9 });
    const t1 = window.setTimeout(() => {
      play("drop");
      setPhase((p) => (p === "dropping" ? "developing" : p));
    }, DROP_MS);
    const t2 = window.setTimeout(() => setPhase((p) => (p === "lit" ? p : "developed")), DEVELOPED_MS);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [machine.sound]);

  const skip = useCallback(() => {
    setSkipped(true);
    setPhase((p) => (p === "lit" ? p : "developed"));
  }, []);

  const lightsOn = useCallback(() => {
    play("switch");
    setPhase("lit");
  }, []);

  useEffect(() => {
    if (phase === "developed") play("ready");
    if (phase === "developed" || phase === "lit") actionRef.current?.focus();
  }, [phase]);

  // Any key skips the wait while developing.
  useEffect(() => {
    if (phase !== "dropping" && phase !== "developing") return;
    const onKey = () => skip();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, skip]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="The darkroom: your strip is developing"
      onPointerDown={phase === "dropping" || phase === "developing" ? skip : undefined}
      className={`darkroom fixed inset-0 z-50 flex flex-col overflow-hidden text-[#f6e9e4] ${lit ? "darkroom-lit" : ""}`}
    >
      <div className="darkroom-safelight" aria-hidden />

      <header className="relative z-10 flex items-center justify-between px-5 pt-[max(1rem,env(safe-area-inset-top))] font-typewriter text-[11px] uppercase tracking-[0.25em]">
        <span>Darkroom</span>
        <span className="opacity-70">
          {machine.year} {machine.name} · Developer 20°C
        </span>
      </header>

      {/* The scene: everything under the safelight goes red until the lights come on. */}
      <div className="darkroom-scene relative flex min-h-0 flex-1 flex-col items-center justify-center">
        {/* Drying line with real negatives */}
        <div className="pointer-events-none absolute inset-x-0 top-6 hidden sm:block" aria-hidden>
          <div className="mx-auto h-px w-[80%] bg-white/30" />
          <div className="drying-film absolute left-[14%] top-0 w-[min(34vw,340px)] origin-top">
            <span className="clothespin left-[18%]" />
            <span className="clothespin right-[18%]" />
            {/* eslint-disable-next-line @next/next/no-img-element -- static asset */}
            <img src="/assets/film-strip.webp" alt="" className="mt-2 block w-full opacity-80" />
          </div>
        </div>

        {/* Developer tray */}
        <div className="darkroom-tray relative mt-10 rounded-[14px] p-4 sm:p-5">
          <div className="tray-liquid" aria-hidden />
          <div className={`relative ${skipped ? "skip" : ""}`}>
            <div className="tray-drop relative rotate-[-1.5deg]">
              <canvas ref={blankRef} className="block h-auto max-h-[56dvh] w-auto max-w-[68vw] shadow-[0_10px_24px_rgb(0_0_0/0.6)]" aria-hidden />
              <canvas ref={finalRef} className="develop absolute inset-0 h-full w-full" role="img" aria-label="Your photo strip" />
            </div>
          </div>
        </div>

        {/* The real darkroom timer on the shelf */}
        {/* eslint-disable-next-line @next/next/no-img-element -- static asset */}
        <img
          src="/assets/darkroom-timer.webp"
          alt=""
          aria-hidden
          className="darkroom-prop pointer-events-none absolute bottom-4 right-[5%] hidden w-[min(17vw,190px)] md:block"
        />
      </div>

      <footer className="relative z-10 flex min-h-32 flex-col items-center justify-center gap-2 px-4 pb-[max(2rem,env(safe-area-inset-bottom))] text-center" aria-live="polite">
        {(phase === "dropping" || phase === "developing") && (
          <>
            <p className="font-display text-xl italic">Developing… don&apos;t open the door.</p>
            <p className="text-xs opacity-60">Tap anywhere to skip</p>
          </>
        )}
        {phase === "developed" && (
          <>
            <p className="text-sm opacity-80">Fixed and rinsed. Ready to see it properly?</p>
            <button
              ref={actionRef}
              type="button"
              onClick={lightsOn}
              className="h-12 rounded-full border border-[#f6e9e4]/60 px-7 font-typewriter text-sm font-bold uppercase tracking-[0.2em] transition hover:bg-white/10"
            >
              Lights on
            </button>
          </>
        )}
        {lit && (
          <button
            ref={actionRef}
            type="button"
            onClick={onCollect}
            className="h-12 rounded-full bg-[#fbe3b5] px-7 text-sm font-semibold text-[#1c1a17] transition hover:bg-white"
          >
            Take your strip →
          </button>
        )}
      </footer>
    </div>
  );
}
