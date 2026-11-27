"use client";

import type { CSSProperties } from "react";
import type { Machine } from "@/lib/machines";

const BULBS = Array.from({ length: 9 });

type Props = {
  machine: Machine;
  active: boolean;
  shots: number;
  onSelect: () => void;
  onStart: () => void;
};

/** One booth, seen from outside. Colors come from the machine's exterior. */
export function BoothCabinet({ machine, active, shots, onSelect, onStart }: Props) {
  const ex = machine.exterior;
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
      className={`booth-cabinet transition duration-300 ${active ? "scale-100 opacity-100" : "scale-[0.9] opacity-55 hover:opacity-80"}`}
      onClick={active ? undefined : onSelect}
      aria-hidden={!active}
    >
      <div className="rounded-t-[26px] bg-[var(--cab-marquee)] px-4 pb-3 pt-3 text-center text-[var(--cab-text)]">
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

      <div className="bg-[var(--cab-body)] px-4 pb-5 pt-4">
        <div className="booth-curtain relative grid aspect-[5/6] place-items-center overflow-hidden rounded-lg">
          <div className="rotate-[-3deg] rounded-md bg-[#fbf3e4] px-4 py-2.5 text-center text-ink shadow-lg">
            <p className="font-display text-xl italic leading-none">Step inside</p>
            <p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-muted">Booth is open</p>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="max-w-[9.5rem] text-[11px] leading-snug text-white/85">{machine.tagline}</p>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onStart();
            }}
            disabled={!active}
            tabIndex={active ? 0 : -1}
            className="booth-start shrink-0"
          >
            <span className="sr-only">Start the {machine.year} {machine.name} booth</span>
            <span aria-hidden>Start</span>
          </button>
        </div>
      </div>
      <div className="mx-3 h-4 rounded-b-xl bg-[var(--cab-base)]" aria-hidden />
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
