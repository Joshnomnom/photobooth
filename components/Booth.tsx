"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CANVAS_FONTS } from "@/lib/fonts";
import type { Shot } from "@/lib/look";
import { randomSeed } from "@/lib/random";
import { DEFAULT_SETTINGS, type Settings, resolve } from "@/lib/settings";
import { play, unlockAudio } from "@/lib/sound";
import { shotCount, type StripOptions } from "@/lib/strip";
import { BoothInterior } from "./BoothInterior";
import { Collected } from "./Collected";
import { Outside } from "./Outside";
import { PrintSlot } from "./PrintSlot";

/** outside → booth → printing → collected. See docs/PLAN.md, Phase 1. */
type Stage = "outside" | "booth" | "printing" | "collected";

export function Booth() {
  const [stage, setStage] = useState<Stage>("outside");
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [shots, setShots] = useState<(Shot | null)[]>([]);
  const [seed, setSeed] = useState(1);
  const [caption, setCaption] = useState("");
  const [showDate, setShowDate] = useState(true);

  const { machine, layout, paper } = resolve(settings);

  const strip: StripOptions = useMemo(
    () => ({
      layout,
      paper,
      style: machine.strip,
      shots: shots.map((s) => s?.canvas ?? null),
      caption,
      showDate,
      fonts: CANVAS_FONTS,
      seed,
    }),
    [layout, paper, machine, shots, caption, showDate, seed],
  );

  // The booth and print slot are full-screen; keep the page behind them still.
  const immersive = stage === "booth" || stage === "printing";
  useEffect(() => {
    if (!immersive) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [immersive]);

  /** Must run inside the click handler, so audio can unlock. */
  const enterBooth = useCallback(() => {
    unlockAudio();
    play("coin");
    setShots(Array(shotCount(layout)).fill(null));
    setSeed(randomSeed());
    setStage("booth");
  }, [layout]);

  const onShot = useCallback((slot: number, shot: Shot | null) => {
    setShots((prev) => prev.map((s, i) => (i === slot ? shot : s)));
  }, []);

  const toOutside = useCallback(() => setStage("outside"), []);
  const toPrinting = useCallback(() => setStage("printing"), []);
  const toCollected = useCallback(() => {
    setStage("collected");
    window.scrollTo({ top: 0 });
  }, []);

  return (
    <>
      {(stage === "outside" || stage === "booth") && (
        <Outside settings={settings} onChange={setSettings} onStart={enterBooth} />
      )}
      {stage === "booth" && (
        <BoothInterior settings={settings} shots={shots} seed={seed} onShot={onShot} onPrint={toPrinting} onExit={toOutside} />
      )}
      {stage === "printing" && <PrintSlot strip={strip} machine={machine} onCollect={toCollected} />}
      {stage === "collected" && (
        <Collected strip={strip} onCaption={setCaption} onShowDate={setShowDate} onAgain={enterBooth} onSetup={toOutside} />
      )}
    </>
  );
}
