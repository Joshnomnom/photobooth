"use client";

import { FILTERS } from "@/lib/filters";
import { type Settings, type Timer, resolve } from "@/lib/settings";
import { FRAMES, LAYOUTS, shotCount } from "@/lib/strip";
import { MuteButton } from "./MuteButton";
import { OptionGroup } from "./OptionGroup";

type Props = {
  settings: Settings;
  onChange: (next: Settings) => void;
  onStart: () => void;
};

const BULBS = Array.from({ length: 11 });

/** The booth seen from outside: the machine front, plus the setup panel. */
export function Outside({ settings, onChange, onStart }: Props) {
  const { layout, frame } = resolve(settings);
  const set = <K extends keyof Settings>(key: K, value: Settings[K]) => onChange({ ...settings, [key]: value });

  return (
    <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-14">
      {/* Machine front */}
      <div className="booth-cabinet mx-auto w-full max-w-[400px]">
        <div className="rounded-t-[28px] bg-ink px-5 pb-4 pt-4 text-center text-[#fbe3b5]">
          <Bulbs />
          <p className="mt-3 font-display text-[clamp(2rem,8vw,2.6rem)] italic leading-none">The Snap Room</p>
          <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.3em] text-[#fbe3b5]/70">
            {shotCount(layout)} poses · developed while you wait
          </p>
          <div className="mt-3">
            <Bulbs />
          </div>
        </div>

        <div className="bg-accent px-5 pb-6 pt-5 sm:px-6">
          <div className="booth-curtain relative grid aspect-[4/5] place-items-center overflow-hidden rounded-lg">
            <div className="booth-sign rotate-[-3deg] rounded-md bg-[#fbf3e4] px-5 py-3 text-center text-ink shadow-lg">
              <p className="font-display text-2xl italic leading-none">Step inside</p>
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">Booth is open</p>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-[#fff1e8]">
              <span className="h-11 w-2.5 rounded-full bg-black/55 shadow-[inset_0_2px_4px_rgb(0_0_0/0.6)]" aria-hidden />
              <span className="text-[11px] font-semibold uppercase leading-tight tracking-[0.18em]">
                Insert
                <br />
                smile
              </span>
            </div>
            <button type="button" onClick={onStart} className="booth-start">
              <span className="sr-only">Start the photo booth</span>
              <span aria-hidden>Start</span>
            </button>
          </div>
        </div>
        <div className="mx-3 h-5 rounded-b-xl bg-[#9c2f1d]" aria-hidden />
        <p className="mt-5 text-center text-xs text-muted">Your camera stays on this device. Nothing is uploaded.</p>
      </div>

      {/* Setup */}
      <section aria-labelledby="setup-title" className="rounded-2xl border border-line bg-card/70 p-5 sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 id="setup-title" className="font-display text-2xl">Set up your strip</h2>
            <p className="mt-1 text-sm text-muted">Pick your look, then press Start.</p>
          </div>
          <MuteButton className="-mr-2 -mt-1 text-muted hover:bg-ink/5 hover:text-ink" />
        </div>

        <div className="space-y-5">
          <OptionGroup
            label="Mode"
            value={settings.mode}
            onChange={(v) => set("mode", v)}
            options={[
              { id: "film", label: "Film", title: "One press, the whole strip. No retakes, like a real booth." },
              { id: "digital", label: "Digital", title: "One shot per press. Retake as often as you like." },
            ]}
          />
          <p className="-mt-3 text-xs text-muted">
            {settings.mode === "film"
              ? "One press shoots the whole strip. No retakes, just like the real thing."
              : "Take shots one by one and retake any you don't like."}
          </p>
          <OptionGroup
            label="Strip"
            value={settings.layoutId}
            onChange={(v) => set("layoutId", v)}
            options={LAYOUTS.map((l) => ({ id: l.id, label: l.name }))}
          />
          <OptionGroup
            label="Film look"
            value={settings.filterId}
            onChange={(v) => set("filterId", v)}
            options={FILTERS.map((f) => ({ id: f.id, label: f.name }))}
          />
          <OptionGroup
            label="Paper"
            value={frame.id}
            onChange={(v) => set("frameId", v)}
            options={FRAMES.map((f) => ({
              id: f.id,
              label: (
                <>
                  <span className="size-3.5 rounded-full border border-black/15" style={{ background: f.paper }} aria-hidden />
                  {f.name}
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

function Bulbs() {
  return (
    <div className="flex justify-between px-1" aria-hidden>
      {BULBS.map((_, i) => (
        <span key={i} className="booth-bulb" style={{ animationDelay: `${(i % 3) * 0.6}s` }} />
      ))}
    </div>
  );
}
