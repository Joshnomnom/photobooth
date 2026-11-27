"use client";

import { useEffect, useState } from "react";
import { canvasToBlob, drawStrip, type StripOptions, stripFilename } from "@/lib/strip";
import { StripPreview } from "./StripPreview";

type Props = {
  strip: StripOptions;
  onCaption: (caption: string) => void;
  onShowDate: (show: boolean) => void;
  onAgain: () => void;
  onSetup: () => void;
};

/** The strip in your hands: caption it, save it, share it, or go again. */
export function Collected({ strip, onCaption, onShowDate, onAgain, onSetup }: Props) {
  const [canShare, setCanShare] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const probe = new File([], "x.png", { type: "image/png" });
    // Feature detection has to run on the client, after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCanShare(typeof navigator.canShare === "function" && navigator.canShare({ files: [probe] }));
  }, []);

  async function exportStrip() {
    const canvas = document.createElement("canvas");
    await document.fonts?.ready;
    drawStrip(canvas, strip);
    return canvasToBlob(canvas);
  }

  async function download() {
    setError("");
    try {
      const url = URL.createObjectURL(await exportStrip());
      const a = document.createElement("a");
      a.href = url;
      a.download = stripFilename();
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setError("Couldn't save the image. Please try again.");
    }
  }

  async function share() {
    setError("");
    try {
      const file = new File([await exportStrip()], stripFilename(), { type: "image/png" });
      await navigator.share({ files: [file], title: "The Snap Room" });
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError("Sharing isn't available right now. Try downloading instead.");
    }
  }

  return (
    <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-14">
      <div className="strip-land min-w-0 py-4">
        <div className="mx-auto w-fit rotate-[-2deg]">
          <StripPreview {...strip} />
        </div>
      </div>

      <section aria-labelledby="collected-title" className="rounded-2xl border border-line bg-card/70 p-5 sm:p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">Fresh out of the booth</p>
        <h2 id="collected-title" className="mt-1 font-display text-3xl">
          Your strip is ready
        </h2>

        <label className="mt-6 block">
          <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">Caption</span>
          <input
            value={strip.caption}
            onChange={(e) => onCaption(e.target.value)}
            maxLength={40}
            placeholder="The Snap Room"
            className="h-11 w-full rounded-lg border border-line bg-card px-3 text-sm placeholder:text-muted/70"
          />
        </label>
        <label className="mt-3 inline-flex items-center gap-2 text-sm">
          <input type="checkbox" checked={strip.showDate} onChange={(e) => onShowDate(e.target.checked)} className="size-4 accent-accent" />
          Print the date
        </label>

        <div className="mt-6 grid gap-2">
          <button
            type="button"
            onClick={download}
            className="h-12 rounded-full bg-accent text-sm font-semibold text-white transition-colors hover:bg-accent-dark"
          >
            Download PNG
          </button>
          {canShare && (
            <button type="button" onClick={share} className="h-12 rounded-full border border-ink text-sm font-semibold">
              Share
            </button>
          )}
          {error && (
            <p role="alert" className="text-center text-sm text-accent-dark">
              {error}
            </p>
          )}
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4 text-sm">
          <button type="button" onClick={onAgain} className="h-10 rounded-full bg-ink px-5 font-semibold text-card hover:bg-ink/85">
            Take another
          </button>
          <button type="button" onClick={onSetup} className="h-10 px-2 text-muted underline-offset-4 hover:text-ink hover:underline">
            Change setup
          </button>
        </div>
        <p className="mt-4 text-xs text-muted">Download before you leave. Nothing is saved on our side.</p>
      </section>
    </div>
  );
}
