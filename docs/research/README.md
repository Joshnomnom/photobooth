# Research summary

Research done 2026-11-27. Detail and sources are in the numbered docs.

## The one-sentence finding

**People love photo booths for the ritual, not the picture.** Filters, strips and date stamps are already common on the web. What no web booth does well is the *experience*: stepping inside, the countdown, the flash, the wait while the strip develops, and holding the finished strip.

## Key insights

| # | Insight | Why it matters for us | Detail |
| --- | --- | --- | --- |
| 1 | Analog booths are loved for the physical keepsake, privacy ("you're the photographer") and warm grainy tone. The 3–4 minute develop wait is part of the charm. | Make the end of the session feel like *receiving an object*, not a file. | [01](01-booth-culture.md#analog-chemical-booths) |
| 2 | Purikura splits the session in two: **shoot**, then **decorate** together on a timer. | A decorate step adds play and ownership. | [01](01-booth-culture.md#purikura-japan) |
| 3 | Korean four-cut studios win on themed frames and a signature color look per brand. | Each "machine" should have its own recognisable look. | [01](01-booth-culture.md#korean-four-cut-studios) |
| 4 | Web competitors (Flashback Booth, Pica Pica, Groovy, Polaroid Booth) all offer filters, strips, grain, date stamps and "private, in-browser". | These are the baseline, not what sets us apart. | [02](02-competitors.md) |
| 5 | **Labor illusion:** people value results more when they see the work happen. Progress that speeds up near the end feels faster. | A visible "developing" wait adds value, as long as it's short and honest. | [03](03-ux-ui.md#waiting-and-anticipation) |
| 6 | Ask for the camera at the moment of use, and design a clear recovery screen for when access is denied. | The camera-permission screen is the first thing everyone sees, so it needs real design. | [03](03-ux-ui.md#camera-permission-flow) |
| 7 | Skeuomorphism is back in a *restrained* form: tactile cues on top of clear, modern layout. | Booth metaphor for the moments that count (curtain, slot, strip); clean UI for settings. | [03](03-ux-ui.md#tactile--skeuomorphic-ui) |
| 8 | Feedback across sight, sound and touch must stay in sync. Keep it sparse, and keep routine sounds simple. | Sound helps the feel, but every sound must have a reason, and mute must be easy. | [03](03-ux-ui.md#feedback-sound-and-haptics) |
| 9 | WCAG: nothing may flash more than 3 times per second, and `prefers-reduced-motion` doesn't change that rule. | Camera flash and countdown effects must stay under the limit. | [03](03-ux-ui.md#accessibility) |
| 10 | Film grain should follow brightness (strongest in shadows and midtones). Light leaks only work if they're subtle. Halation = blurred highlights added back with a warm tint. | Defines our film-look pipeline. | [04](04-technical.md#film-look-pipeline) |
| 11 | Browsers only allow audio after a click or tap. iOS is strictest: create or resume the AudioContext synchronously inside a click/tap. | Unlock audio on the "start" click. | [04](04-technical.md#web-audio) |

| 12 | Art direction is one big idea that every screen serves; ours lacks one. The booth has a real art history (Surrealists' "automatic writing", Warhol's strips as tiny films) and photos naturally travel booth → darkroom → gallery. | Proposal: "The Snap Room" becomes a building of rooms, each stage with its own light, sound and texture. | [05](05-art-direction.md) |

## What this means

1. **Build the ritual:** step in, countdown, flash, the strip prints and develops, you collect it.
2. **Earn the nostalgia with craft:** grain that follows brightness, glow on highlights, slight frame-to-frame variation, paper texture. Keep it subtle.
3. **Machines, not filters:** each era is a full package (look, paper, typography, sounds).
4. **Keep everything else modern:** fast, clear, accessible, private.

The roadmap is in [../PLAN.md](../PLAN.md).
