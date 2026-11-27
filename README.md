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

The session moves through four stages: **outside → booth → printing → collected**.

| Path | What it does |
| --- | --- |
| `components/Booth.tsx` | Stage orchestrator, session state |
| `components/Outside.tsx` | Row of booths (swipe/scroll) + setup panel |
| `components/BoothCabinet.tsx` | One booth's exterior, colored by its machine |
| `components/Countdown.tsx` | Per-machine countdown styles, incl. seven-segment LCD |
| `components/BoothInterior.tsx` | Full-screen booth: curtain, camera, countdown, flash, capture sequence |
| `components/PrintSlot.tsx` | Strip prints out of the slot and develops |
| `components/Collected.tsx` | Caption, download, share, go again |
| `components/CameraBlocked.tsx` | "Booth closed" screen with per-browser steps |
| `lib/look.ts` | Film look pipeline applied at capture (drift, color, vignette, halation, grain) |
| `lib/machines.ts` | The machines ('62, '79, '98, '04): look, papers, strip style, sounds, colors |
| `lib/filters.ts` | Color matrix ops, shared by the CSS preview and the capture |
| `lib/sevenSeg.ts` | Seven-segment digits for the date stamp and LCD countdown |
| `lib/strip.ts` | Layouts and strip rendering: corners, captions, decorations, date stamp (preview, print and download all use it) |
| `lib/sound.ts` | Synthesized Web Audio sounds with per-machine profiles + mute state |
| `lib/useCamera.ts` | Camera lifecycle, device switching, error types |
| `lib/settings.ts` | Setup options, defaults, pose prompts |

Plans and research live in [docs/](docs/README.md).

## Deploy

It's a plain Next.js app with no backend or environment variables, so it deploys to Vercel as-is.
