"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { LOOKS, MACHINES, PAPERS } from "@/lib/machines";
import { OCCASIONS, type Together } from "@/lib/occasions";
import { type Effects, isMixed, MIX_DEFAULTS, type Pace, resolve, type Settings, type Timer, withMachine } from "@/lib/settings";
import { preloadSounds } from "@/lib/sound";
import { LAYOUTS, shotCount } from "@/lib/strip";
import { BoothCabinet } from "./BoothCabinet";
import { useWallCount } from "./Gallery";
import { MuteButton } from "./MuteButton";
import { OptionGroup } from "./OptionGroup";
import { SetupPreview } from "./SetupPreview";

type Props = {
  settings: Settings;
  onChange: (next: Settings) => void;
  onStart: () => void;
  onGallery: () => void;
};

/** Outside: a row of booths to walk along (swipe on mobile), plus setup for the chosen one. */
export function Outside({ settings, onChange, onStart, onGallery }: Props) {
  const pinned = useWallCount();
  const { machine, layout, paper, style, filter } = useMemo(() => resolve(settings), [settings]);
  const [mixOpen, setMixOpen] = useState(false);
  const index = MACHINES.findIndex((m) => m.id === machine.id);
  const set = <K extends keyof Settings>(key: K, value: Settings[K]) => onChange({ ...settings, [key]: value });

  const scroller = useRef<HTMLDivElement>(null);
  const latest = useRef({ settings, index, onChange });
  useEffect(() => {
    latest.current = { settings, index, onChange };
  });

  const scrollToIndex = (i: number, smooth = true) => {
    const el = scroller.current;
    const item = el?.children[i] as HTMLElement | undefined;
    if (!el || !item) return;
    const left = item.offsetLeft - (el.clientWidth - item.clientWidth) / 2;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ left, behavior: smooth && !reduce ? "smooth" : "auto" });
  };

  // Fetch sound files early so the first coin sound isn't late.
  useEffect(() => preloadSounds(), []);

  // Start centered on the selected booth.
  const mounted = useRef(false);
  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;
    scrollToIndex(latest.current.index, false);
  }, []);

  // After a swipe settles, select the booth nearest the center.
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    let timer = 0;
    const onScroll = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        const center = el.scrollLeft + el.clientWidth / 2;
        let nearest = 0;
        let best = Infinity;
        [...el.children].forEach((child, i) => {
          const c = child as HTMLElement;
          const d = Math.abs(c.offsetLeft + c.clientWidth / 2 - center);
          if (d < best) {
            best = d;
            nearest = i;
          }
        });
        const cur = latest.current;
        if (nearest !== cur.index) cur.onChange(withMachine(cur.settings, MACHINES[nearest]));
      }, 120);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      window.clearTimeout(timer);
    };
  }, []);

  const select = (i: number) => {
    const next = (i + MACHINES.length) % MACHINES.length;
    onChange(withMachine(settings, MACHINES[next]));
    scrollToIndex(next);
  };

  return (
    <div className="room-enter grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-12">
      {/* The row of booths */}
      <div className="min-w-0">
        <OptionGroup
          label="Choose a machine"
          value={machine.id}
          onChange={(id) => select(MACHINES.findIndex((m) => m.id === id))}
          options={MACHINES.map((m) => ({
            id: m.id,
            label: (
              <>
                <span className="font-display italic">{m.year}</span> {m.name}
              </>
            ),
          }))}
        />

        <div className="relative mt-4">
          <div
            ref={scroller}
            className="no-scrollbar flex snap-x snap-mandatory gap-2 overflow-x-auto pb-6 pt-2"
            style={{ paddingInline: "calc(50% - min(39vw, 155px))" }}
            aria-label="Booths"
          >
            {MACHINES.map((m, i) => (
              <div key={m.id} className="w-[min(78vw,310px)] shrink-0 snap-center">
                <BoothCabinet
                  machine={m}
                  active={i === index}
                  shots={shotCount(layout)}
                  onSelect={() => select(i)}
                  onStart={onStart}
                />
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => select(index - 1)}
            aria-label="Previous machine"
            className="absolute left-0 top-1/2 hidden size-11 -translate-y-1/2 place-items-center rounded-full border border-line bg-card text-lg shadow-md backdrop-blur hover:bg-ink/10 sm:grid"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => select(index + 1)}
            aria-label="Next machine"
            className="absolute right-0 top-1/2 hidden size-11 -translate-y-1/2 place-items-center rounded-full border border-line bg-card text-lg shadow-md backdrop-blur hover:bg-ink/10 sm:grid"
          >
            ›
          </button>
        </div>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted">
            <span className="sm:hidden">Swipe to walk along the booths. </span>Your camera stays on this device.
          </p>
          <button
            type="button"
            onClick={onGallery}
            className="group inline-flex items-center gap-3 rounded-full border border-line bg-card px-4 py-2 text-sm backdrop-blur transition hover:border-ink/40"
          >
            <span className="font-display text-base italic">The Gallery</span>
            <span className="text-xs text-muted">{pinned > 0 ? `${pinned} on the wall` : "Next door"}</span>
            <span aria-hidden className="transition group-hover:translate-x-0.5">→</span>
          </button>
        </div>
      </div>

      {/* Setup for the chosen machine */}
      <section aria-labelledby="setup-title" className="rounded-2xl border border-line bg-card p-5 shadow-[0_30px_60px_-30px_rgb(0_0_0/0.8)] backdrop-blur-md sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="font-typewriter text-[11px] font-bold uppercase tracking-[0.2em] text-accent">Before you step in</p>
            <h2 id="setup-title" className="mt-1 font-display text-2xl">
              <span className="italic">{machine.year}</span> {machine.name}
            </h2>
            <p className="mt-1 text-sm text-muted">{machine.tagline}</p>
          </div>
          <MuteButton className="-mr-2 -mt-1 shrink-0 text-muted hover:bg-ink/5 hover:text-ink" />
        </div>

        <div className="space-y-5">
          <SetupPreview layout={layout} paper={paper} style={style} filter={filter} />
          <OptionGroup
            label="Mode"
            value={settings.mode}
            onChange={(v) => set("mode", v)}
            options={[
              { id: "film", label: "Film" },
              { id: "digital", label: "Digital" },
            ]}
          />
          <p className="-mt-3 text-xs text-muted">
            {settings.mode === "film"
              ? "One press shoots the whole strip. No retakes, just like the real thing."
              : "Take shots one by one and retake any you don't like."}
          </p>
          <OptionGroup
            label="Strip"
            value={layout.id}
            onChange={(v) => set("layoutId", v)}
            options={LAYOUTS.map((l) => ({
              id: l.id,
              title: `${l.name}: ${shotCount(l)} photos`,
              label: (
                <>
                  <LayoutIcon cols={l.cols} rows={l.rows} />
                  {l.name}
                </>
              ),
            }))}
          />
          <OptionGroup
            label="Countdown"
            value={settings.timer}
            onChange={(v: Timer) => set("timer", v)}
            options={(["0", "1", "3", "5", "10"] as const).map((t) => ({ id: t, label: t === "0" ? "Off" : `${t}s` }))}
          />
          <OptionGroup
            label="Occasion"
            value={settings.occasion}
            onChange={(v) => set("occasion", v)}
            options={[{ id: "none", label: "None" }, ...OCCASIONS.map((o) => ({ id: o.id, label: o.name, title: `Caption "${o.caption}", themed stickers and prompts` }))]}
          />
          <OptionGroup
            label="Who's in the booth"
            value={settings.together}
            onChange={(v: Together) => set("together", v)}
            options={[
              { id: "solo", label: "Just me" },
              { id: "couple", label: "Two of us" },
              { id: "friends", label: "The whole crew" },
            ]}
          />

          {/* Mix & match: override anything the machine sets */}
          <details open={mixOpen} onToggle={(e) => setMixOpen(e.currentTarget.open)} className="group rounded-xl border border-line">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold">
              <span className="flex items-center gap-2">
                Mix &amp; match
                {isMixed(settings) && (
                  <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">custom</span>
                )}
              </span>
              <span className="text-muted transition group-open:rotate-180" aria-hidden>
                ▾
              </span>
            </summary>
            <div className="space-y-5 border-t border-line px-4 pb-4 pt-4">
              <p className="-mt-1 text-xs text-muted">
                Borrow anything from any machine. &ldquo;Machine&rdquo; follows the {machine.year} {machine.name}.
              </p>
              <OptionGroup
                label="Film look"
                value={settings.lookId}
                onChange={(v) => set("lookId", v)}
                options={[{ id: "auto", label: "Machine" }, ...LOOKS.map((l) => ({ id: l.id, label: l.name }))]}
              />
              <OptionGroup
                label="Film effects"
                value={settings.effects}
                onChange={(v: Effects) => set("effects", v)}
                options={[
                  { id: "off", label: "Off", title: "Clean digital: no grain, glow or vignette" },
                  { id: "low", label: "Low" },
                  { id: "normal", label: "Normal" },
                  { id: "strong", label: "Strong", title: "Heavier grain, glow, vignette and light leaks" },
                ]}
              />
              <OptionGroup
                label="Paper"
                value={settings.paperId}
                onChange={(v) => set("paperId", v)}
                options={[
                  { id: "auto", label: `Machine (${machine.papers[0].name})` },
                  ...PAPERS.map((pp) => ({
                    id: pp.id,
                    label: (
                      <>
                        <span className="size-3.5 rounded-full border border-black/15" style={{ background: pp.paper }} aria-hidden />
                        {pp.name}
                      </>
                    ),
                  })),
                ]}
              />
              <div className="grid gap-5 sm:grid-cols-2">
                <OptionGroup
                  label="Photo corners"
                  value={settings.corners}
                  onChange={(v) => set("corners", v)}
                  options={[
                    { id: "auto", label: "Machine" },
                    { id: "square", label: "Square" },
                    { id: "rounded", label: "Rounded" },
                    { id: "oval", label: "Oval" },
                  ]}
                />
                <OptionGroup
                  label="Date"
                  value={settings.date}
                  onChange={(v) => set("date", v)}
                  options={[
                    { id: "auto", label: "Machine" },
                    { id: "footer", label: "Printed", title: "Printed under the caption" },
                    { id: "stamp", label: "Orange stamp", title: "Burned into each photo, like a disposable" },
                    { id: "vhs", label: "VHS", title: "PLAY, time and date on screen, like a camcorder" },
                  ]}
                />
                <OptionGroup
                  label="Frame"
                  value={settings.frame}
                  onChange={(v) => set("frame", v)}
                  options={[
                    { id: "auto", label: "Machine" },
                    { id: "plain", label: "Plain" },
                    { id: "instant", label: "Instant cards", title: "Square photos, each on a white card" },
                    { id: "receipt", label: "Receipt", title: "Header, barcode and torn edges" },
                    { id: "ornate", label: "Ornate", title: "Fine double rule around each photo" },
                  ]}
                />
                <OptionGroup
                  label="Decorations"
                  value={settings.decorations}
                  onChange={(v) => set("decorations", v)}
                  options={[
                    { id: "auto", label: "Machine" },
                    { id: "none", label: "None" },
                    { id: "sparkles", label: "Sparkles" },
                  ]}
                />
                <OptionGroup
                  label="Between poses"
                  value={settings.pace}
                  onChange={(v: Pace) => set("pace", v)}
                  options={[
                    { id: "quick", label: "Quick" },
                    { id: "normal", label: "Normal" },
                    { id: "relaxed", label: "Relaxed" },
                  ]}
                />
              </div>
              <OptionGroup
                label="Sound"
                value={settings.sound}
                onChange={(v) => set("sound", v)}
                options={[
                  { id: "auto", label: "Machine" },
                  { id: "mechanical", label: "Mechanical" },
                  { id: "classic", label: "Classic" },
                  { id: "cute", label: "Cute" },
                  { id: "plastic", label: "Plastic" },
                  { id: "victorian", label: "Victorian" },
                  { id: "instant", label: "Instant" },
                  { id: "vhs", label: "VHS" },
                  { id: "thermal", label: "Thermal" },
                ]}
              />
              <div className="flex flex-col gap-2 text-sm">
                {(
                  [
                    ["prompts", "Pose prompts (\u201CSilly face!\u201D)"],
                    ["flash", "Screen flash on each shot"],
                    ["mirror", "Mirror the camera (like a mirror, not a photo)"],
                  ] as const
                ).map(([key, text]) => (
                  <label key={key} className="inline-flex items-center gap-2">
                    <input type="checkbox" checked={settings[key]} onChange={(e) => set(key, e.target.checked)} className="size-4 accent-accent" />
                    {text}
                  </label>
                ))}
              </div>
              <button
                type="button"
                onClick={() => onChange({ ...settings, ...MIX_DEFAULTS })}
                disabled={!isMixed(settings)}
                className="h-9 rounded-full border border-line px-4 text-xs font-semibold text-muted transition hover:text-ink disabled:opacity-40"
              >
                Reset to machine defaults
              </button>
            </div>
          </details>
        </div>
      </section>
    </div>
  );
}

/** A tiny diagram of a layout's grid. */
function LayoutIcon({ cols, rows }: { cols: number; rows: number }) {
  return (
    <span
      aria-hidden
      className="grid shrink-0 gap-[1.5px] rounded-[2px] bg-current/15 p-[2px]"
      style={{ gridTemplateColumns: `repeat(${cols}, 5px)`, gridAutoRows: "4px" }}
    >
      {Array.from({ length: cols * rows }).map((_, i) => (
        <span key={i} className="rounded-[1px] bg-current opacity-70" />
      ))}
    </span>
  );
}
