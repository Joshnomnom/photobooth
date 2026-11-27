"use client";

import { type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { filterToCss } from "@/lib/filters";
import { capturePhoto, lookFor, type Shot } from "@/lib/look";
import { shuffle } from "@/lib/random";
import { POSE_PROMPTS, type Settings, resolve } from "@/lib/settings";
import { play, vibrate } from "@/lib/sound";
import { shotCount } from "@/lib/strip";
import { useCamera } from "@/lib/useCamera";
import { CameraBlocked } from "./CameraBlocked";
import { Countdown } from "./Countdown";
import { MuteButton } from "./MuteButton";

type Props = {
  settings: Settings;
  shots: readonly (Shot | null)[];
  seed: number;
  onShot: (slot: number, shot: Shot | null) => void;
  onPrint: () => void;
  onExit: () => void;
};

class Cancelled extends Error {}

function wait(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) return reject(new Cancelled());
    const id = window.setTimeout(resolve, ms);
    signal.addEventListener("abort", () => {
      window.clearTimeout(id);
      reject(new Cancelled());
    });
  });
}

/** Inside the booth: curtain, live camera, countdown, flash, shutter. */
export function BoothInterior({ settings, shots, seed, onShot, onPrint, onExit }: Props) {
  const camera = useCamera();
  const { start: startCamera } = camera;
  const { machine, layout, filter } = resolve(settings);
  const profile = machine.sound;
  const look = lookFor(filter);
  const film = settings.mode === "film";
  const total = shotCount(layout);
  const taken = shots.filter(Boolean).length;
  const full = taken >= total;
  const live = camera.status === "live";

  const [countdown, setCountdown] = useState<number | null>(null);
  const [posing, setPosing] = useState<number | null>(null);
  const [flashKey, setFlashKey] = useState(0);
  const [running, setRunning] = useState(false);
  const prompts = useMemo(() => shuffle(POSE_PROMPTS, seed), [seed]);

  // The capture loop spans several awaits, so it reads the latest values from a ref.
  const latest = useRef({ shots, filter, mirror: settings.mirror });
  useEffect(() => {
    latest.current = { shots, filter, mirror: settings.mirror };
  });
  const abortRef = useRef<AbortController | null>(null);
  const shutterRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    startCamera();
  }, [startCamera]);

  useEffect(() => () => abortRef.current?.abort(), []);

  useEffect(() => {
    if (live) shutterRef.current?.focus();
  }, [live]);

  const run = useCallback(async () => {
    const video = camera.videoRef.current;
    if (!video || abortRef.current) return;
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setRunning(true);
    let first = true;
    try {
      for (;;) {
        const current = latest.current.shots;
        const slot = current.findIndex((s) => !s);
        if (slot === -1) break;
        setPosing(slot);
        const count = first ? Number(settings.timer) : Math.min(3, Number(settings.timer));
        if (profile === "plastic") play("charge");
        for (let n = count; n > 0; n--) {
          setCountdown(n);
          play("tick", { profile });
          await wait(1000, ctrl.signal);
        }
        setCountdown(null);
        const shot = capturePhoto(video, latest.current.filter, latest.current.mirror, (seed + slot * 7919) >>> 0);
        play("shutter", { profile });
        vibrate(30);
        setFlashKey((k) => k + 1);
        latest.current.shots = current.map((s, i) => (i === slot ? shot : s));
        onShot(slot, shot);
        first = false;
        if (!film) break;
        await wait(1100, ctrl.signal);
      }
      setPosing(null);
      if (film && latest.current.shots.every(Boolean)) {
        await wait(500, ctrl.signal);
        onPrint();
      }
    } catch (err) {
      if (!(err instanceof Cancelled)) throw err;
    } finally {
      abortRef.current = null;
      setCountdown(null);
      setPosing(null);
      setRunning(false);
    }
  }, [camera.videoRef, settings.timer, seed, film, onShot, onPrint, profile]);

  const cancel = useCallback(() => abortRef.current?.abort(), []);

  const exit = useCallback(() => {
    cancel();
    onExit();
  }, [cancel, onExit]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (e.key === "Escape") {
        if (abortRef.current) cancel();
        return;
      }
      if (target.closest("input, select, button, textarea")) return;
      if (e.key === " " && live && !running && !full) {
        e.preventDefault();
        run();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [live, running, full, run, cancel]);

  const hint = running
    ? "Press Esc or Stop to pause."
    : !live
      ? " "
      : film
        ? full
          ? "Printing…"
          : taken === 0
            ? `Press the button and the booth takes all ${total} photos.`
            : "Press to continue your strip."
        : full
          ? "All set. Print your strip, or tap a photo to retake it."
          : "One photo per press. Tap a photo below to retake it.";

  return (
    <div role="dialog" aria-modal="true" aria-label="Inside the photo booth" className="fixed inset-0 z-50 flex flex-col text-[#f3eee6]" style={{ background: machine.interior }}>
      <header className="flex items-center justify-between gap-3 px-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-6">
        <button type="button" onClick={exit} className="h-11 rounded-full px-3 text-sm text-white/70 hover:bg-white/10 hover:text-white">
          ← Leave booth
        </button>
        <p className="hidden text-[11px] font-semibold uppercase tracking-[0.2em] text-white/50 sm:block">
          {machine.year} {machine.name} · {film ? "Film" : "Digital"} · {layout.name}
        </p>
        <div className="flex items-center gap-1">
          {camera.devices.length > 1 && (
            <select
              aria-label="Camera"
              value={camera.deviceId}
              onChange={(e) => camera.start(e.target.value)}
              disabled={running}
              className="h-9 max-w-36 truncate rounded-full border border-white/20 bg-transparent px-3 text-sm text-white"
            >
              {camera.devices.map((d, i) => (
                <option key={d.deviceId} value={d.deviceId} className="text-ink">
                  {d.label || `Camera ${i + 1}`}
                </option>
              ))}
            </select>
          )}
          <MuteButton className="text-white/70 hover:bg-white/10 hover:text-white" />
        </div>
      </header>

      {/* Camera window */}
      <div className="relative min-h-0 flex-1" style={{ containerType: "size" }}>
        <div
          className="absolute left-1/2 top-1/2 aspect-[4/3] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-xl bg-black shadow-[0_0_0_6px_#1d1b19,0_30px_80px_-20px_rgb(0_0_0/0.8)]"
          style={{ width: "min(calc(100cqw - 24px), calc((100cqh - 24px) * 4 / 3))" }}
        >
          <video
            ref={camera.videoRef}
            autoPlay
            playsInline
            muted
            className="h-full w-full object-cover"
            style={{ filter: filterToCss(filter), transform: settings.mirror ? "scaleX(-1)" : undefined }}
          />
          {/* Live approximation of the film look; the capture applies the real thing. */}
          <div className="film-vignette pointer-events-none absolute inset-0" style={{ opacity: Math.min(1, look.vignette * 2) }} aria-hidden />
          <div className="film-grain pointer-events-none absolute inset-0" style={{ opacity: Math.min(0.45, look.grain * 2.2) }} aria-hidden />

          {posing !== null && (
            <div className="absolute inset-x-0 top-0 bg-gradient-to-b from-black/60 to-transparent p-4 text-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-white/70">
                Pose {posing + 1} of {total}
              </p>
              <p className="mt-1 font-display text-2xl italic sm:text-3xl" aria-live="polite">
                {prompts[posing % prompts.length]}
              </p>
            </div>
          )}

          {countdown !== null && (
            <div className="absolute inset-0 grid place-items-center" aria-live="assertive">
              <Countdown value={countdown} variant={machine.countdown} />
            </div>
          )}

          {/* Curtain */}
          <div
            className={`pointer-events-none absolute inset-0 ${live ? "curtain-open" : ""}`}
            style={
              {
                "--curtain-a": machine.exterior.curtain[0],
                "--curtain-b": machine.exterior.curtain[1],
                "--curtain-c": machine.exterior.curtain[2],
              } as CSSProperties
            }
            aria-hidden
          >
            <div className="booth-curtain curtain-l absolute inset-y-0 left-0 w-1/2" />
            <div className="booth-curtain curtain-r absolute inset-y-0 right-0 w-1/2" />
          </div>
          {camera.status === "starting" && (
            <p className="absolute inset-x-0 bottom-6 text-center text-sm text-white/80">Waking up the camera…</p>
          )}
        </div>

        {camera.status === "error" && camera.errorKind && (
          <div className="absolute inset-0 grid place-items-center bg-black/60 p-4">
            <CameraBlocked kind={camera.errorKind} onRetry={() => camera.start()} onExit={exit} />
          </div>
        )}
      </div>

      {/* Controls */}
      <footer className="px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
        <ol className="mx-auto mb-4 flex justify-center gap-2" aria-label="Photos taken">
          {shots.map((shot, i) => (
            <li key={i} className="relative aspect-[4/3] w-12 overflow-hidden rounded border border-white/15 bg-white/5 sm:w-16">
              {shot ? (
                film ? (
                  // eslint-disable-next-line @next/next/no-img-element -- local data URL
                  <img src={shot.thumb} alt={`Shot ${i + 1}`} className="h-full w-full object-cover" />
                ) : (
                  <button
                    type="button"
                    onClick={() => onShot(i, null)}
                    disabled={running}
                    aria-label={`Retake photo ${i + 1}`}
                    title="Retake"
                    className="group block h-full w-full"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- local data URL */}
                    <img src={shot.thumb} alt="" className="h-full w-full object-cover" />
                    <span className="absolute inset-0 grid place-items-center bg-black/60 text-[10px] font-semibold opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
                      Retake
                    </span>
                  </button>
                )
              ) : (
                <span className="grid h-full place-items-center text-[11px] text-white/35">{i + 1}</span>
              )}
            </li>
          ))}
        </ol>

        <div className="mx-auto grid max-w-md grid-cols-[1fr_auto_1fr] items-center gap-4">
          <span />
          {running ? (
            <button
              type="button"
              onClick={cancel}
              aria-label="Stop"
              className="grid size-[76px] place-items-center rounded-full border-4 border-white/80"
            >
              <span className="size-6 rounded-sm bg-white" />
            </button>
          ) : (
            <button
              ref={shutterRef}
              type="button"
              onClick={run}
              disabled={!live || full}
              aria-label={film ? (taken === 0 ? `Start: take all ${total} photos` : "Continue the strip") : "Take a photo"}
              className="group grid size-[76px] place-items-center rounded-full border-4 border-white/90 transition disabled:opacity-35"
            >
              <span className="size-[58px] rounded-full bg-accent transition group-hover:scale-95 group-active:scale-90" />
            </button>
          )}
          <div className="justify-self-start">
            {!film && full && !running && (
              <button type="button" onClick={onPrint} className="h-11 rounded-full bg-[#fbe3b5] px-5 text-sm font-semibold text-ink hover:bg-white">
                Print strip
              </button>
            )}
          </div>
        </div>
        <p className="mt-3 min-h-4 text-center text-xs text-white/50">{hint}</p>
      </footer>

      {flashKey > 0 && <div key={flashKey} className="animate-flash pointer-events-none fixed inset-0 z-[60]" style={{ background: machine.flash }} aria-hidden />}
    </div>
  );
}
