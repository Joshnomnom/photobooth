# 06 · Real assets

Sourced 2026-11-27. Real photos and textures to mix into the "building of rooms" ([05](05-art-direction.md)), so the rooms feel physical rather than drawn.

## Rules we followed

- **CC0 / public domain only**, searched through [Openverse](https://openverse.org) with the license filter, plus ambientCG/Poly Haven as backups for textures. No "free with account" licenses, no attribution-required licenses.
- **No identifiable present-day people.** Event photo-booth shots were skipped. The vintage strips are anonymous, decades-old found photos from museum and archive collections.
- **No brands or someone else's IP.** The only real booth exterior found carries the "Photomaton" brand, so we didn't use it. A cutting-mat photo covered in Star Wars parts was skipped.
- **Check the source page, not just the index.** Flickr and WordPress pages show the CC0 badge. Rawpixel, StockSnap and the Smithsonian are behind a bot check; we rely on Openverse indexing only their CC0 collections (and StockSnap being CC0 by policy). Each file's verification level is recorded in `public/assets/CREDITS.txt`.
- **Web-ready:** resized to ≤1400 px and re-encoded as WebP, 916 KB for all 15 files. Load per room, not up front.

## What we have (`public/assets/`)

| File | What it is | Room → use |
| --- | --- | --- |
| `street-bokeh.webp` | Rain on a window, city lights blurred | **Street**: the night backdrop behind the row of booths |
| `street-lisbon.webp` | Wet Lisbon street at night | **Street**: alternative backdrop, or a reflection band under the booths |
| `curtain-flat.webp` | Full-frame red velvet curtain | **Booth**: real curtain texture on the cabinets and the interior curtain; tinted per machine (multiply blend over the machine's color) |
| `curtain-folds.webp` | Dark curtain folds | **Booth interior**: closed-curtain view while the camera wakes |
| `curtain-lit.webp` | Curtain lit from below | **Street / booth**: theatrical glow, e.g. behind the "Step inside" sign |
| `metal-brushed.webp` | Brushed steel | **Booth exterior**: cabinet panels and trim (blended under the machine's paint color) |
| `metal-chrome.webp` | Ribbed chrome | **Booth exterior**: bezels around the coin slot, Start button and print slot |
| `booth-strip-vintage.webp` | Real vintage 4-pose strip (four women, early 20th c.) | **Booth exterior**: the sample-photo window real booths have |
| `booth-strip-a.webp`, `booth-strip-b.webp` | Real vintage strips (a man in a hat, mid-20th c.) | **Booth exterior** sample window; **gallery** "from the archive" corner |
| `darkroom-timer.webp` | A real darkroom timer from a photographer's studio (Smithsonian) | **Darkroom**: on the shelf; its hand can sweep while the strip develops |
| `film-strip.webp` | 35 mm negatives with sprocket holes and edge marks | **Darkroom**: hung on the drying line; film-edge motif |
| `paper-old.webp` | Aged paper | **Studio table**: sticker backing sheet, labels, wall labels in the gallery |
| `gallery-wall.webp` | Empty gallery room with blank frames | **Gallery**: the opening view of the wall page |
| `cork.webp` | Cork board | **Studio table**: pin board edge (the gallery replaces today's corkboard wall) |

## Gaps (drawn or built instead)

- **Booth front:** no unbranded, front-on, free photo exists. We build the cabinet in CSS/SVG but **skin it with the real materials** above (brushed metal, chrome, velvet) and put **real vintage strips** in its sample window. It reads as real while staying ours.
- **Cutting mat:** drawn (green mat, grid, ruler numbers). Simple and accurate.
- **Developer tray, safelight:** built with light and color (red ambient, liquid shimmer), not photos.

## How to blend them so it looks crafted, not pasted

- **Tint, don't recolor:** put the photo under the machine color with `mix-blend-mode: multiply`/`overlay` so one curtain photo serves every machine.
- **Grade each room:** a shared CSS filter per room (night street: cool and dark; darkroom: red; gallery: neutral) keeps different photographers' shots consistent.
- **Blur backdrops** (`street-bokeh` is already out of focus) so the UI stays readable; check contrast on top.
- **Use `loading="lazy"`, or CSS backgrounds that only render in the active room.**
