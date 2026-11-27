"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { type Decorations, EMPTY_DECORATIONS } from "@/lib/decorations";
import { CANVAS_FONTS } from "@/lib/fonts";
import type { Shot } from "@/lib/look";
import { randomSeed } from "@/lib/random";
import { DEFAULT_SETTINGS, loadSettings, resolve, saveSettings, type Settings } from "@/lib/settings";
import { play, unlockAudio } from "@/lib/sound";
import { shotCount, type StripOptions } from "@/lib/strip";
import { BoothInterior } from "./BoothInterior";
import { Collected } from "./Collected";
import { Outside } from "./Outside";
import { Darkroom } from "./Darkroom";
import { Gallery } from "./Gallery";

/**
 * The building of rooms (docs/research/05-art-direction.md):
 * street (outside) → booth → darkroom (printing) → studio table (collected), plus the gallery.
 */
type Stage = "outside" | "booth" | "printing" | "collected" | "gallery";

const ROOM: Record<Stage, string> = {
  outside: "street",
  booth: "street",
  printing: "street",
  collected: "table",
  gallery: "gallery",
};

export function Booth() {
  const [stage, setStage] = useState<Stage>("outside");
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [shots, setShots] = useState<(Shot | null)[]>([]);
  const [seed, setSeed] = useState(1);
  const [caption, setCaption] = useState("");
  const [showDate, setShowDate] = useState(true);
  const [decorations, setDecorations] = useState<Decorations>(EMPTY_DECORATIONS);

  const { machine, layout, paper, style, sound, filter, occasion } = resolve(settings);

  // Remember the setup in this browser. Loading has to wait until after hydration.
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    const saved = loadSettings();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (saved) setSettings(saved);
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (loaded) saveSettings(settings);
  }, [settings, loaded]);

  const strip: StripOptions = useMemo(
    () => ({
      layout,
      paper,
      style,
      shots: shots.map((s) => s?.canvas ?? null),
      caption,
      showDate,
      fonts: CANVAS_FONTS,
      seed,
    }),
    [layout, paper, style, shots, caption, showDate, seed],
  );

  // Each room sets its own light on the page (see "Rooms" in globals.css).
  useEffect(() => {
    document.body.dataset.room = ROOM[stage];
  }, [stage]);

  // The booth and darkroom are full-screen; keep the page behind them still.
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
    setDecorations(EMPTY_DECORATIONS);
    setStage("booth");
  }, [layout]);

  const onShot = useCallback((slot: number, shot: Shot | null) => {
    setShots((prev) => prev.map((s, i) => (i === slot ? shot : s)));
  }, []);

  const toOutside = useCallback(() => {
    setStage("outside");
    window.scrollTo({ top: 0 });
  }, []);
  const toGallery = useCallback(() => {
    setStage("gallery");
    window.scrollTo({ top: 0 });
  }, []);
  const toPrinting = useCallback(() => setStage("printing"), []);
  const toCollected = useCallback(() => {
    setStage("collected");
    window.scrollTo({ top: 0 });
  }, []);

  return (
    <>
      {(stage === "outside" || stage === "booth") && (
        <Outside settings={settings} onChange={setSettings} onStart={enterBooth} onGallery={toGallery} />
      )}
      {stage === "gallery" && <Gallery onBack={toOutside} />}
      {stage === "booth" && (
        <BoothInterior settings={settings} shots={shots} seed={seed} onShot={onShot} onPrint={toPrinting} onExit={toOutside} />
      )}
      {stage === "printing" && <Darkroom strip={strip} machine={machine} sound={sound} onCollect={toCollected} />}
      {stage === "collected" && (
        <Collected
          strip={strip}
          machine={machine}
          decorations={decorations}
          onDecorations={setDecorations}
          onCaption={setCaption}
          onShowDate={setShowDate}
          onAgain={enterBooth}
          onSetup={toOutside}
          onGallery={toGallery}
          clips={shots.map((s) => s?.clip)}
          filter={filter}
          seed={seed}
          occasion={occasion}
        />
      )}
    </>
  );
}
