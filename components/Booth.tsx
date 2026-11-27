"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { body, display } from "@/lib/fonts";
import { FILTERS, filterToCss } from "@/lib/filters";
import {
  FRAMES,
  LAYOUTS,
  canvasToBlob,
  capturePhoto,
  drawStrip,
  shotCount,
  stripFilename,
} from "@/lib/strip";
import { useCamera } from "@/lib/useCamera";
import { OptionGroup } from "./OptionGroup";
import { StripPreview } from "./StripPreview";

type Shot = { canvas: HTMLCanvasElement; thumb: string };
type Timer = "3" | "5" | "10";

const MAX_SHOTS = Math.max(...LAYOUTS.map(shotCount));
const FONTS = { display: display.style.fontFamily, body: body.style.fontFamily };
const EMPTY: (Shot | null)[] = Array(MAX_SHOTS).fill(null);

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

function makeThumb(source: HTMLCanvasElement) {
  const c = document.createElement("canvas");
  c.width = 240;
  c.height = 180;
  c.getContext("2d")?.drawImage(source, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.8);
}

export function Booth() {
  const camera = useCamera();
  const [layoutId, setLayoutId] = useState(LAYOUTS[0].id);
  const [frameId, setFrameId] = useState(FRAMES[0].id);
  const [filterId, setFilterId] = useState(FILTERS[0].id);
  const [timer, setTimer] = useState<Timer>("3");
  const [mirror, setMirror] = useState(true);
  const [caption, setCaption] = useState("");
  const [showDate, setShowDate] = useState(true);
  const [shots, setShots] = useState<(Shot | null)[]>(EMPTY);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [flashKey, setFlashKey] = useState(0);
  const [running, setRunning] = useState(false);
  const [canShare, setCanShare] = useState(false);
  const [exportError, setExportError] = useState("");

  const layout = LAYOUTS.find((l) => l.id === layoutId) ?? LAYOUTS[0];
  const frame = FRAMES.find((f) => f.id === frameId) ?? FRAMES[0];
  const filter = FILTERS.find((f) => f.id === filterId) ?? FILTERS[0];
  const total = shotCount(layout);
  const visible = useMemo(() => shots.slice(0, total), [shots, total]);
  const stripShots = useMemo(() => visible.map((s) => s?.canvas ?? null), [visible]);
  const taken = visible.filter(Boolean).length;
  const full = taken === total;
  const live = camera.status === "live";

  // The capture loop runs across several awaits, so it reads the latest values from refs.
  const latest = useRef({ shots, total, filter, mirror });
  useEffect(() => {
    latest.current = { shots, total, filter, mirror };
  });
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  useEffect(() => {
    const probe = new File([], "x.png", { type: "image/png" });
    // Feature detection has to run on the client, after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCanShare(typeof navigator.canShare === "function" && navigator.canShare({ files: [probe] }));
  }, []);

  const run = useCallback(
    async (mode: "one" | "all") => {
      const video = camera.videoRef.current;
      if (!video || abortRef.current) return;
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setRunning(true);
      try {
        for (;;) {
          const { shots: current, total: count } = latest.current;
          const slot = current.slice(0, count).findIndex((s) => !s);
          if (slot === -1) break;
          for (let n = Number(timer); n > 0; n--) {
            setCountdown(n);
            await wait(1000, ctrl.signal);
          }
          setCountdown(null);
          const { filter: f, mirror: m } = latest.current;
          const canvas = capturePhoto(video, f, m);
          const next = [...latest.current.shots];
          next[slot] = { canvas, thumb: makeThumb(canvas) };
          latest.current.shots = next;
          setShots(next);
          setFlashKey((k) => k + 1);
          if (mode === "one") break;
          await wait(1200, ctrl.signal);
        }
      } catch (err) {
        if (!(err instanceof Cancelled)) throw err;
      } finally {
        abortRef.current = null;
        setCountdown(null);
        setRunning(false);
      }
    },
    [camera.videoRef, timer],
  );

  const cancel = useCallback(() => abortRef.current?.abort(), []);

  // Keyboard: Space takes a photo, Escape cancels the countdown.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (target.closest("input, textarea, select, button")) return;
      if (e.key === " " && live && !running && !full) {
        e.preventDefault();
        run("one");
      } else if (e.key === "Escape") {
        cancel();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [live, running, full, run, cancel]);

  function clearSlot(i: number) {
    const next = [...shots];
    next[i] = null;
    setShots(next);
  }

  async function exportStrip() {
    const canvas = document.createElement("canvas");
    await document.fonts?.ready;
    drawStrip(canvas, { layout, frame, shots: stripShots, caption, showDate, fonts: FONTS });
    return canvasToBlob(canvas);
  }

  async function download() {
    setExportError("");
    try {
      const blob = await exportStrip();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = stripFilename();
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setExportError("Couldn't save the image. Please try again.");
    }
  }

  async function share() {
    setExportError("");
    try {
      const blob = await exportStrip();
      const file = new File([blob], stripFilename(), { type: "image/png" });
      await navigator.share({ files: [file], title: "The Snap Room" });
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setExportError("Sharing isn't available right now. Try downloading instead.");
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-10">
      {/* Camera + controls */}
      <section aria-label="Camera" className="min-w-0 space-y-5">
        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-[#121110] shadow-[0_24px_60px_-24px_rgb(28_26_23/0.6)]">
          <video
            ref={camera.videoRef}
            autoPlay
            playsInline
            muted
            className={`h-full w-full object-cover transition-opacity duration-300 ${live ? "opacity-100" : "opacity-0"}`}
            style={{ filter: filterToCss(filter), transform: mirror ? "scaleX(-1)" : undefined }}
          />

          {!live && (
            <div className="absolute inset-0 grid place-items-center p-6 text-center text-[#d8d0c4]">
              <div className="max-w-sm space-y-4">
                <p className="font-display text-3xl italic text-[#f3eee6]">Ready when you are.</p>
                <p className="text-sm text-[#a39a8e]">
                  Your camera feed stays on this device. Photos are never uploaded.
                </p>
                <button
                  type="button"
                  onClick={() => camera.start()}
                  disabled={camera.status === "starting"}
                  className="inline-flex h-11 items-center rounded-full bg-accent px-6 text-sm font-semibold text-white transition-colors hover:bg-accent-dark disabled:opacity-60"
                >
                  {camera.status === "starting" ? "Starting camera…" : "Turn on camera"}
                </button>
                {camera.error && (
                  <p role="alert" className="text-sm text-[#ff9a86]">
                    {camera.error}
                  </p>
                )}
              </div>
            </div>
          )}

          {live && (
            <div className="absolute left-4 top-4 rounded-full bg-black/45 px-3 py-1 text-xs font-medium text-white backdrop-blur">
              {full ? "All done" : `Photo ${taken + 1} of ${total}`}
            </div>
          )}

          {countdown !== null && (
            <div className="absolute inset-0 grid place-items-center bg-black/20" aria-live="assertive">
              <span key={countdown} className="animate-count font-display text-[min(30vw,180px)] leading-none text-white drop-shadow-lg">
                {countdown}
              </span>
            </div>
          )}

          {flashKey > 0 && <div key={flashKey} className="animate-flash pointer-events-none absolute inset-0 bg-white" />}
        </div>

        {/* Shutter row */}
        <div className="flex flex-wrap items-center justify-center gap-3 sm:justify-between">
          <div className="flex items-center gap-2">
            {camera.devices.length > 1 && (
              <select
                aria-label="Camera"
                value={camera.deviceId}
                onChange={(e) => camera.start(e.target.value)}
                disabled={running}
                className="h-10 max-w-44 truncate rounded-full border border-line bg-card px-3 text-sm"
              >
                {camera.devices.map((d, i) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label || `Camera ${i + 1}`}
                  </option>
                ))}
              </select>
            )}
            {live && (
              <button
                type="button"
                onClick={() => {
                  cancel();
                  camera.stop();
                }}
                className="h-10 rounded-full border border-line bg-card px-4 text-sm text-muted hover:text-ink"
              >
                Turn off
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {running ? (
              <button
                type="button"
                onClick={cancel}
                className="h-12 rounded-full border border-ink px-6 text-sm font-semibold"
              >
                Cancel
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => run("one")}
                  disabled={!live || full}
                  aria-label="Take one photo"
                  title="Take one photo (Space)"
                  className="group grid size-16 place-items-center rounded-full border-4 border-ink bg-card transition disabled:opacity-40"
                >
                  <span className="size-11 rounded-full bg-accent transition group-hover:scale-95 group-active:scale-90 group-disabled:bg-muted" />
                </button>
                <button
                  type="button"
                  onClick={() => run("all")}
                  disabled={!live || full}
                  className="h-12 rounded-full bg-ink px-5 text-sm font-semibold text-card transition hover:bg-ink/85 disabled:opacity-40"
                >
                  {full ? "Strip complete" : taken === 0 ? `Take all ${total}` : `Take remaining ${total - taken}`}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Thumbnails */}
        <ol className="grid grid-cols-6 gap-2" aria-label="Taken photos">
          {visible.map((shot, i) => (
            <li key={i} className="relative aspect-[4/3] overflow-hidden rounded-lg border border-line bg-card">
              {shot ? (
                <button
                  type="button"
                  onClick={() => clearSlot(i)}
                  disabled={running}
                  title="Remove this photo so you can retake it"
                  aria-label={`Retake photo ${i + 1}`}
                  className="group block h-full w-full"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- local data URL */}
                  <img src={shot.thumb} alt="" className="h-full w-full object-cover" />
                  <span className="absolute inset-0 grid place-items-center bg-black/55 text-[11px] font-semibold text-white opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
                    Retake
                  </span>
                </button>
              ) : (
                <span className="grid h-full place-items-center text-xs text-muted">{i + 1}</span>
              )}
            </li>
          ))}
        </ol>

        {/* Settings */}
        <div className="grid gap-5 rounded-2xl border border-line bg-card/60 p-5 sm:grid-cols-2">
          <OptionGroup
            label="Layout"
            value={layoutId}
            onChange={setLayoutId}
            disabled={running}
            options={LAYOUTS.map((l) => ({ id: l.id, label: l.name }))}
          />
          <OptionGroup
            label="Timer"
            value={timer}
            onChange={setTimer}
            disabled={running}
            options={(["3", "5", "10"] as const).map((t) => ({ id: t, label: `${t}s` }))}
          />
          <div className="sm:col-span-2">
            <OptionGroup
              label="Filter"
              value={filterId}
              onChange={setFilterId}
              options={FILTERS.map((f) => ({ id: f.id, label: f.name }))}
            />
          </div>
          <div className="sm:col-span-2">
            <OptionGroup
              label="Frame"
              value={frameId}
              onChange={setFrameId}
              options={FRAMES.map((f) => ({
                id: f.id,
                label: (
                  <>
                    <span
                      className="size-3.5 rounded-full border border-black/15"
                      style={{ background: f.paper }}
                      aria-hidden
                    />
                    {f.name}
                  </>
                ),
              }))}
            />
          </div>
          <label className="block sm:col-span-2">
            <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">Caption</span>
            <input
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              maxLength={40}
              placeholder="The Snap Room"
              className="h-10 w-full rounded-lg border border-line bg-card px-3 text-sm placeholder:text-muted/70"
            />
          </label>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm sm:col-span-2">
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={showDate} onChange={(e) => setShowDate(e.target.checked)} className="size-4 accent-accent" />
              Print the date
            </label>
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={mirror} onChange={(e) => setMirror(e.target.checked)} className="size-4 accent-accent" />
              Mirror camera
            </label>
          </div>
        </div>
      </section>

      {/* Strip */}
      <aside aria-label="Your strip" className="min-w-0 lg:sticky lg:top-6 lg:self-start">
        <div className="rounded-2xl border border-line bg-card/60 p-5">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="font-display text-2xl">Your strip</h2>
            <span className="text-sm text-muted">
              {taken} / {total}
            </span>
          </div>
          <StripPreview
            layout={layout}
            frame={frame}
            shots={stripShots}
            caption={caption}
            showDate={showDate}
            fonts={FONTS}
          />
          <div className="mt-5 grid gap-2">
            <button
              type="button"
              onClick={download}
              disabled={taken === 0 || running}
              className="h-11 rounded-full bg-accent text-sm font-semibold text-white transition-colors hover:bg-accent-dark disabled:opacity-40"
            >
              Download PNG
            </button>
            {canShare && (
              <button
                type="button"
                onClick={share}
                disabled={taken === 0 || running}
                className="h-11 rounded-full border border-ink text-sm font-semibold disabled:opacity-40"
              >
                Share
              </button>
            )}
            <button
              type="button"
              onClick={() => setShots(EMPTY)}
              disabled={shots.every((s) => !s) || running}
              className="h-10 text-sm text-muted underline-offset-4 hover:text-ink hover:underline disabled:opacity-40 disabled:no-underline"
            >
              Start over
            </button>
            {exportError && (
              <p role="alert" className="text-center text-sm text-accent-dark">
                {exportError}
              </p>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
