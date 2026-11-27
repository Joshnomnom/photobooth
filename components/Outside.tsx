"use client";

import { useEffect, useRef } from "react";
import { MACHINES } from "@/lib/machines";
import { type Settings, type Timer, resolve, withMachine } from "@/lib/settings";
import { preloadSounds } from "@/lib/sound";
import { layoutById, shotCount } from "@/lib/strip";
import { BoothCabinet } from "./BoothCabinet";
import { MuteButton } from "./MuteButton";
import { OptionGroup } from "./OptionGroup";

type Props = {
  settings: Settings;
  onChange: (next: Settings) => void;
  onStart: () => void;
};

/** Outside: a row of booths to walk along (swipe on mobile), plus setup for the chosen one. */
export function Outside({ settings, onChange, onStart }: Props) {
  const { machine, layout, paper } = resolve(settings);
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
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-12">
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
                  shots={shotCount(i === index ? layout : layoutById(m.layouts[0]))}
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
            className="absolute left-0 top-1/2 hidden size-11 -translate-y-1/2 place-items-center rounded-full border border-line bg-card text-lg shadow-md hover:bg-white sm:grid"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => select(index + 1)}
            aria-label="Next machine"
            className="absolute right-0 top-1/2 hidden size-11 -translate-y-1/2 place-items-center rounded-full border border-line bg-card text-lg shadow-md hover:bg-white sm:grid"
          >
            ›
          </button>
        </div>
        <p className="text-center text-xs text-muted">
          <span className="sm:hidden">Swipe to walk along the booths. </span>Your camera stays on this device.
        </p>
      </div>

      {/* Setup for the chosen machine */}
      <section aria-labelledby="setup-title" className="rounded-2xl border border-line bg-card/70 p-5 sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">Set up your strip</p>
            <h2 id="setup-title" className="mt-1 font-display text-2xl">
              <span className="italic">{machine.year}</span> {machine.name}
            </h2>
            <p className="mt-1 text-sm text-muted">{machine.tagline}</p>
          </div>
          <MuteButton className="-mr-2 -mt-1 shrink-0 text-muted hover:bg-ink/5 hover:text-ink" />
        </div>

        <div className="space-y-5">
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
            options={machine.layouts.map((id) => ({ id, label: layoutById(id).name }))}
          />
          <OptionGroup
            label="Paper"
            value={paper.id}
            onChange={(v) => set("paperId", v)}
            options={machine.papers.map((p) => ({
              id: p.id,
              label: (
                <>
                  <span className="size-3.5 rounded-full border border-black/15" style={{ background: p.paper }} aria-hidden />
                  {p.name}
                </>
              ),
            }))}
          />
          <OptionGroup
            label="Countdown"
            value={settings.timer}
            onChange={(v: Timer) => set("timer", v)}
            options={(["3", "5", "10"] as const).map((t) => ({ id: t, label: `${t}s` }))}
          />
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={settings.mirror}
              onChange={(e) => set("mirror", e.target.checked)}
              className="size-4 accent-accent"
            />
            Mirror the camera (like a mirror, not a photo)
          </label>
        </div>
      </section>
    </div>
  );
}
