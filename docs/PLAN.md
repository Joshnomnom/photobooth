# The Snap Room · Plan

_Last updated: 2026-11-27_

## Vision

**A web photo booth that feels like stepping into a real one.** Pick a machine from another decade, pose through the flashes, and watch your strip develop in your hands. Private, instant, a little bit magic.

We are **not** building "a camera page with filters". Filters, strips and date stamps are the baseline everyone has ([competitors](research/02-competitors.md)). What sets us apart is the **ritual** and the **craft** ([research summary](research/README.md)).

## Design principles

1. **Ritual over features.** Every phase should make the session feel more like an event: start, countdown, flash, print, develop, collect.
2. **Honest imperfection.** Nostalgia comes from subtle, physical flaws (grain, glow, frame-to-frame drift, paper), never heavy overlays.
3. **Physical where it's emotional, flat where it's functional.** Booth, curtain, slot and strip are skeuomorphic. Settings are clean and fast.
4. **Instant feedback, optional waiting.** Actions respond immediately. Waits that are there for delight (like developing) are short and skippable.
5. **Private by design.** Nothing leaves the device. Say so plainly, once.
6. **Accessible by default.** ≤3 flashes/second always, reduced-motion alternatives, visible mute, full keyboard flow, screen-reader countdown.

## The target experience

```
 ┌─────────┐   ┌──────────┐   ┌───────────┐   ┌───────────┐   ┌──────────┐   ┌─────────┐
 │ Outside │ → │  Step in │ → │  Shoot    │ → │  Print +  │ → │ Decorate │ → │ Collect │
 │ the     │   │ (start + │   │ 3·2·1     │   │  develop  │   │ (opt.)   │   │ save /  │
 │ booth   │   │  camera) │   │ FLASH ×N  │   │  strip    │   │          │   │ share / │
 │ pick a  │   │          │   │           │   │  slides   │   │ stickers │   │ wall    │
 │ machine │   │          │   │           │   │  out      │   │ pen      │   │         │
 └─────────┘   └──────────┘   └───────────┘   └───────────┘   └──────────┘   └─────────┘
```

---

## Roadmap

Status key: ✅ done · 🔨 in progress · ⏳ next · 💤 later

### Phase 0 · Foundation ✅

Clean rebuild of the app (commit `0d1fc90`, branch `rework-booth`).

- [x] Split into components and lib modules
- [x] One renderer for preview + export (they always match)
- [x] Cross-browser filters (no `ctx.filter`; Safari works)
- [x] Camera hook: device switching, cleanup, specific error messages
- [x] Timer, take one / take all / cancel, retake, caption, date, mirror
- [x] Keyboard shortcuts, Web Share, responsive layout
- [x] Project docs and research

### Phase 1 · The Machine ⏳

**Goal: the session feels like a real booth.** This is where we stand out.

**1.1 Session flow (state machine)**
- [ ] Replace the "page with controls" with clear stages: `outside → stepping-in → shooting → printing → collected`
- [ ] One `useBoothSession` reducer owns the stage; components just render the stage they're in
- [ ] Fixed shot cadence during a session (no fiddling between shots)
- [ ] **Film mode** (default): N shots, no retakes. **Digital mode**: retakes allowed (today's behavior)

**1.2 Outside the booth / step in**
- [ ] Booth "exterior" landing: machine front, marquee name, big **Start** button
- [ ] Start = unlock audio + ask for the camera in one motivated gesture ([research](research/03-ux-ui.md#camera-permission-flow))
- [ ] Curtain-open transition into the camera view (a fade under reduced motion)
- [ ] Redesigned denied state: "Booth closed" card with steps for the detected browser and OS

**1.3 Shooting**
- [ ] Full-screen camera view on mobile; shutter bottom-center with space around it
- [ ] Countdown styled like the machine (e.g., lit numbers), announced via `aria-live`
- [ ] Whole-screen flash per shot (single flash, ≥1s apart, so WCAG 2.3.1 is safe)
- [ ] "Pose 2 of 4" style prompts between shots

**1.4 Print and develop** ⭐ signature moment
- [ ] Strip slides out of a print slot after the last shot
- [ ] Develop animation: blank → faint sepia → full color, easing in (about 8s)
- [ ] Tap or press any key to skip; the final render and PNG are prepared during the animation (honest wait)
- [ ] Reduced motion: short crossfade, no sliding

**1.5 Film look v1** ([technical notes](research/04-technical.md#film-look-pipeline))
- [ ] Grain that follows brightness (monochrome, strongest in shadows and midtones)
- [ ] Vignette
- [ ] Halation (bright areas → blur → warm tint, added back)
- [ ] Slight per-shot exposure/white-balance drift (seeded)
- [ ] Paper texture + soft photo edges in strip composition
- [ ] Live preview approximates the look (CSS/SVG overlays); export is exact

**1.6 Sound**
- [ ] Synthesized Web Audio sound kit: coin/start, tick, shutter clunk, print whirr, strip drop ([sound map](research/03-ux-ui.md#feedback-sound-and-haptics))
- [ ] Visible mute toggle, remembered per device; never the only signal
- [ ] `navigator.vibrate` on shutter where supported

**Done when:** a first-time visitor can go start → strip in hand without reading any instructions, and the develop moment gets a reaction.

### Phase 2 · Machines (eras) 💤

**Goal: each machine is a whole identity, not a filter.** Replaces today's Filter + Frame pickers.

- [ ] `Machine` config: look pipeline settings, paper, frame layout, typography, countdown style, sound variant, booth exterior color
- [ ] Starter set (names are drafts):
  - **'62 Chemical**: black-and-white, silver tone, heavy grain, cream paper, 4-shot strip
  - **'79 Color**: faded warm color, halation, rounded photo corners
  - **'98 Sticker**: bright pastel, purikura-style frame, cute type, sticker-sheet layout
  - **'04 Disposable**: harsh flash, orange LCD-style date stamp, slight light leak
- [ ] Machine picker on the "outside" screen: walk along a row of booths (swipe on mobile)
- [ ] Optional: move the look pipeline to WebGL for an exact live preview

### Phase 3 · Decorate 💤

**Goal: purikura-style play after the shoot.**

- [ ] Sticker drawer (stickers we make ourselves; each machine has its own set)
- [ ] Drag, scale and rotate stickers; pen tool with a few colors; stamped caption
- [ ] Optional playful timer ("60 seconds to decorate!"), off by default
- [ ] Undo / clear
- [ ] Decorations baked into the export via the same renderer

### Phase 4 · Keepsakes 💤

**Goal: strips have an afterlife.**

- [ ] Scrapbook wall: finished strips pinned to a board, stored in IndexedDB on this device only
- [ ] Re-download / delete from the wall
- [ ] Print-ready export (2×6 in at 300 dpi; a double strip on 4×6 for home photo printers)
- [ ] Animated export: the shots as a looping GIF/WebM "flipbook"
- [ ] Seasonal limited frames (a reason to come back)

### Explicitly out of scope

- Face reshaping or beautify filters (off-brand; body-image concerns)
- Celebrity or brand frames (licensing; imitates real people)
- Accounts, cloud storage, uploads of any kind

---

## Open questions

| Question | Options | Leaning |
| --- | --- | --- |
| Default mode | Film (no retakes) vs Digital | Film by default, with Digital one tap away |
| Sound default | On vs off | On after the Start press (that's a user gesture), with a visible mute |
| Keep the name "The Snap Room"? | Keep / rename | Keep for now |
| Sounds: synthesized or samples? | Synth vs recorded | Synth first; samples only if synth feels fake |
| Live preview fidelity | CSS approximation vs WebGL | CSS in Phase 1; WebGL in Phase 2 if needed |

## Decision log

| Date | Decision | Why |
| --- | --- | --- |
| 2026-11-27 | Rebuilt from scratch on Next.js + Tailwind, all client-side | Old code was one minified file with leftover scaffold code and bugs |
| 2026-11-27 | Own pixel pipeline instead of `ctx.filter` | Safari doesn't support `ctx.filter` |
| 2026-11-27 | Focus on ritual + craft as the point of difference | Research: baseline features are already common; the experience is not |
