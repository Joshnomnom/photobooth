"use client";

import { useEffect, useRef, useState } from "react";
import { downloadBlob, fileStamp } from "@/lib/download";
import { machineById } from "@/lib/machines";
import { printSheet } from "@/lib/printSheet";
import { deleteStrip, listStrips, onWallChanged, type SavedStrip } from "@/lib/scrapbook";

type Item = { strip: SavedStrip; url: string };

/** Small stable tilt per strip, so the wall looks hand-pinned. */
function tilt(id: string) {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return ((h % 9) - 4) * 0.8;
}

/** The scrapbook wall: strips pinned on this device, newest first. Hidden until there's one. */
export function Wall() {
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    let urls: string[] = [];
    let cancelled = false;
    const load = () =>
      listStrips()
        .then((list) => {
          if (cancelled) return;
          urls.forEach((u) => URL.revokeObjectURL(u));
          urls = list.map((s) => URL.createObjectURL(s.blob));
          setItems(list.map((strip, i) => ({ strip, url: urls[i] })));
        })
        .catch(() => {
          if (!cancelled) setError("Your wall isn't available in this browser mode.");
        });
    load();
    const off = onWallChanged(load);
    return () => {
      cancelled = true;
      off();
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, []);

  const open = items.find((i) => i.strip.id === openId) ?? null;

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  if (items.length === 0) return error ? <p className="mt-10 text-center text-xs text-muted">{error}</p> : null;

  const close = () => {
    setOpenId(null);
    setConfirming(false);
  };

  async function print(item: Item) {
    setBusy(true);
    try {
      const bmp = await createImageBitmap(item.strip.blob);
      downloadBlob(await printSheet(bmp), `${fileStamp(new Date(item.strip.createdAt))}-print-4x6.png`);
      bmp.close();
    } finally {
      setBusy(false);
    }
  }

  async function remove(item: Item) {
    await deleteStrip(item.strip.id).catch(() => setError("Couldn't delete that strip."));
    close();
  }

  return (
    <section aria-labelledby="wall-title" className="mt-16">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 id="wall-title" className="font-display text-3xl">
            Your wall
          </h2>
          <p className="mt-1 text-sm text-muted">
            {items.length} {items.length === 1 ? "strip" : "strips"} pinned. Saved only in this browser.
          </p>
        </div>
      </div>

      <div className="corkboard rounded-2xl p-6 sm:p-8">
        <ul className="flex flex-wrap items-start justify-center gap-6 sm:justify-start">
          {items.map((item) => {
            const m = machineById(item.strip.machineId);
            return (
              <li key={item.strip.id} style={{ transform: `rotate(${tilt(item.strip.id)}deg)` }}>
                <button
                  type="button"
                  onClick={() => setOpenId(item.strip.id)}
                  className="group relative block transition hover:-translate-y-1"
                  aria-label={`Open strip from ${new Date(item.strip.createdAt).toLocaleDateString()}, ${m.year} ${m.name}`}
                >
                  <span className="wall-tape" aria-hidden />
                  {/* eslint-disable-next-line @next/next/no-img-element -- local object URL */}
                  <img
                    src={item.url}
                    alt=""
                    className={`block h-auto shadow-[0_10px_20px_-6px_rgb(0_0_0/0.45)] ${item.strip.width / item.strip.height < 0.5 ? "w-24 sm:w-28" : "w-40 sm:w-48"}`}
                  />
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Backdrop click is a mouse shortcut only; Esc (native) and the Close button cover keyboard users. */}
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions */}
      <dialog
        ref={dialogRef}
        onClose={close}
        onClick={(e) => {
          if (e.target === dialogRef.current) close();
        }}
        className="m-auto max-h-[92dvh] w-[min(92vw,720px)] rounded-2xl bg-card p-0 text-ink backdrop:bg-black/60"
      >
        {open && (
          <div className="grid gap-5 p-5 sm:grid-cols-[minmax(0,1fr)_220px] sm:p-6">
            {/* eslint-disable-next-line @next/next/no-img-element -- local object URL */}
            <img src={open.url} alt="Pinned strip" className="mx-auto block max-h-[70dvh] w-auto max-w-full shadow-lg" />
            <div className="flex flex-col gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">
                {machineById(open.strip.machineId).year} {machineById(open.strip.machineId).name}
              </p>
              <p className="font-display text-xl">
                {new Date(open.strip.createdAt).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })}
              </p>
              <button
                type="button"
                onClick={() => downloadBlob(open.strip.blob, `${fileStamp(new Date(open.strip.createdAt))}.jpg`)}
                className="mt-3 h-11 rounded-full bg-accent text-sm font-semibold text-white hover:bg-accent-dark"
              >
                Download
              </button>
              <button type="button" onClick={() => print(open)} disabled={busy} className="h-11 rounded-full border border-ink text-sm font-semibold disabled:opacity-50">
                {busy ? "Preparing…" : "Print-ready 4×6"}
              </button>
              {confirming ? (
                <div className="mt-2 rounded-xl bg-ink/5 p-3 text-sm">
                  <p>Remove this strip from your wall?</p>
                  <div className="mt-2 flex gap-2">
                    <button type="button" onClick={() => remove(open)} className="h-9 rounded-full bg-accent-dark px-4 text-sm font-semibold text-white">
                      Remove
                    </button>
                    <button type="button" onClick={() => setConfirming(false)} className="h-9 rounded-full px-3 text-sm text-muted hover:text-ink">
                      Keep
                    </button>
                  </div>
                </div>
              ) : (
                <button type="button" onClick={() => setConfirming(true)} className="h-10 text-sm text-muted hover:text-ink">
                  Remove from wall
                </button>
              )}
              <button type="button" onClick={close} className="mt-auto h-10 text-sm text-muted hover:text-ink">
                Close
              </button>
            </div>
          </div>
        )}
      </dialog>
    </section>
  );
}
