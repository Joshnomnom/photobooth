"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { type Decorations, EMPTY_DECORATIONS, isEmpty, placeSticker } from "@/lib/decorations";
import { downloadBlob, fileStamp } from "@/lib/download";
import { makeFlipbook } from "@/lib/flipbook";
import type { Fonts } from "@/lib/fonts";
import { type Machine, MACHINES } from "@/lib/machines";
import { printSheet } from "@/lib/printSheet";
import { pinStrip } from "@/lib/scrapbook";
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
  onGallery: () => void;
};

const CHALLENGE_SECONDS = 60;

/** The strip in your hands: decorate it (purikura style), caption it, save it, or go again. */
export function Collected({ strip, machine, decorations, onDecorations, onCaption, onShowDate, onAgain, onSetup, onGallery }: Props) {
  const [canShare, setCanShare] = useState(false);
  const [error, setError] = useState("");
  const [tool, setTool] = useState<Tool>("stickers");
  const [penColor, setPenColor] = useState(machine.pens[0]);
  // Sticker sheet: this machine's by default; any machine's sheet, or all of them, to mix.
  const [sheet, setSheet] = useState<string>(machine.id);
  const sheetStickers =
    sheet === "all"
      ? MACHINES.flatMap((m) => m.stickers).filter((k, i, all) => all.indexOf(k) === i)
      : (MACHINES.find((m) => m.id === sheet) ?? machine).stickers;
  // Pens: the machine's colors first, then everyone else's.
  const pens = [...machine.pens, ...MACHINES.flatMap((m) => m.pens)].filter((c, i, all) => all.indexOf(c) === i);
  const [penThick, setPenThick] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [past, setPast] = useState<Decorations[]>([]);
  const [size, setSize] = useState({ width: 1000, height: 3000 });
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [locked, setLocked] = useState(false);
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const [keeping, setKeeping] = useState<"pin" | "print" | "gif" | null>(null);
  const [keepMsg, setKeepMsg] = useState("");

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

  /** The finished strip, decorations included, at full resolution. */
  async function renderFinal() {
    await document.fonts?.ready;
    const canvas = document.createElement("canvas");
    drawStrip(canvas, { ...strip, decorations });
    return canvas;
  }

  async function exportStrip() {
    return canvasToBlob(await renderFinal());
  }

  async function keep(kind: "pin" | "print" | "gif") {
    setKeeping(kind);
    setKeepMsg("");
    // Let the button show its busy state before the heavy work starts.
    await new Promise((r) => setTimeout(r, 30));
    try {
      if (kind === "pin") {
        const c = await renderFinal();
        const blob = await new Promise<Blob>((resolve, reject) =>
          c.toBlob((b) => (b ? resolve(b) : reject(new Error("export"))), "image/jpeg", 0.9),
        );
        const data = { machineId: machine.id, layoutId: strip.layout.id, caption: strip.caption, width: c.width, height: c.height, blob };
        setPinnedId(await pinStrip(data, pinnedId ?? undefined));
        setKeepMsg(pinnedId ? "Updated in the gallery." : "Hung in the gallery.");
      } else if (kind === "print") {
        downloadBlob(await printSheet(await renderFinal()), `${fileStamp()}-print-4x6.png`);
        setKeepMsg("Print it as a 4×6 photo. Strips come two to a sheet: cut down the dotted line.");
      } else {
        const shots = strip.shots.filter((s): s is HTMLCanvasElement => s !== null);
        downloadBlob(await makeFlipbook(shots, strip.paper, strip.style, strip.caption, strip.fonts), `${fileStamp()}-flipbook.gif`);
        setKeepMsg("Flipbook saved. It loops forever.");
      }
    } catch {
      setKeepMsg(kind === "pin" ? "Couldn't save to your wall in this browser." : "Something went wrong. Please try again.");
    } finally {
      setKeeping(null);
    }
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
    <div className="room-enter grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-12">
      <div className="strip-land relative min-w-0 lg:sticky lg:top-6">
        <p className="room-chrome mb-3 text-center font-hand text-2xl -rotate-1" aria-hidden>
          {tool === "pen" ? "draw right on it ✎" : "drag stickers, twist the round handle ↻"}
        </p>
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
        <p className="room-chrome-muted mt-3 text-center text-xs">Keyboard: select a sticker, then arrows move, + and − resize, [ and ] turn, Delete removes.</p>
      </div>

      <section aria-labelledby="collected-title" className="paper-sheet relative space-y-6 rounded-[3px] p-5 sm:p-6">
        <span className="tape-corner -left-5 -top-2 -rotate-[24deg]" aria-hidden />
        <span className="tape-corner -right-5 -top-2 rotate-[22deg]" aria-hidden />
        <div>
          <p className="font-typewriter text-[11px] font-bold uppercase tracking-[0.2em] text-accent">On the studio table</p>
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
            <div className="mb-2 flex flex-wrap items-center gap-1.5" role="radiogroup" aria-label="Sticker sheet">
              {[...MACHINES.map((m) => ({ id: m.id, text: m.year })), { id: "all", text: "All" }].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="radio"
                  aria-checked={sheet === t.id}
                  onClick={() => setSheet(t.id)}
                  className={`h-7 rounded-full border px-2.5 text-xs transition ${
                    sheet === t.id ? "border-ink bg-ink text-card" : "border-line bg-card/70 hover:border-ink/40"
                  }`}
                >
                  {t.id === "all" ? "All sheets" : <span className="font-display italic">{t.text}</span>}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-5 gap-2">
              {sheetStickers.map((kind) => (
                <button
                  key={kind}
                  type="button"
                  onClick={() => addSticker(kind)}
                  disabled={locked}
                  title={stickerLabel(kind)}
                  aria-label={`Add ${stickerLabel(kind)} sticker`}
                  className="grid aspect-square place-items-center rounded-lg border border-dashed border-ink/20 bg-white transition hover:-translate-y-0.5 hover:border-ink/40 hover:shadow-md disabled:opacity-40"
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
                {pens.map((c) => (
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

        <div>
          <span className={label}>Keep it</span>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                ["pin", pinnedId ? "Update pin" : "Pin to wall", "Save to the wall on this device"],
                ["print", "Print 4×6", "A print-ready photo sheet at 300 dpi"],
                ["gif", "Flipbook GIF", "Your photos as a looping animation"],
              ] as const
            ).map(([kind, text, title]) => (
              <button
                key={kind}
                type="button"
                title={title}
                onClick={() => keep(kind)}
                disabled={keeping !== null}
                className="h-12 rounded-xl border border-line bg-card px-2 text-xs font-semibold leading-tight transition hover:border-ink/40 disabled:opacity-50"
              >
                {keeping === kind ? "Working…" : text}
              </button>
            ))}
          </div>
          <p className="mt-2 min-h-4 text-xs text-muted" aria-live="polite">
            {keepMsg}
          </p>
          {pinnedId && (
            <button type="button" onClick={onGallery} className="mt-1 text-xs font-semibold text-ink underline underline-offset-2">
              Visit the gallery →
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4 text-sm">
          <button type="button" onClick={onAgain} className="h-10 rounded-full bg-ink px-5 font-semibold text-card hover:bg-ink/85">
            Take another
          </button>
          <button type="button" onClick={onSetup} className="h-10 px-2 text-muted underline-offset-4 hover:text-ink hover:underline">
            Back to the street
          </button>
        </div>
        <p className="text-xs text-muted">Nothing is uploaded. Download it, or pin it to the wall saved in this browser.</p>
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
