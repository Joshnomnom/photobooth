"use client";

import { useEffect, useRef, useState } from "react";
import { downloadBlob, fileStamp } from "@/lib/download";
import { machineById } from "@/lib/machines";
import { printSheet } from "@/lib/printSheet";
import { deleteStrip, listStrips, onWallChanged, type SavedStrip } from "@/lib/scrapbook";
import { layoutById, shotCount } from "@/lib/strip";

type Item = { strip: SavedStrip; url: string; no: number };

/** Real vintage strips (CC0) hung in the archive corner. */
const ARCHIVE = [
  { src: "/assets/booth-strip-vintage.webp", label: "Four sitters", date: "c. 1920s", wide: true },
  { src: "/assets/booth-strip-a.webp", label: "Sitter in a hat", date: "n.d.", wide: false },
  { src: "/assets/booth-strip-b.webp", label: "Sitter in a hat, again", date: "n.d.", wide: false },
];

/** How many strips are on the wall (for the gallery door on the street). */
export function useWallCount() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let cancelled = false;
    const load = () =>
      listStrips()
        .then((list) => {
          if (!cancelled) setCount(list.length);
        })
        .catch(() => {});
    load();
    const off = onWallChanged(load);
    return () => {
      cancelled = true;
      off();
    };
  }, []);
  return count;
}

/** The gallery: pinned strips exhibited on a white wall, each with a wall label. */
export function Gallery({ onBack }: { onBack: () => void }) {
  const [items, setItems] = useState<Item[]>([]);
  const [loaded, setLoaded] = useState(false);
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
          // Catalogue numbers count up from the first strip ever pinned.
          setItems(list.map((strip, i) => ({ strip, url: urls[i], no: list.length - i })));
          setLoaded(true);
        })
        .catch(() => {
          if (cancelled) return;
          setError("The gallery can't open in this browser mode (storage is blocked).");
          setLoaded(true);
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
    await deleteStrip(item.strip.id).catch(() => setError("Couldn't take that strip down."));
    close();
  }

  return (
    <div className="room-enter">
      <button type="button" onClick={onBack} className="mb-5 h-10 text-sm text-muted hover:text-ink">
        ← Back to the street
      </button>

      {/* The room, as you walk in (real photo: gallery-wall.webp, CC0) */}
      <figure className="relative overflow-hidden rounded-sm shadow-[0_30px_60px_-30px_rgb(0_0_0/0.35)]">
        {/* eslint-disable-next-line @next/next/no-img-element -- static asset */}
        <img src="/assets/gallery-wall.webp" alt="An empty gallery room with blank frames on the walls" className="h-[38vh] min-h-56 w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
        <figcaption className="absolute bottom-0 left-0 max-w-xl p-6 text-white sm:p-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-white/75">Room 5</p>
          <h2 className="mt-2 font-display text-4xl sm:text-5xl">The Gallery</h2>
          <p className="mt-2 text-sm text-white/85">
            Strips made in The Snap Room. Every one was made on this device and has never left it.
          </p>
        </figcaption>
      </figure>

      {/* The collection */}
      <section aria-label="Your strips" className="py-14">
        {error && <p className="text-center text-sm text-muted">{error}</p>}
        {loaded && !error && items.length === 0 && (
          <div className="mx-auto max-w-md py-10 text-center">
            <p className="font-display text-2xl italic">The walls are bare.</p>
            <p className="mt-2 text-sm text-muted">Step into a booth, then pin your strip from the studio table.</p>
            <button type="button" onClick={onBack} className="mt-5 h-11 rounded-full bg-ink px-6 text-sm font-semibold text-card">
              Go to the booths
            </button>
          </div>
        )}
        <ul className="flex flex-wrap items-end justify-center gap-x-14 gap-y-16">
          {items.map((item) => {
            const m = machineById(item.strip.machineId);
            const poses = shotCount(layoutById(item.strip.layoutId));
            const year = new Date(item.strip.createdAt).getFullYear();
            const narrow = item.strip.width / item.strip.height < 0.5;
            return (
              <li key={item.strip.id} className="gallery-spot flex flex-col items-center">
                <button
                  type="button"
                  onClick={() => setOpenId(item.strip.id)}
                  className="block transition duration-300 hover:-translate-y-1"
                  aria-label={`Open No. ${item.no}, Untitled (${poses} poses), ${year}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- local object URL */}
                  <img
                    src={item.url}
                    alt=""
                    className={`block h-auto shadow-[0_18px_30px_-12px_rgb(0_0_0/0.45)] ${narrow ? "w-28 sm:w-32" : "w-48 sm:w-56"}`}
                  />
                </button>
                <WallLabel
                  no={item.no}
                  title={`Untitled (${poses} poses)`}
                  date={String(year)}
                  medium={`${m.year} ${m.name} booth. Inkjet on paper.`}
                  credit="Collection of the sitter"
                />
              </li>
            );
          })}
        </ul>
      </section>

      {/* From the archive: real vintage booth strips */}
      <section aria-labelledby="archive-title" className="border-t border-line pt-10">
        <h3 id="archive-title" className="text-[11px] font-semibold uppercase tracking-[0.3em] text-muted">
          From the archive
        </h3>
        <p className="mt-2 max-w-lg text-sm text-muted">
          Real photo booth strips by unknown sitters, now in the public domain. The booth has been making portraits like these for a
          hundred years.
        </p>
        <ul className="mt-8 flex flex-wrap items-end justify-center gap-x-12 gap-y-10">
          {ARCHIVE.map((a, i) => (
            <li key={a.src} className="gallery-spot flex flex-col items-center">
              {/* eslint-disable-next-line @next/next/no-img-element -- static asset */}
              <img
                src={a.src}
                alt={`Vintage booth strip: ${a.label}`}
                loading="lazy"
                className={`block h-auto shadow-[0_18px_30px_-12px_rgb(0_0_0/0.45)] ${a.wide ? "w-72" : "w-20"}`}
              />
              <WallLabel no={`A${i + 1}`} title={a.label} date={a.date} medium="Photo booth strip. Gelatin silver print." credit="Public domain (CC0)" />
            </li>
          ))}
        </ul>
      </section>

      {/* Backdrop click is a mouse shortcut only; Esc (native) and the Close button cover keyboard users. */}
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions */}
      <dialog
        ref={dialogRef}
        onClose={close}
        onClick={(e) => {
          if (e.target === dialogRef.current) close();
        }}
        className="m-auto max-h-[92dvh] w-[min(92vw,720px)] rounded-sm bg-card p-0 text-ink backdrop:bg-black/70"
      >
        {open && (
          <div className="grid gap-6 p-5 sm:grid-cols-[minmax(0,1fr)_230px] sm:p-7">
            {/* eslint-disable-next-line @next/next/no-img-element -- local object URL */}
            <img src={open.url} alt="Pinned strip" className="mx-auto block max-h-[70dvh] w-auto max-w-full shadow-lg" />
            <div className="flex flex-col gap-2">
              <WallLabel
                no={open.no}
                title={`Untitled (${shotCount(layoutById(open.strip.layoutId))} poses)`}
                date={new Date(open.strip.createdAt).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })}
                medium={`${machineById(open.strip.machineId).year} ${machineById(open.strip.machineId).name} booth. Inkjet on paper.`}
                credit="Collection of the sitter"
              />
              <button
                type="button"
                onClick={() => downloadBlob(open.strip.blob, `${fileStamp(new Date(open.strip.createdAt))}.jpg`)}
                className="mt-4 h-11 rounded-full bg-accent text-sm font-semibold text-white hover:bg-accent-dark"
              >
                Download
              </button>
              <button type="button" onClick={() => print(open)} disabled={busy} className="h-11 rounded-full border border-ink text-sm font-semibold disabled:opacity-50">
                {busy ? "Preparing…" : "Print-ready 4×6"}
              </button>
              {confirming ? (
                <div className="mt-2 rounded-sm bg-ink/5 p-3 text-sm">
                  <p>Take this strip off the wall?</p>
                  <div className="mt-2 flex gap-2">
                    <button type="button" onClick={() => remove(open)} className="h-9 rounded-full bg-accent-dark px-4 text-sm font-semibold text-white">
                      Take it down
                    </button>
                    <button type="button" onClick={() => setConfirming(false)} className="h-9 rounded-full px-3 text-sm text-muted hover:text-ink">
                      Keep
                    </button>
                  </div>
                </div>
              ) : (
                <button type="button" onClick={() => setConfirming(true)} className="h-10 text-sm text-muted hover:text-ink">
                  Take off the wall
                </button>
              )}
              <button type="button" onClick={close} className="mt-auto h-10 text-sm text-muted hover:text-ink">
                Close
              </button>
            </div>
          </div>
        )}
      </dialog>
    </div>
  );
}

function WallLabel({ no, title, date, medium, credit }: { no: number | string; title: string; date: string; medium: string; credit: string }) {
  return (
    <div className="mt-5 w-52 border-l-2 border-ink/80 bg-card/90 py-1.5 pl-3 pr-2 text-left text-[11px] leading-snug text-muted shadow-sm">
      <p className="font-semibold tracking-[0.15em] text-ink">No. {typeof no === "number" ? String(no).padStart(3, "0") : no}</p>
      <p className="mt-1 text-ink">
        <span className="font-display text-[13px] italic">{title}</span>, {date}
      </p>
      <p>{medium}</p>
      <p>{credit}</p>
    </div>
  );
}
