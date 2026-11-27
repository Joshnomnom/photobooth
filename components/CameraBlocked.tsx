"use client";

import { useEffect, useRef } from "react";
import type { CameraErrorKind } from "@/lib/useCamera";

type Platform = "ios" | "android" | "safari" | "firefox" | "chromium" | "other";

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return "ios";
  if (/Android/.test(ua)) return "android";
  if (/Firefox\//.test(ua)) return "firefox";
  if (/Edg\/|Chrome\//.test(ua)) return "chromium";
  if (/Safari\//.test(ua)) return "safari";
  return "other";
}

const DENIED_STEPS: Record<Platform, string[]> = {
  chromium: [
    "Click the camera or settings icon at the left of the address bar.",
    "Set Camera to Allow.",
    "Press Try again below.",
  ],
  firefox: [
    "Click the crossed-out camera icon in the address bar.",
    "Remove the block for this site.",
    "Press Try again below.",
  ],
  safari: [
    "Open the Safari menu → Settings for this Website.",
    "Set Camera to Allow.",
    "Press Try again below.",
  ],
  ios: ["Tap “aA” in the address bar → Website Settings.", "Set Camera to Allow.", "Reload the page, then press Start."],
  android: [
    "Tap the icon at the left of the address bar → Permissions.",
    "Turn Camera on.",
    "Press Try again below.",
  ],
  other: ["Open your browser's site settings for this page.", "Allow camera access.", "Press Try again below."],
};

const COPY: Record<Exclude<CameraErrorKind, "denied">, { title: string; body: string }> = {
  insecure: {
    title: "This booth needs a secure connection",
    body: "Browsers only allow the camera on HTTPS or localhost. Open the site over https:// and try again.",
  },
  unsupported: {
    title: "This browser can't use the camera",
    body: "Try a recent version of Chrome, Safari, Firefox or Edge.",
  },
  notfound: {
    title: "We couldn't find a camera",
    body: "Plug in or enable a camera, then try again.",
  },
  busy: {
    title: "Your camera is busy",
    body: "Another app or tab is using it. Close it, then try again.",
  },
  unknown: {
    title: "The camera didn't start",
    body: "Something went wrong opening your camera. Please try again.",
  },
};

type Props = { kind: CameraErrorKind; onRetry: () => void; onExit: () => void };

/** Friendly "booth closed" card with steps for the visitor's browser. */
export function CameraBlocked({ kind, onRetry, onExit }: Props) {
  const retryRef = useRef<HTMLButtonElement>(null);
  useEffect(() => retryRef.current?.focus(), []);
  const platform = detectPlatform();
  const isMac = typeof navigator !== "undefined" && /Macintosh/.test(navigator.userAgent) && platform !== "ios";

  return (
    <div role="alertdialog" aria-labelledby="blocked-title" className="w-full max-w-md rounded-2xl bg-[#fbf3e4] p-6 text-ink shadow-2xl">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">Booth closed</p>
      {kind === "denied" ? (
        <>
          <h2 id="blocked-title" className="mt-2 font-display text-2xl">
            The booth needs your camera
          </h2>
          <p className="mt-2 text-sm text-muted">Camera access is blocked for this site. To let it in:</p>
          <ol className="mt-4 space-y-2 text-sm">
            {DENIED_STEPS[platform].map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-ink text-xs font-semibold text-card">{i + 1}</span>
                <span className="pt-0.5">{step}</span>
              </li>
            ))}
          </ol>
          {isMac && (
            <p className="mt-4 text-xs text-muted">
              Still blocked? On a Mac, check System Settings → Privacy &amp; Security → Camera, and turn on your browser.
            </p>
          )}
        </>
      ) : (
        <>
          <h2 id="blocked-title" className="mt-2 font-display text-2xl">
            {COPY[kind].title}
          </h2>
          <p className="mt-2 text-sm text-muted">{COPY[kind].body}</p>
        </>
      )}
      <div className="mt-6 flex flex-wrap gap-2">
        <button
          type="button"
          ref={retryRef}
          onClick={onRetry}
          className="h-11 rounded-full bg-accent px-6 text-sm font-semibold text-white hover:bg-accent-dark"
        >
          Try again
        </button>
        <button type="button" onClick={onExit} className="h-11 rounded-full px-5 text-sm text-muted hover:text-ink">
          Back outside
        </button>
      </div>
    </div>
  );
}
