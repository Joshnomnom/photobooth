"use client";

import { useEffect, useRef, useState } from "react";
import { downloadBlob, fileStamp } from "@/lib/download";
import { type Backdrop, composeFormat, FORMATS, type FormatId } from "@/lib/formats";
import type { Machine, Paper } from "@/lib/machines";

type Props = {
  /** Renders the finished strip (decorations included). */
  renderFinal: () => Promise<HTMLCanvasElement>;
  /** Changes whenever the strip's look changes, so previews refresh. */
  version: string;
  machine: Machine;
  paper: Paper;
  fonts: { body: string };
  canShare: boolean;
};

const IDS: FormatId[] = ["story", "post", "wallpaper"];
const BACKDROPS: { id: Backdrop; label: string }[] = [
  { id: "street", label: "Rainy street" },
  { id: "curtain", label: "Velvet curtain" },
  { id: "paper", label: "Paper" },
];

/** Ready-to-post formats, each with a live preview of exactly what will be saved. */
export function PostFormats({ renderFinal, version, machine, paper, fonts, canShare }: Props) {
  const [backdrop, setBackdrop] = useState<Backdrop>("street");
  const [busy, setBusy] = useState<FormatId | null>(null);
  const [msg, setMsg] = useState("");
  const refs = useRef<Record<FormatId, HTMLCanvasElement | null>>({ story: null, post: null, wallpaper: null });
  const latest = useRef(renderFinal);
  useEffect(() => {
    latest.current = renderFinal;
  });

  useEffect(() => {
    let cancelled = false;
    // Debounced: stickers and captions change often.
    const t = window.setTimeout(async () => {
      try {
        const strip = await latest.current();
        for (const id of IDS) {
          if (cancelled) return;
          const full = await composeFormat(strip, id, backdrop, machine, paper, fonts);
          const view = refs.current[id];
          if (!view || cancelled) continue;
          view.width = Math.round(full.width / 4);
          view.height = Math.round(full.height / 4);
          view.getContext("2d")?.drawImage(full, 0, 0, view.width, view.height);
        }
      } catch {
        /* previews are a nicety */
      }
    }, 450);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [version, backdrop, machine, paper, fonts]);

  async function make(id: FormatId) {
    const full = await composeFormat(await renderFinal(), id, backdrop, machine, paper, fonts);
    return new Promise<Blob>((resolve, reject) => full.toBlob((b) => (b ? resolve(b) : reject(new Error("export"))), "image/jpeg", 0.92));
  }

  async function save(id: FormatId, share: boolean) {
    setBusy(id);
    setMsg("");
    try {
      const blob = await make(id);
      const name = `${fileStamp()}-${id}.jpg`;
      if (share) {
        await navigator.share({ files: [new File([blob], name, { type: "image/jpeg" })], title: "The Snap Room" });
      } else {
        downloadBlob(blob, name);
        setMsg(`${FORMATS[id].name} saved.`);
      }
    } catch (err) {
      if (!(err instanceof DOMException && err.name === "AbortError")) setMsg("Couldn't make that one. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section aria-labelledby="post-title">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <span id="post-title" className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
          Post it
        </span>
        <div role="radiogroup" aria-label="Background" className="flex flex-wrap gap-1">
          {BACKDROPS.map((b) => (
            <button
              key={b.id}
              type="button"
              role="radio"
              aria-checked={backdrop === b.id}
              onClick={() => setBackdrop(b.id)}
              className={`h-7 rounded-full border px-2.5 text-[11px] transition ${
                backdrop === b.id ? "border-ink bg-ink text-card" : "border-line bg-card/70 hover:border-ink/40"
              }`}
            >
              {b.label}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-3 items-end gap-2">
        {IDS.map((id) => (
          <figure key={id} className="flex flex-col items-center gap-1.5">
            <canvas
              ref={(el) => {
                refs.current[id] = el;
              }}
              role="img"
              aria-label={`${FORMATS[id].name} preview`}
              className="block h-auto w-full rounded-md bg-ink/10 shadow-sm"
              style={{ aspectRatio: `${FORMATS[id].w} / ${FORMATS[id].h}` }}
            />
            <figcaption className="text-center leading-tight">
              <span className="block text-xs font-semibold">{FORMATS[id].name}</span>
              <span className="block text-[10px] text-muted">{FORMATS[id].hint}</span>
            </figcaption>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => save(id, false)}
                disabled={busy !== null}
                className="h-8 rounded-full border border-line bg-card px-3 text-[11px] font-semibold hover:border-ink/40 disabled:opacity-50"
              >
                {busy === id ? "…" : "Save"}
              </button>
              {canShare && (
                <button
                  type="button"
                  onClick={() => save(id, true)}
                  disabled={busy !== null}
                  aria-label={`Share ${FORMATS[id].name}`}
                  className="h-8 rounded-full border border-line bg-card px-2.5 text-[11px] hover:border-ink/40 disabled:opacity-50"
                >
                  ↗
                </button>
              )}
            </div>
          </figure>
        ))}
      </div>
      <p className="mt-1 min-h-4 text-xs text-muted" aria-live="polite">
        {msg}
      </p>
    </section>
  );
}
