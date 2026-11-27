# The Snap Room · Plan

_Last updated: 2026-11-27 (eight machines)_

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

### Phase 1 · The Machine ✅ (verify on real devices)

**Goal: the session feels like a real booth.** This is where we stand out.

**1.1 Session flow**
- [x] Clear stages instead of a "page with controls": `outside → booth → printing → collected` (`components/Booth.tsx`)
- [x] Stage lives in `Booth`; each stage is its own component (`Outside`, `BoothInterior`, `PrintSlot`, `Collected`). A reducer wasn't needed at this size
- [x] Fixed shot cadence: first countdown uses the chosen timer, then 3s between poses
- [x] **Film mode** (default): one press shoots the whole strip, no retakes, prints automatically. **Digital mode**: one shot per press, retakes, then "Print strip"

**1.2 Outside the booth / step in**
- [x] Booth exterior: marquee with bulbs, velvet curtain, "Step inside" sign, coin slot, big **Start** button (`components/Outside.tsx`)
- [x] Start = unlock audio + coin sound + camera request in one gesture
- [x] Curtain opens when the camera goes live (a fade under reduced motion)
- [x] "Booth closed" card with steps for Chrome/Edge, Firefox, Safari, iOS and Android, plus a macOS system-settings hint (`components/CameraBlocked.tsx`)

**1.3 Shooting**
- [x] Full-screen booth interior on every screen size; shutter bottom-center, Stop replaces it while shooting
- [x] Glowing countdown numerals, announced via `aria-live`
- [x] Whole-screen flash per shot (single flash, ≥1s apart)
- [x] "Pose 2 of 4 · Silly face!" prompts (shuffled per session)

**1.4 Print and develop** ⭐
- [x] Strip pushed out of the print slot in motor-like steps (3s)
- [x] Develops from blank grey-green paper → sepia → full color, easing in (about 8s total)
- [x] Tap or press any key to skip; then "Take your strip →" to collect it
- [x] Reduced motion: no sliding, a short develop fade

**1.5 Film look v1** (`lib/look.ts`)
- [x] Grain that follows brightness (monochrome, strongest in shadows and midtones)
- [x] Vignette (varies slightly per shot)
- [x] Halation (bright areas → two-scale blur → warm tint, screened back)
- [x] Seeded per-shot exposure/white-balance drift
- [x] Paper speck texture + soft photo edges in strip composition (`lib/strip.ts`)
- [x] Live preview approximates the look (CSS vignette + animated SVG grain); capture applies the real thing

**1.6 Sound** (`lib/sound.ts`)
- [x] Synthesized kit: coin, tick, curtain, shutter (two-stage clunk + flash pop), print motor whirr, strip drop
- [x] Mute toggle on the setup panel and inside the booth, remembered per device
- [x] `navigator.vibrate` on shutter (Android)

**Verified:** typecheck, lint, and headless Chrome end-to-end runs with a fake camera (film flow start → collected, digital retake, camera-denied flow, mobile viewport). No console errors.

**Still to check by hand:**
- [ ] Real phones: iOS Safari (audio unlock, silent switch, `playsinline`), Android Chrome
- [ ] Listen to the synthesized sounds and tune them
- [ ] Tune look strength (grain/halation) on real faces in different light
- [ ] Capture timing on low-end phones (the pixel loop runs on the main thread; move it to a worker or WebGL if it stutters)

**Follow-ups found while building:**
- [ ] On portrait phones the 4:3 camera window leaves empty space; consider a taller window, or a portrait 3:4 capture for strip layouts
- [ ] Remember the last setup (localStorage)

### Phase 2 · Machines (eras) ✅ (tune on real devices)

**Goal: each machine is a whole identity, not a filter.** Replaces the Filter + Paper pickers.

- [x] `Machine` config (`lib/machines.ts`): film look, papers, allowed layouts, strip style (corners, caption font/case/outline, date placement, decorations), countdown style, sound profile, exterior colors, interior and flash color
- [x] Starter set:
  - **'62 Chemical**: silver-toned B&W, heavy grain, cream/white paper, typewriter caption, white typed countdown, heavy mechanical sounds, green enamel booth
  - **'79 Color**: faded warm color, strong halation, rounded photo corners, groovy caption (Shrikhand), warm bulb countdown, classic sounds, orange booth with brown curtain
  - **'98 Sticker**: bright and soft, sparkle/star/heart decorations, bubbly outlined caption (Fredoka), pink bubble countdown, cute chirpy sounds, pink booth with lavender curtain
  - **'04 Disposable**: harsh flash hotspot, light leaks, strong vignette, orange seven-segment date stamp burned into each photo, LCD countdown, plastic click + film-wind sounds and flash-charge whine, blue booth
- [x] Machine picker: a row of booths you scroll or swipe through (scroll-snap), plus machine tabs and prev/next buttons for mouse and keyboard
- [x] Switching machines keeps the chosen layout/paper when the new machine offers them
- [x] New look params: `leak` (light leaks) and `flash` (center hotspot)
- [x] Camera: one automatic retry when a webcam is still busy from the last session
- [ ] Optional: move the look pipeline to WebGL for an exact live preview (not needed yet; CSS approximation holds up)

**Verified:** typecheck, lint; headless Chrome runs shoot full film strips with every machine; pixel checks confirm each machine's look is applied at capture; mobile swipe selects the next machine; no console errors.

**Still to check by hand:**
- [ ] Listen to each machine's sound profile
- [ ] Tune each look on real faces (especially '04 flash/leak strength and '62 grain)
- [ ] Check machine fonts load before the first strip on slow connections

### Phase 3 · Decorate ✅ (tune on real devices)

**Goal: purikura-style play after the shoot.**

- [x] Decorating happens on the collected screen, right after "Take your strip" (no extra stage to click through)
- [x] Sticker sheet per machine, all drawn in code with a die-cut white border (`lib/stickers.ts`): tape labels and typed "xoxo" ('62), daisy/rainbow/sun/peace/"groovy" ('79), hearts/crown/bunny ears/"BFF" ('98), bolt/shades/"LOL"/"OMG" ('04)
- [x] Drag to move; one round handle turns and resizes; the sticker in hand comes to the front (`components/StripEditor.tsx`)
- [x] Selected-sticker toolbar (smaller, bigger, turn, remove) and keyboard: arrows move, +/- resize, [ ] turn, Delete removes, Esc deselects
- [x] Pen with machine colors, Fine/Bold; '98 and '04 pens get a white purikura glow
- [x] Undo (50 steps) and Clear (also undoable)
- [x] Optional 60-second "booth rules" challenge; time's up locks editing, with "Keep decorating" to continue
- [x] Decorations drawn by the same strip renderer, so the download matches the screen (`lib/decorations.ts`)

**Verified:** typecheck, lint; headless Chrome runs on '98 and '79: stickers added, sticker dragged with real mouse events, pen stroke drawn and undone, keyboard delete, timer, export; no console errors.

**Still to check by hand:**
- [ ] Touch dragging and the resize handle on a real phone
- [ ] Sticker sizes and the sticker art itself

### Sound redesign (done with Phase 3)

The first synthesized kit was rated "awful" except the countdown tick. Rebuilt every sound on the tick's recipe:
- [x] Clean, short tones; noise only as a tiny filtered texture
- [x] One shared bus: high-cut 7.5 kHz → gentle compressor → a little room reverb
- [x] New designs: two-note bell chime on Start, soft double click + low thump shutter (heavier on '62, arpeggio on '98, click + ratchet on '04), smooth motor hum in four pushes synced to the print animation, soft paper tap on drop
- [x] Removed the curtain swish; '04 flash whine made much quieter
- [x] Added: sticker "pop", "ready" chime when the strip finishes developing, time's-up chime
- [x] Synthesis still wasn't good enough → switched to real CC0 recordings (Phase 4 session), see below

### Sound: real recordings (done with Phase 4)

- [x] All effects except the countdown tick are now CC0 recordings in `public/sounds/` (~520 KB total, credits in `public/sounds/CREDITS.txt`)
  - Shutter: real SLR "ka-chunk" ('79, and pitched down for '62), lighter shutter + glass sparkle ('98), point-and-shoot with film advance motor ('04)
  - Start: a coin landing; print: a small motor (fidget-spinner recording pitched down) in four pushes plus a paper slide; drop: a card being placed
  - Ready, sticker pop, time's up: Kenney interface chimes
- [x] Files are fetched when the booth page loads and decoded on the Start press, so the first sound isn't late
- [x] Processing (trim, mono, normalize, pitch) done once offline in headless Chrome; scripts kept out of the repo
- [ ] Listen on real speakers and phones; swap any file that grates

### Phase 4 · Keepsakes ✅

**Goal: strips have an afterlife.**

- [x] Scrapbook wall: "Pin to wall" saves the finished strip (decorations included) as a JPEG in IndexedDB, in this browser only (`lib/scrapbook.ts`). Re-pinning after more edits updates the same pin
- [x] The wall: a corkboard under the booths with each strip taped at a slight tilt; hidden until there's a pin (`components/Wall.tsx`)
- [x] Open a pinned strip: download it, print-ready 4×6, or remove it (with confirmation)
- [x] Print-ready export: 4×6 in at 300 dpi (1200×1800). Strips print two-up with a dotted cut line, like real booth prints; grids print one-up. PNG carries a 300 dpi pHYs chunk (`lib/printSheet.ts`)
- [x] Flipbook GIF: each photo framed on the machine's paper with caption and frame counter, looping forever. Own encoder: median-cut palette, Floyd–Steinberg dithering, LZW (`lib/gif.ts`, `lib/flipbook.ts`)
- [x] Header copy changed from "Nothing stored" to "Stays on your device", since pins are now stored locally (opt-in)
- [ ] Seasonal limited frames (later: needs a content plan)
- [ ] Flipbook from wall items (would need to store the individual shots too)

**Verified:** typecheck, lint; headless Chrome: pin → wall shows it; print sheet is 1200×1800 with a 300 dpi chunk; GIF decodes as 4 frames, infinite loop, ~0.2 s to build; wall dialog print and remove work; no console errors.

### Phase 5 · Art direction: a building of rooms ✅ (tune on real devices)

**Goal: from "a good app" to a piece of art.** Research: [05-art-direction](research/05-art-direction.md), assets: [06-real-assets](research/06-real-assets.md).

- [x] Direction chosen: **building of rooms**. Keywords: *nocturnal · chemical · handmade · exhibited*
- [x] Real assets: 15 CC0 photos/textures in `public/assets/` (credits in `public/assets/CREDITS.txt`); the darkroom timer cut out of its studio backdrop
- [x] Room system: `<body data-room>` re-defines the color tokens per room, so every component takes the room's light; header/footer use `--room-chrome`; soft fade into each room (`globals.css` → "Rooms")
- [x] **Street:** real rain-bokeh night backdrop; cabinets in machine paint over real brushed steel, real velvet curtain tinted per machine (luminosity blend), chrome bezels on coin slot and Start, a glass sample window with real vintage strips; setup panel as a dark "Before you step in" board; a door to the gallery
- [x] **Booth:** interior curtain is the real velvet in the machine's color
- [x] **Darkroom** (`components/Darkroom.tsx`): red safelight; strip feeds into a developer tray with a liquid sheen and develops from blank; real negatives on a drying line with clothespins; the real darkroom timer on the shelf; **"Lights on"** switch (real switch sound) reveals the true colors with one soft flash
- [x] **Studio table:** green cutting-mat surface; panel is a taped-down sheet of real paper; sticker sheet with dashed die-cut slots; grease-pencil hints (Caveat)
- [x] **Gallery** (`components/Gallery.tsx`, its own room): opens on the real empty-gallery photo with wall text; strips hung under track lights with museum wall labels (No. 001 · *Untitled (4 poses)*, 2026 · machine · "Collection of the sitter"); "From the archive" corner with the real vintage strips
- [x] In-world copy: "A photo booth on a rainy street. Open all night." · "Before you step in" · "Developing… don't open the door." · "Lights on" · "On the studio table" · "Hung in the gallery" · "Take it down"
- [x] Fixed along the way: font variables referenced themselves (next/font and Tailwind theme shared names); gallery link disappeared after other keep actions
- [ ] Real devices: performance of the street backdrop and blend modes on low-end phones; Safari rendering of the luminosity blend
- [ ] Room-to-room door sound (no fitting CC0 recording found yet)

**Verified:** typecheck, lint; headless Chrome runs through every room (street → booth → darkroom → lights on → table → gallery), all four machines, decorating, pin/print/GIF, gallery open/print/take down, mobile, camera denied; no console errors.

### Phase 6 · More options, mix & match, live preview ✅

**Goal: let people combine anything, and see the result before shooting.**

- [x] 11 layouts for every machine: vertical strips of 2/3/4/6, wide strips of 3/4, grids of 4, 6, 6 wide, 8, 9 (each with a mini grid icon)
- [x] Countdown: Off, 1, 3, 5, 10 s (Off: no countdown; the next pose's prompt shows during the gap)
- [x] **Mix & match** (each defaults to "Machine"): film look (any machine's + Natural, Pop, Soft, Cool, Rose, Noir), film effects strength (off/low/normal/strong), paper (all 16), photo corners, date (printed / orange stamp), decorations, sound voice, gap between poses (quick/normal/relaxed), pose prompts on/off, flash on/off, mirror; "custom" badge and "Reset to machine defaults"
- [x] **Live preview** at the top of the setup panel: the real strip renderer with the current setup, filled with sample photos from a real vintage strip developed in the chosen look
- [x] Studio table: sticker sheets from every machine plus "All sheets"; 13 pen colors
- [x] Setup remembered in this browser (validated on load)

**Verified:** typecheck, lint; headless Chrome: a fully mixed setup (Grid · 9, no countdown, Noir + strong effects, Midnight paper, rounded corners, orange stamp, sparkles, cute sound, quick pace, prompts/flash off) persists across reload, shoots 9 photos in ~6 s, and the strip carries every choice; reset clears the mix; no horizontal scroll on mobile.

### Phase 6b · Four more machines ✅

The street now runs chronologically: '1890 → '62 → '72 → '79 → '89 → '98 → '04 → '25.

- [x] **'1890 Tintype**: silver-brown plate tone, lens blur toward the edges (`edgeBlur`), heavy vignette; oval windows with an ornate double rule; italic caption; walnut cabinet, green velvet; ornate-plate countdown; slow heavy shutter; mustache / top hat / monocle stickers
- [x] **'72 Instant**: soft faded color; square photos each on a white card with the thick bottom edge (`frame: "instant"`); marker caption (Caveat); cream cabinet with dark lettering; marker countdown; click + eject sound; "summer '72" sticker; square crop guide in the booth
- [x] **'89 Camcorder**: softness, red/blue color bleed, scanlines (`soften`, `chroma`, `scanlines`); "PLAY ▶ / SP / time / date" on-screen overlay in a pixel font (VT323); blue-screen countdown; button-clunk sound; REC and PLAY stickers; live scanlines over the camera
- [x] **'25 Thermal**: 1-bit Floyd–Steinberg dithering (`dither`); receipt frame with header, receipt number, dashed rules, barcode and torn zig-zag edges (transparent in the PNG); receipt countdown; printer-chatter sound; barcode and PAID stickers
- [x] Mix & match gains: corners **Oval**, date **VHS**, a **Frame** override (plain / instant cards / receipt / ornate), four new sound voices; new effects scale with "Film effects"
- [x] Renderer: photos are cover-cropped into any window shape; the flipbook follows square and oval windows

**Verified:** typecheck, lint; headless Chrome shoots a full strip on each new machine (countdown style, crop guide, dither/scanlines/torn-edge checks), plus rooms, mixed options and keepsakes regressions; no console errors.

### Phase 7 · Outcomes: what people leave with ⏳ (proposed)

Research: [07-user-outcomes](research/07-user-outcomes.md). The style is strong; the gaps are in sharing, motion and occasions.

- [ ] **Ready-to-post formats** with previews: Instagram Story 9:16 (safe zones), feed post 4:5, phone wallpaper; strip on a room-styled background
- [ ] **Live strip:** short clip per pose → animated strip (WebM/MP4) and a small boomerang GIF
- [ ] **Occasions:** one-tap themes (Birthday, Date night, Besties, Graduation, Wedding, Holiday): caption, sticker pack, suggested paper; still mixable
- [ ] **Together modes:** prompt sets for solo / couple / friends
- [ ] Not doing (privacy): QR codes, cloud galleries, remote "booth with friends"

### Explicitly out of scope

- Face reshaping or beautify filters (off-brand; body-image concerns)
- Celebrity or brand frames (licensing; imitates real people)
- Accounts, cloud storage, uploads of any kind

---

## Open questions

| Question | Options | Leaning |
| --- | --- | --- |
| ~~Default mode~~ | Decided: Film | See decision log |
| ~~Sound default~~ | Decided: on after Start, with mute | See decision log |
| ~~Keep the name?~~ | Decided: keep | See decision log |
| ~~Sounds: synth or samples?~~ | Decided: synth (revisit after listening on devices) | See decision log |
| Live preview fidelity | CSS approximation vs WebGL | CSS in Phase 1; WebGL in Phase 2 if needed |

## Decision log

| Date | Decision | Why |
| --- | --- | --- |
| 2026-11-27 | Rebuilt from scratch on Next.js + Tailwind, all client-side | Old code was one minified file with leftover scaffold code and bugs |
| 2026-11-27 | Own pixel pipeline instead of `ctx.filter` | Safari doesn't support `ctx.filter` |
| 2026-11-27 | Focus on ritual + craft as the point of difference | Research: baseline features are already common; the experience is not |
| 2026-11-27 | Film mode is the default; Digital is one tap away | No retakes makes the strip feel precious, like a real booth |
| 2026-11-27 | Sound on after the Start press, visible mute, remembered | Start is a user gesture, so audio can unlock; mute respects shared spaces |
| 2026-11-27 | Keep the name "The Snap Room" | No reason to change yet |
| 2026-11-27 | Synthesized Web Audio sounds, no sample files | Tiny, no licensing, easy to vary per machine in Phase 2 |
| 2026-11-27 | Camera turns off when printing starts | Privacy: the camera light goes off as soon as it isn't needed |
| 2026-11-27 | Machines replace the free Filter + Paper pickers; each machine offers 2–3 papers and its own layouts | A coherent era identity is the differentiator; free mixing dilutes it |
| 2026-11-27 | '79 Color is the default machine | Warm color flatters most faces and lighting; the most broadly appealing first impression |
| 2026-11-27 | Disposable date stamp drawn as real seven-segment digits, not a font | No suitable font on Google Fonts; drawing it keeps the look exact on canvas and in the countdown |
| 2026-11-27 | Decorate on the collected screen instead of a separate stage | Keeps "download right away" one click away while making decorating the obvious next thing |
| 2026-11-27 | Rebuilt all sounds from clean tones through one soft bus | Feedback: only the (clean, tonal) countdown tick sounded good; noise and sawtooth sounds read as harsh |
| 2026-11-27 | Sounds switched to CC0 recordings (Kenney, OpenGameArt) | Synthesized effects were rated awful; only the tick survives as synth |
| 2026-11-27 | The wall is opt-in ("Pin to wall") and local-only | Keeps the privacy promise: nothing is stored unless the visitor asks, and never off the device |
| 2026-11-27 | Own GIF encoder instead of a dependency | ~250 lines, no bundle weight from a library, full control of the palette and dithering |
| 2026-11-27 | Art direction: "a building of rooms" (street → booth → darkroom → studio table → gallery) | One big idea that maps onto the existing stages, uses the name literally, and ties into booth art history |
| 2026-11-27 | Gallery becomes its own room; the corkboard wall is retired | The gallery is the end of the photo's journey in the rooms concept, and wall labels need space |
| 2026-11-27 | "Lights on" is a button, not automatic | The reveal of real color is the payoff; giving the visitor the switch makes it theirs |
| 2026-11-27 | Machines become presets; every setting can be overridden ("Mix & match") | People want to combine freely; "Machine" defaults keep the one-tap experience |
| 2026-11-27 | Live setup preview uses real vintage faces developed in the chosen look | Shows the look and the frame honestly before shooting, without needing the camera |
| 2026-11-27 | Four more machines ('1890, '72, '89, '25); street in chronological order | Each adds a distinct outcome (oval portrait, instant cards, video freeze-frames, receipt) rather than another color filter |
