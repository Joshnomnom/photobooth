# 03 · UX/UI research

## Camera permission flow

- **Ask at the moment of use.** Call `getUserMedia` when the user presses a clear "start" control, not on page load. Mozilla's WebRTC team argues that modern one-time permissions and URL-bar reset make old "priming" tricks unnecessary: *use first, list devices later*. ([Mozilla](https://blog.mozilla.org/webrtc/one-time-permissions-are-here-to-stay/))
- **Explain why, in context.** A permission request tied to a user action, with a clear benefit, performs best. ([Appcues summary of Material guidance](https://www.appcues.com/blog/mobile-permission-priming))
- **Design the denied state.** Show *where* to re-enable the camera for each browser and OS. macOS can block at system level (System Settings → Privacy → Camera). On iOS a reload can re-prompt; some Android phones need app settings. ([Daily.co](https://docs.daily.co/guides/how-daily-works/handling-device-permissions), [Glimpse](https://medium.com/joinglimpse/how-to-build-beautiful-camera-microphone-permission-checking-for-websites-e6a08415fa76))
- **"Dismissed" isn't "denied."** Browsers can't always tell "Not now" apart from "Block", so treat them as separate UI states where possible. ([Mozilla bug 947266](https://bugzilla.mozilla.org/show_bug.cgi?id=947266))
- **Chrome's `<usermedia>` element.** A new in-page recovery control. Google Meet reported 131% more successful recoveries after a denial. It's early and Chrome-only, so use it as a progressive enhancement. ([Chrome blog](https://developer.chrome.com/blog/usermedia-html-element))

**For us:** the "insert coin / step inside" moment *is* the permission ask. The booth metaphor gives a natural, motivated moment. The denied state is a friendly "booth is closed" card with steps for the detected browser.

## Waiting and anticipation

- **Labor illusion** (Buell & Norton, HBS): people who wait while seeing the work being done can be happier than people who don't wait at all. ([growth.design](https://growth.design/content/case-studies/labor-perception-bias/index.html), [builtformars](https://builtformars.com/tooltips/the-labour-illusion))
- **Be honest.** Show work that is really happening; don't invent fake work. ([dev.to](https://dev.to/khuepm/the-labor-illusion-why-making-users-wait-can-build-more-trust-1i5m))
- **Easing.** Progress that starts slow and speeds up near the end *feels* faster (CMU research, as reported). ([uxdesign.cc](https://uxdesign.cc/performance-design-designing-for-the-illusion-of-speed-576110e9e558), [Smashing](https://www.smashingmagazine.com/2016/12/best-practices-for-animated-progress-indicators))

**For us:** the "developing" animation is a *metaphor*, not real work, so:
- Keep it short (about 6–10s) and let people **skip it** (tap to finish).
- Do real work during it (rendering the final film pass and the PNG), so it's partly honest.
- Ease in: the image fades up slowly, then sharpens.
- Make it fun to watch: the strip slides out of the slot, a mechanical sound plays, and colors bloom from blank to sepia to full.

## Tactile / skeuomorphic UI

- Skeuomorphism returned in 2025 in a **restrained** form (Apple's Liquid Glass is the headline example). Tactile cues are used selectively, on top of clear flat structure. ([Bloomberg](https://www.bloomberg.com/news/articles/2025-06-13/apple-airbnb-ditch-flat-app-icons-for-new-3d-ui-design), [UXmatters](https://uxmatters.com/mt/archives/2024/11/the-renaissance-of-skeuomorphic-design-in-modern-user-experiences-bridging-the-digital-and-the-physi.php), [Apiko](https://apiko.com/blog/ux-design-trends/))
- The classic critique still applies: too much real-world decoration hurts usability. ([NN/g](https://www.nngroup.com/articles/skeuomorphism/))

**For us:** use physical metaphor where it carries *emotion* (the booth exterior, curtain, start button, print slot, the strip itself, paper, stickers). Keep *settings and controls* flat, legible and quick.

## Feedback, sound and haptics

- **Keep channels in sync.** Lag between visual, sound and touch feedback is noticed right away. ([Meta haptics](https://developers.meta.com/horizon/design/haptics-best-practices/))
- **Haptics support; they don't inform alone.** Pair them with a visible state. ([HTMLBurger](https://htmlburger.com/blog/microinteractions-guide/))
- **Signal only significant changes**; don't overload with feedback. ([O'Reilly, *Microinteractions*](https://oreilly.com/library/view/microinteractions/9781449342760/ch04.html))
- **Sound complexity matches importance.** Routine confirmations are short and simple; the big moments can be richer. ([Toptal](https://www.toptal.com/designers/ux/ux-sounds-guide))
- **Speed beats polish.** Feedback must arrive immediately after the action.

**Our sound map (draft):**

| Moment | Sound | Weight |
| --- | --- | --- |
| Start / coin | coin drop + motor spin-up | rich (once per session) |
| Countdown tick | soft beep or click | minimal |
| Shutter | mechanical clunk + flash pop | medium |
| Printing | motor whirr while the strip slides | medium, loops |
| Strip drops | paper flick | small |
| UI option change | none, or a very soft tick | minimal |

Phones: `navigator.vibrate` on shutter (Android only; iOS Safari doesn't support it).

## Mobile camera layout

- The thumb zone is a useful guide, though no longer treated as a rule: grips vary. ([Smashing](https://smashingmagazine.com/2016/09/the-thumb-zone-designing-for-mobile-users), [Addy Osmani](https://addyosmani.com/blog/touch-friendly-design/))
- Camera apps put the **shutter bottom-center**, modes and settings above it, and the camera switch to one side. ([Pratt IxD on iOS Camera](https://ixd.prattsi.org/?p=33302), [Balsamiq](https://balsamiq.com/learn/cameras/))
- **Mis-taps** onto mode or camera-switch controls next to the shutter are a common complaint, so keep space around the shutter. ([/e/ forum](https://community.e.foundation/t/camera-app-ui-suggestions/33232/2))
- Respect safe-area insets (notches, rounded corners). ([Apple forums](https://developer.apple.com/forums/thread/847715))

**For us:** on mobile, a full-screen camera view while shooting. Shutter bottom-center and big, with plenty of space around it. Settings live in a sheet *before* the session, not crowded around the shutter during it.

## Accessibility

- **WCAG 2.3.1 (Level A):** nothing flashes more than **3 times per second** (unless below the flash thresholds). This applies whatever the user's motion preference. ([W3C](https://www.w3.org/WAI/WCAG22/Understanding/three-flashes-or-below-threshold.html), [MDN](https://developer.mozilla.org/en-US/docs/Web/Accessibility/Guides/Seizure_disorders))
- **`prefers-reduced-motion`:** wrap non-essential motion in `@media (prefers-reduced-motion: no-preference)`, and check it in JS for scripted animation. Motion longer than about 5s should be pausable (Primer guidance). ([Primer](https://primer.style/accessibility/design-guidance/motion-and-animation), [web.dev](https://web.dev/learn/accessibility/motion))
- WCAG's "motion" excludes pure opacity, color and blur changes. A *fade* is a safe reduced-motion substitute.

**For us:**
- The shutter flash is a single flash per shot, with shots ≥1s apart. That's well under the limit. Never strobe.
- Reduced motion: the strip doesn't slide (it fades in), the curtain doesn't animate, and developing becomes a short crossfade.
- Sound: a visible mute toggle, remembered per device. Never rely on sound alone.
- Countdown numbers announced via `aria-live`. Full keyboard flow.
