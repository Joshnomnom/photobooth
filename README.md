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

| Path | What it does |
| --- | --- |
| `components/Booth.tsx` | The booth UI: camera, capture loop, settings, export |
| `components/StripPreview.tsx` | Live strip preview |
| `lib/strip.ts` | Layouts, frames, photo capture and strip rendering (shared by the preview and the download) |
| `lib/filters.ts` | Filters, defined once and used for both the CSS preview and the pixel-level capture (works in Safari) |
| `lib/useCamera.ts` | Camera lifecycle, device switching, error messages |

## Deploy

It's a plain Next.js app with no backend or environment variables, so it deploys to Vercel as-is.
