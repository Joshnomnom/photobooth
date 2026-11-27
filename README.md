# The Snap Room

A private photo booth that runs entirely in the browser. Pick a layout, filter and frame, take your shots, then download (or share) the finished strip as a PNG. Nothing is uploaded or stored.

## Develop

```bash
npm install
npm run dev
```

Open http://localhost:3000 and allow camera access. Browsers only allow camera access over HTTPS or on `localhost`.

## Check

```bash
npm run check   # typecheck + lint
npm run build
```

## Structure

The site is a building of rooms: **street → booth → darkroom → studio table**, plus **the gallery**.

| Path | What it does |
| --- | --- |
| `components/Booth.tsx` | Stage orchestrator, session state |
| `components/Outside.tsx` | The street: row of booths (swipe/scroll), setup board, gallery door |
| `components/SetupPreview.tsx` | Live "what you'll get" strip preview in the setup panel |
| `components/BoothCabinet.tsx` | One booth's exterior, colored by its machine |
| `components/Countdown.tsx` | Per-machine countdown styles, incl. seven-segment LCD |
| `components/BoothInterior.tsx` | Full-screen booth: curtain, camera, countdown, flash, capture sequence |
| `components/Darkroom.tsx` | Red-lit darkroom: strip develops in a tray, then "Lights on" |
| `components/Collected.tsx` | The studio table: decorate (stickers, pen, undo, timer), caption, download, keep |
| `components/StripEditor.tsx` | Editable strip canvas: drag, turn/resize handle, pen, keyboard |
| `components/Gallery.tsx` | The gallery: pinned strips with wall labels, archive of vintage strips |
| `components/CameraBlocked.tsx` | "Booth closed" screen with per-browser steps |
| `lib/look.ts` | Film look pipeline applied at capture (drift, color, vignette, halation, grain) |
| `lib/machines.ts` | The machines ('62, '79, '98, '04): look, papers, strip style, sounds, colors |
| `lib/filters.ts` | Color matrix ops, shared by the CSS preview and the capture |
| `lib/stickers.ts` | Sticker art drawn in code (die-cut look) |
| `lib/decorations.ts` | Placed stickers + pen strokes model and drawing |
| `lib/sevenSeg.ts` | Seven-segment digits for the date stamp and LCD countdown |
| `lib/strip.ts` | Layouts and strip rendering: corners, captions, decorations, date stamp (preview, print and download all use it) |
| `lib/sound.ts` | Plays the CC0 recordings in `public/sounds/` per machine, plus the synthesized tick; mute state |
| `lib/scrapbook.ts` | IndexedDB storage for the wall (this browser only) |
| `lib/printSheet.ts` | 4×6 in, 300 dpi print sheet (two strips per sheet) |
| `lib/gif.ts`, `lib/flipbook.ts` | Animated GIF encoder and the flipbook frames |
| `lib/useCamera.ts` | Camera lifecycle, device switching, error types |
| `lib/settings.ts` | Setup options, defaults, pose prompts |

Plans and research live in [docs/](docs/README.md). Sound credits: [public/sounds/CREDITS.txt](public/sounds/CREDITS.txt). Image credits: [public/assets/CREDITS.txt](public/assets/CREDITS.txt).

## Deploy

It's a plain Next.js app with no backend or environment variables, so it deploys to Vercel as-is.
