# 04 · Technical notes

## Film-look pipeline

Each effect, how it's built, and how we'd do it. Sources: [FidelityFX Lens](https://gpuopen.com/manuals/fidelityfx_sdk/techniques/lens/), [Godot CRT shader](https://godotshaders.com/shader/crt-video-like-shader/), [Unreal post-process](https://dev.epicgames.com/documentation/unreal-engine/post-process-effects-in-unreal-engine), [Unity lens effects](https://docs.unity3d.com/Packages/com.unity.render-pipelines.high-definition@17.0/manual/camera-and-lens-effects.html), [Filmic Plus](https://superhivemarket.com/products/filmic-plus---complete-film-emulation-for-cycles--eevee), [dev.to film effects](https://dev.to/samma1997/add-film-effects-to-digital-photos-free-no-photoshop-8ne).

| Effect | How it works | Notes |
| --- | --- | --- |
| **Color / tone** | Color matrix + tone curve | Already built (`lib/filters.ts`). Add a tone curve (lifted blacks, rolled-off highlights). |
| **Halation** | Pick out the bright areas, blur them, add back with a warm/red tint | The signature "real film" glow around lights and bright skin edges |
| **Bloom** | Like halation but neutral and wider | Optional, subtle |
| **Grain** | Noise scaled by brightness: strongest in shadows and midtones, thin in highlights; monochrome, not colored | Uniform RGB noise is the most common mistake |
| **Vignette** | Darkening toward the edges (cos⁴ is physically based; smoothstep is fine) | Vary it slightly per frame |
| **Chromatic aberration** | Shift red and blue outward, at the edges only | Very subtle or none; it reads as "cheap lens" fast |
| **Light leaks** | Additive warm gradient blobs, random per frame | Sparingly; maybe 1 in 4 frames, low strength |
| **Frame variance** | Small random exposure/white-balance change per shot | Makes a strip feel *shot*, not filtered |
| **Paper / print** | Paper texture blended onto the strip, soft photo edges, ink-like date | Applied in strip composition, not per photo |

**Suggested order** (our inference from the sources): tone/color → halation/bloom → vignette → chromatic aberration → grain (last, so it sits on top) → print/paper at composition.

**Implementation choice:**
- **Capture time (per photo, 1200×900):** the CPU loop is fine for matrix + grain + vignette. Halation needs a blur. Use the canvas `filter: blur()` where supported, or a downscale-then-upscale blur, which works everywhere, including Safari.
- **Live preview:** CSS filter for color (as now) plus SVG/CSS overlays for grain and vignette. Moving the whole look to a **WebGL shader** gives an exact live preview and much faster capture. That's a Phase 2 upgrade if CSS approximations aren't convincing enough.
- Use **seeded randomness** so the preview and export of a given strip match.

## Web Audio

Sources: [Chrome autoplay policy](https://developer.chrome.com/blog/web-audio-autoplay), [Chromium intent](https://groups.google.com/a/chromium.org/g/blink-dev/c/5Y1BqbGauEs), [WebKit bugs](https://bugs.webkit.org/show_bug.cgi?id=291892), [laziel gist](https://gist.github.com/laziel/7aefabe99ee57b16081c).

- An `AudioContext` starts **suspended** until a user gesture. Call `resume()` from a click handler.
- **iOS Safari:** create or resume the context **synchronously inside** a `click`/`touchend`/`pointerup` handler (`touchstart` isn't reliable). Playing a short silent buffer is a common unlock trick.
- **Silent switch:** behavior is inconsistent across iOS versions *(unverified; test on a real device)*.
- **Background:** contexts can go quiet after the tab or app returns from background. Re-`resume()` on `visibilitychange`.
- **Plan:** unlock on the "Start" press, which we need anyway. **Synthesize sounds with Web Audio** (oscillators + filtered noise) instead of shipping samples: tiny, no licensing issues, and easy to vary per machine. Fall back to small samples only if synthesized sounds feel too fake.

## Other notes

- **Print size:** the classic strip is about 2×6 in. At 300 dpi that's 600×1800 px; we already render larger, so a "print-ready" export is easy.
- **Storage for a scrapbook:** IndexedDB (Blobs). Wrap every call in try/catch, since private mode can block it. Show a quota or "stored on this device only" note.
- **Safari:** no `CanvasRenderingContext2D.filter`. Already handled with our own pixel pipeline; keep any new effect off `ctx.filter`.
