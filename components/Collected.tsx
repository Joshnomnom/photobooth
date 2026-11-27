"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { type Decorations, EMPTY_DECORATIONS, isEmpty, placeSticker } from "@/lib/decorations";
import type { Fonts } from "@/lib/fonts";
import type { Machine } from "@/lib/machines";
import { play } from "@/lib/sound";
import { drawSticker, type StickerKind, stickerLabel } from "@/lib/stickers";
import { canvasToBlob, drawStrip, type StripOptions, stripFilename } from "@/lib/strip";
import { type Pen, StripEditor, stickerBase, type Tool } from "./StripEditor";

type Props = {
  strip: StripOptions;
  machine: Machine;
  decorations: Decorations;
  onDecorations: (next: Decorations) => void;
  onCaption: (caption: string) => void;
  onShowDate: (show: boolean) => void;
  onAgain: () => void;
  onSetup: () => void;
};

const CHALLENGE_SECONDS = 60;

/** The strip in your hands: decorate it (purikura style), caption it, save it, or go again. */
export function Collected({ strip, machine, decorations, onDecorations, onCaption, onShowDate, onAgain, onSetup }: Props) {
  const [canShare, setCanShare] = useState(false);
  const [error, setError] = useState("");
  const [tool, setTool] = useState<Tool>("stickers");
  const [penColor, setPenColor] = useState(machine.pens[0]);
  const [penThick, setPenThick] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [past, setPast] = useState<Decorations[]>([]);
  const [size, setSize] = useState({ width: 1000, height: 3000 });
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    const probe = new File([], "x.png", { type: "image/png" });
    // Feature detection has to run on the client, after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCanShare(typeof navigator.canShare === "function" && navigator.canShare({ files: [probe] }));
  }, []);

  // Optional purikura-style challenge: decorate before the clock runs out.
  useEffect(() => {
    if (timeLeft === null) return;
    if (timeLeft <= 0) {
      play("timeup");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLocked(true);
      setSelectedId(null);
      setTimeLeft(null);
      return;
    }
    const id = window.setTimeout(() => setTimeLeft((t) => (t === null ? null : t - 1)), 1000);
    return () => window.clearTimeout(id);
  }, [timeLeft]);

  const change = useCallback(
    (next: Decorations, snapshot?: Decorations) => {
      if (snapshot) setPast((p) => [...p.slice(-49), snapshot]);
      onDecorations(next);
    },
    [onDecorations],
  );

  const undo = () => {
    const prev = past[past.length - 1];
    if (!prev) return;
    setPast((p) => p.slice(0, -1));
    onDecorations(prev);
    setSelectedId(null);
  };

  const clear = () => {
    if (isEmpty(decorations)) return;
    change(EMPTY_DECORATIONS, decorations);
    setSelectedId(null);
  };

  const addSticker = (kind: StickerKind) => {
    const s = placeSticker(kind, size.width, size.height, stickerBase(size.width, size.height));
    change({ ...decorations, stickers: [...decorations.stickers, s] }, decorations);
    setSelectedId(s.id);
    setTool("stickers");
    play("pop");
  };

  const selected = decorations.stickers.find((s) => s.id === selectedId) ?? null;
  const editSelected = (fn: (s: NonNullable<typeof selected>) => NonNullable<typeof selected> | null) => {
    if (!selected) return;
    const next = fn(selected);
    const stickers = next
      ? decorations.stickers.map((s) => (s.id === selected.id ? next : s))
      : decorations.stickers.filter((s) => s.id !== selected.id);
    change({ ...decorations, stickers }, decorations);
    if (!next) setSelectedId(null);
  };

  const strokeWidth = Math.round(size.width * (penThick ? 0.018 : 0.008));
  const pen: Pen = { color: penColor, width: strokeWidth, halo: machine.penHalo };

  async function exportStrip() {
    const canvas = document.createElement("canvas");
    await document.fonts?.ready;
    drawStrip(canvas, { ...strip, decorations });
    return canvasToBlob(canvas);
  }

  async function download() {
    setError("");
    try {
      const url = URL.createObjectURL(await exportStrip());
      const a = document.createElement("a");
      a.href = url;
      a.download = stripFilename();
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setError("Couldn't save the image. Please try again.");
    }
  }

  async function share() {
    setError("");
    try {
      const file = new File([await exportStrip()], stripFilename(), { type: "image/png" });
      await navigator.share({ files: [file], title: "The Snap Room" });
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError("Sharing isn't available right now. Try downloading instead.");
    }
  }

  const label = "mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-muted";
  const chip = (active: boolean) =>
    `inline-flex h-9 items-center gap-2 rounded-full border px-3.5 text-sm transition-colors disabled:opacity-40 ${
      active ? "border-ink bg-ink text-card" : "border-line bg-card text-ink hover:border-ink/40"
    }`;

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-12">
      <div className="strip-land relative min-w-0 lg:sticky lg:top-6">
        <StripEditor
          strip={strip}
          decorations={decorations}
          onChange={change}
          tool={tool}
          pen={pen}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onSize={setSize}
          locked={locked}
        />
        {timeLeft !== null && (
          <div className="absolute left-1/2 top-3 -translate-x-1/2 rounded-full bg-ink px-4 py-1.5 text-sm font-semibold tabular-nums text-card shadow-lg" aria-live="polite">
            {timeLeft}s left
          </div>
        )}
        {locked && (
          <div className="absolute inset-0 grid place-items-center">
            <div className="rounded-2xl bg-ink/90 px-6 py-5 text-center text-card shadow-2xl">
              <p className="font-display text-3xl italic">Time&apos;s up!</p>
              <button type="button" onClick={() => setLocked(false)} className="mt-3 text-sm text-card/80 underline underline-offset-4 hover:text-card">
                Keep decorating
              </button>
            </div>
          </div>
        )}
        <p className="mt-3 text-center text-xs text-muted">
          {tool === "pen" ? "Draw right on your strip." : "Drag stickers to move them. Use the round handle to turn and resize."}
        </p>
      </div>

      <section aria-labelledby="collected-title" className="space-y-6 rounded-2xl border border-line bg-card/70 p-5 sm:p-6">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">Fresh out of the booth</p>
          <h2 id="collected-title" className="mt-1 font-display text-3xl">
            Decorate your strip
          </h2>
        </div>

        {/* Tools */}
        <div className="flex flex-wrap items-center gap-2">
          <div role="radiogroup" aria-label="Tool" className="flex gap-1.5">
            {(["stickers", "pen"] as const).map((t) => (
              <button key={t} type="button" role="radio" aria-checked={tool === t} onClick={() => setTool(t)} className={chip(tool === t)}>
                {t === "stickers" ? "Stickers" : "Pen"}
              </button>
            ))}
          </div>
          <div className="ml-auto flex gap-1">
            <button type="button" onClick={undo} disabled={past.length === 0 || locked} className="h-9 rounded-full px-3 text-sm text-muted hover:text-ink disabled:opacity-40">
              Undo
            </button>
            <button type="button" onClick={clear} disabled={isEmpty(decorations) || locked} className="h-9 rounded-full px-3 text-sm text-muted hover:text-ink disabled:opacity-40">
              Clear
            </button>
          </div>
        </div>

        {tool === "stickers" ? (
          <div>
            <span className={label}>Sticker sheet · {machine.year}</span>
            <div className="grid grid-cols-5 gap-2">
              {machine.stickers.map((kind) => (
                <button
                  key={kind}
                  type="button"
                  onClick={() => addSticker(kind)}
                  disabled={locked}
                  title={stickerLabel(kind)}
                  aria-label={`Add ${stickerLabel(kind)} sticker`}
                  className="grid aspect-square place-items-center rounded-xl border border-line bg-card transition hover:-translate-y-0.5 hover:border-ink/30 hover:shadow-md disabled:opacity-40"
                >
                  <StickerIcon kind={kind} fonts={strip.fonts} />
                </button>
              ))}
            </div>
            {selected && !locked && (
              <div className="mt-3 flex flex-wrap items-center gap-1.5 rounded-xl bg-ink/5 p-2 text-sm" aria-label="Selected sticker">
                <span className="px-1 text-xs text-muted">{stickerLabel(selected.kind)}</span>
                <button type="button" className={chip(false)} onClick={() => editSelected((s) => ({ ...s, size: s.size / 1.15 }))} aria-label="Smaller">
                  −
                </button>
                <button type="button" className={chip(false)} onClick={() => editSelected((s) => ({ ...s, size: s.size * 1.15 }))} aria-label="Bigger">
                  +
                </button>
                <button type="button" className={chip(false)} onClick={() => editSelected((s) => ({ ...s, rotation: s.rotation - 0.2 }))} aria-label="Turn left">
                  ↺
                </button>
                <button type="button" className={chip(false)} onClick={() => editSelected((s) => ({ ...s, rotation: s.rotation + 0.2 }))} aria-label="Turn right">
                  ↻
                </button>
                <button type="button" className={`${chip(false)} ml-auto text-accent-dark`} onClick={() => editSelected(() => null)}>
                  Remove
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <span className={label}>Pen color</span>
              <div role="radiogroup" aria-label="Pen color" className="flex flex-wrap gap-2">
                {machine.pens.map((c) => (
                  <button
                    key={c}
                    type="button"
                    role="radio"
                    aria-checked={penColor === c}
                    aria-label={`Pen color ${c}`}
                    onClick={() => setPenColor(c)}
                    className={`size-9 rounded-full border-2 transition ${penColor === c ? "scale-110 border-ink" : "border-black/10"}`}
                    style={{ background: c }}
                  />
                ))}
              </div>
            </div>
            <div role="radiogroup" aria-label="Pen size" className="flex gap-1.5">
              <button type="button" role="radio" aria-checked={!penThick} onClick={() => setPenThick(false)} className={chip(!penThick)}>
                Fine
              </button>
              <button type="button" role="radio" aria-checked={penThick} onClick={() => setPenThick(true)} className={chip(penThick)}>
                Bold
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-line px-3 py-2.5">
          <p className="text-xs text-muted">Booth rules: decorate before the clock runs out.</p>
          {timeLeft === null ? (
            <button
              type="button"
              onClick={() => {
                setLocked(false);
                setTimeLeft(CHALLENGE_SECONDS);
              }}
              className="h-8 shrink-0 rounded-full bg-ink px-3 text-xs font-semibold text-card hover:bg-ink/85"
            >
              Start 60s
            </button>
          ) : (
            <button type="button" onClick={() => setTimeLeft(null)} className="h-8 shrink-0 rounded-full px-3 text-xs text-muted hover:text-ink">
              Stop timer
            </button>
          )}
        </div>

        {/* Finish */}
        <div className="space-y-3 border-t border-line pt-5">
          <label className="block">
            <span className={label}>Caption</span>
            <input
              value={strip.caption}
              onChange={(e) => onCaption(e.target.value)}
              maxLength={40}
              placeholder={strip.style.defaultCaption}
              className="h-11 w-full rounded-lg border border-line bg-card px-3 text-sm placeholder:text-muted/70"
            />
          </label>
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={strip.showDate} onChange={(e) => onShowDate(e.target.checked)} className="size-4 accent-accent" />
            Print the date
          </label>
        </div>

        <div className="grid gap-2">
          <button type="button" onClick={download} className="h-12 rounded-full bg-accent text-sm font-semibold text-white transition-colors hover:bg-accent-dark">
            Download PNG
          </button>
          {canShare && (
            <button type="button" onClick={share} className="h-12 rounded-full border border-ink text-sm font-semibold">
              Share
            </button>
          )}
          {error && (
            <p role="alert" className="text-center text-sm text-accent-dark">
              {error}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4 text-sm">
          <button type="button" onClick={onAgain} className="h-10 rounded-full bg-ink px-5 font-semibold text-card hover:bg-ink/85">
            Take another
          </button>
          <button type="button" onClick={onSetup} className="h-10 px-2 text-muted underline-offset-4 hover:text-ink hover:underline">
            Change setup
          </button>
        </div>
        <p className="text-xs text-muted">Download before you leave. Nothing is saved on our side.</p>
      </section>
    </div>
  );
}

function StickerIcon({ kind, fonts }: { kind: StickerKind; fonts: Fonts }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const draw = () => {
      const c = ref.current;
      const ctx = c?.getContext("2d");
      if (!c || !ctx) return;
      ctx.clearRect(0, 0, c.width, c.height);
      drawSticker(ctx, kind, c.width / 2, c.height / 2, c.width * 0.72, 0, fonts);
    };
    draw();
    document.fonts?.ready.then(draw);
  }, [kind, fonts]);
  return <canvas ref={ref} width={112} height={112} className="size-12" aria-hidden />;
}
