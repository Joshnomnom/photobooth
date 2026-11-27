"use client";

import type { CSSProperties } from "react";
import type { Machine } from "@/lib/machines";

const BULBS = Array.from({ length: 9 });

/**
 * Real vintage booth strips (CC0, see public/assets/CREDITS.txt) shown in each
 * machine's sample window, like the display panel on a real booth.
 * "stack" turns the horizontal 4-pose strip into a vertical one, frame by frame.
 */
const SAMPLES: Record<string, { src: string; layout: "vertical" | "stack"; filter?: string }> = {
  "chemical-62": { src: "/assets/booth-strip-a.webp", layout: "vertical" },
  "color-79": { src: "/assets/booth-strip-vintage.webp", layout: "stack", filter: "sepia(0.35) saturate(1.2)" },
  "sticker-98": { src: "/assets/booth-strip-b.webp", layout: "vertical", filter: "sepia(0.4) hue-rotate(-35deg) saturate(1.6) brightness(1.08)" },
  "disposable-04": { src: "/assets/booth-strip-vintage.webp", layout: "stack", filter: "contrast(1.2) saturate(1.3)" },
};

type Props = {
  machine: Machine;
  active: boolean;
  shots: number;
  onSelect: () => void;
  onStart: () => void;
};

/** One booth on the street: painted steel, velvet curtain, chrome, and a sample window. */
export function BoothCabinet({ machine, active, shots, onSelect, onStart }: Props) {
  const ex = machine.exterior;
  const sample = SAMPLES[machine.id] ?? SAMPLES["chemical-62"];
  const vars = {
    "--cab-body": ex.body,
    "--cab-base": ex.base,
    "--cab-marquee": ex.marquee,
    "--cab-text": ex.marqueeText,
    "--curtain-a": ex.curtain[0],
    "--curtain-b": ex.curtain[1],
    "--curtain-c": ex.curtain[2],
    "--start-text": ex.startText,
  } as CSSProperties;

  return (
    <div
      style={vars}
      role="presentation"
      className={`booth-cabinet transition duration-300 ${active ? "scale-100 opacity-100" : "scale-[0.9] opacity-50 hover:opacity-75"}`}
      onClick={active ? undefined : onSelect}
      aria-hidden={!active}
    >
      {/* Marquee */}
      <div className="rounded-t-[26px] bg-[var(--cab-marquee)] px-4 pb-3 pt-3 text-center text-[var(--cab-text)] shadow-[inset_0_-6px_12px_rgb(0_0_0/0.35)]">
        <Bulbs active={active} />
        <p className="mt-2 flex items-baseline justify-center gap-2 leading-none">
          <span className="font-display text-[2.4rem] italic">{machine.year}</span>
          <span className="text-sm font-bold uppercase tracking-[0.25em]">{machine.name}</span>
        </p>
        <p className="mt-1.5 text-[9px] font-semibold uppercase tracking-[0.28em] opacity-70">The Snap Room · {shots} poses</p>
        <div className="mt-2">
          <Bulbs active={active} />
        </div>
      </div>

      {/* Body: painted steel */}
      <div className="cabinet-metal px-4 pb-5 pt-4">
        <div className="flex items-stretch gap-3">
          <div className="booth-curtain relative grid flex-1 place-items-center overflow-hidden rounded-md shadow-[inset_0_6px_14px_rgb(0_0_0/0.55)]">
            <div className="aspect-[3/4] w-full" />
            <div className="absolute rotate-[-3deg] rounded-md bg-[#fbf3e4] px-3.5 py-2 text-center text-[#1c1a17] shadow-lg">
              <p className="font-display text-lg italic leading-none">Step inside</p>
              <p className="mt-1 text-[8px] font-semibold uppercase tracking-[0.2em] text-[#6f675d]">Booth is open</p>
            </div>
          </div>

          {/* Sample window */}
          <div className="flex w-[19%] flex-col items-center gap-1">
            <span className="text-[7px] font-bold uppercase tracking-[0.2em] text-white/85">Samples</span>
            <div className="chrome-bezel w-full rounded-[3px] p-[3px]">
              <div className="sample-glass bg-[#e9e2d3] p-[2px]" style={{ filter: sample.filter }}>
                {sample.layout === "vertical" ? (
                  // eslint-disable-next-line @next/next/no-img-element -- small static asset
                  <img src={sample.src} alt="" className="block h-auto w-full" loading="lazy" />
                ) : (
                  <div className="grid gap-[2px]">
                    {[0, 1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="aspect-[3/4] w-full"
                        style={{ backgroundImage: `url(${sample.src})`, backgroundSize: "400% auto", backgroundPosition: `${(i * 100) / 3}% 50%` }}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="chrome-bezel grid h-12 w-5 place-items-center rounded-[4px]" aria-hidden>
              <span className="h-8 w-1 rounded-full bg-black/80" />
            </span>
            <p className="max-w-[8.5rem] text-[11px] leading-snug text-white/90 [text-shadow:0_1px_2px_rgb(0_0_0/0.5)]">{machine.tagline}</p>
          </div>
          <span className="chrome-bezel shrink-0 rounded-full p-1.5">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onStart();
              }}
              disabled={!active}
              tabIndex={active ? 0 : -1}
              className="booth-start"
            >
              <span className="sr-only">
                Start the {machine.year} {machine.name} booth
              </span>
              <span aria-hidden>Start</span>
            </button>
          </span>
        </div>
      </div>
      <div className="mx-3 h-4 rounded-b-xl bg-[var(--cab-base)] shadow-[0_10px_20px_rgb(0_0_0/0.5)]" aria-hidden />
    </div>
  );
}

function Bulbs({ active }: { active: boolean }) {
  return (
    <div className="flex justify-between px-1" aria-hidden>
      {BULBS.map((_, i) => (
        <span key={i} className={`booth-bulb ${active ? "" : "booth-bulb-off"}`} style={{ animationDelay: `${(i % 3) * 0.6}s` }} />
      ))}
    </div>
  );
}
