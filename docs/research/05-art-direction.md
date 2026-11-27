# 05 · Art direction

Researched 2026-11-27. Why the site feels like "a good app" but not art yet, and how to get there.

## Diagnosis: good UI, no big idea

Today the site is a cream page with tidy panels, chips and buttons. Each stage looks fine, but they don't add up to a *world*. It reads as an app wrapped around a booth.

- **Art direction is the big idea; design executes it.** The mood, tone and concept come first; layout, color and components follow from them. ([Creative Bloq](https://www.creativebloq.com/web-design/web-design-versus-art-direction-3077193), [A List Apart: Art Direction and Design](https://alistapart.com/article/art-direction-and-design/), [A List Apart: Art Direction and the Web](https://alistapart.com/article/artdirweb))
- **Art direction keeps the experience coherent** across every screen; design handles execution. ([Medium: Art direction within product design](https://medium.com/rewrite-tech/art-direction-within-product-design-why-is-it-important-9c73219cb8f3), [uxdesign.cc](https://uxdesign.cc/how-art-direction-will-help-you-create-masterful-web-interfaces-cba8d3dab0d8))
- **Anchor it in 3–4 keywords** and a mood board that captures the emotional territory, not the execution. Narrow it: pick a direction and refine. ([ZURB: Creative direction is storytelling](https://zurb.com/blog/creative-direction-is-storytelling), [Toptal](https://www.toptal.com/designers/brand/guide-to-mood-boards), [UAL](https://arts.ac.uk/partnerships/outreach/insights/how-to/techniques/how-to-techniques-mood-boards))

**What we're missing:** one idea that every screen, word, sound and motion serves.

## The photo booth in art history (our raw material)

The booth isn't just nostalgia; it has a real place in art.

- **Surrealists (1928, Paris):** the first artists to see the Photomaton's potential. They treated it as a visual equivalent of *automatic writing*: a machine making the portrait, beyond the sitter's control. Dalí and Tanguy posed in them. ([Artdaily: Photo Booth Art, Kunst Haus Wien](https://artdaily.com/news/59884/images/close.gif), [Art Blart: Behind the Curtain](https://artblart.com/2012/05/18/))
- **Warhol (1963 on):** installed a booth at the Factory and turned strips into *mini films*, "populated by costumed characters and gestures worthy of silent cinema." The Getty holds his Photo Booth Self-Portraits (1960–65). ([Getty](https://www.getty.edu/news/photo-booths-history), [Met](https://www.metmuseum.org/art/collection/search/267417))
- **Later:** Arnulf Rainer, Thomas Ruff, Francis Bacon (strips as studies for paintings), Lee Godie; Gillian Wearing posed and vamped in booths as a young woman. *Behind the Curtain* (Musée de l'Elysée) showed 600+ works by about 60 artists. ([photobooth.net: Art and the photobooth](https://www.photobooth.net/art/), [Aperture: Gillian Wearing](https://archive.aperture.org/article/2016/4/4/gillian-wearing), [Country Life](https://www.countrylife.co.uk/people/100-years-of-the-photobooth-the-essential-piece-of-party-paraphernalia-beloved-by-salvador-dali-andy-warhol-and-beyonce))
- **Centenary (2025–26):** *Strike a Pose! 100 Years of the Photobooth* at The Photographers' Gallery, London, celebrating the booth's "intimate charms, imperfections and quirks", with a working 1960s booth for visitors. ([It's Nice That](https://www.itsnicethat.com/features/strike-a-pose-100-years-of-the-photobooth-autofoto-the-photographers-gallery-exhibition-101025), [The Photographers' Gallery](https://thephotographersgallery.org.uk/node/2683), [L'Œil de la Photographie](https://loeildelaphotographie.com/en/the-photographers-gallery-strike-a-pose-100-years-of-the-photobooth/))
- **Booths as designed places:** Berlin's Photoautomat revived restored analog booths from 2003; Paris's Fotoautomat designs a unique look for each booth to suit where it stands. ([Culture Trip](https://theculturetrip.com/europe/germany/articles/the-unlikely-story-behind-berlins-popular-city-photo-booths), [photobooth.net: Booths of Berlin](https://www.photobooth.net/archive/2019/09/24/the_booths_of_berlin))

**Takeaways:** the booth is a *machine that makes portraits* (Surrealists); a strip is a *tiny film* (Warhol); strips belong *in a gallery*, not just a downloads folder.

## Visual languages that fit

### A. The darkroom
- **Safelight red** exists because B&W paper is blind to red light, so the whole room glows red while prints develop. ([Wikipedia: Safelight](https://www.wikipedia.org/wiki/Safelight), [Kodak darkroom illumination guide](https://www.kodak.com/content/products-brochures/Film/KODAK-A-Guide-to-Darkroom-Illumination-K-4.pdf))
- **Contact sheets** print a whole roll at once; the film edge (the "rebate") with frame numbers is part of the look; photographers circle keepers in **grease pencil**. ([35mmc](https://www.35mmc.com/18/01/2021/3-ways-to-make-contact-sheets-and-what-they-can-tell-us-darkroom-technique-part-6-by-sroyon/), [Lomography](https://www.lomography.com/school/what-is-a-contact-sheet-fa-q2evn1e3), [Fstoppers](https://fstoppers.com/film/eight-legendary-darkroom-tools-most-photographers-under-40-have-never-seen-903985))
- Fits our signature moment (developing) perfectly.

### B. Print and zine (riso, halftone, collage)
- Riso look on the web: halftone dot screens, paper-grain noise (SVG turbulence), `mix-blend-mode: multiply` overprinting, and slight registration drift. Imperfections are the point, but keep type and palette tight so texture looks intentional. ([Risograph style reference](https://chrislemke.github.io/website_designs/examples/Risograph.html), [Communication Arts: The rise of riso](https://www.commarts.com/columns/the-rise-of-riso), [Hyperallergic](https://hyperallergic.com/the-democratic-power-of-the-risograph))
- Scrapbook/collage is a strong 2025–26 trend: tape, torn edges, handwriting, doodles, cut-outs, often paired with stark minimalism for contrast. ([Shopify](https://www.shopify.com/blog/graphic-design-trends), [GoDaddy](https://www.godaddy.com/resources/skills/graphic-design-trends-2025), [Pixlr](https://pixlr.com/blog/handmade-scrapbooked-and-dopamine-bright-the-design-trend-bringing-back-the-human-touch/), [Squarespace](https://pros.squarespace.com/blog/creative-process-design-trend)) *(trend sources are commercial blogs)*

### C. The gallery
- Museum framing: white walls, wall labels, catalogue numbers, editorial serif type. Turns every strip into a work. Echoes the art history above.

### D. Night arcade
- Neon, rain-wet street, humming marquee. Cinematic, but leans on heavy illustration or 3D to look good; the riskiest to execute well.

## Type and motion

- **Expressive type is back**, more grounded than the recent 3D wave; variable fonts let weight and width respond to layout and interaction. ([Creative Bloq 2025](https://www.creativebloq.com/design/fonts-typography/from-variable-fonts-to-kinetic-type-these-typography-trends-could-be-big-in-2025), [Creative Bloq 2026](https://www.creativebloq.com/design/fonts-typography/breaking-rules-and-bringing-joy-top-typography-trends-for-2026), [Creative Boom](https://www.creativeboom.com/insight/font-trends-2025/))
- **Scroll-driven animation is now native CSS** (`animation-timeline: scroll() / view()`) in Chrome/Edge 115+ and Safari 26; use `@supports` with a static fallback. Good for storytelling without a JS animation library. ([WebKit guide](https://www.webkit.org/blog/17101/a-guide-to-scroll-driven-animations-with-just-css/), [Smashing](https://smashingmagazine.com/2024/12/introduction-css-scroll-driven-animations/), [Chrome case studies](https://developer.chrome.com/blog/css-ui-ecommerce-sda), [MDN](https://developer.mozilla.org/en-US/blog/scroll-progress-animations-in-css))
- Reduced-motion and the 3-flashes rule from [03-ux-ui](03-ux-ui.md#accessibility) still apply to everything here.

## Proposal: "The Snap Room" is a building of rooms

Our name already holds the idea. **Each stage of a photograph's life is a room you walk through**, and each room has its own light, sound and texture:

| Room | Stage | Atmosphere |
| --- | --- | --- |
| **The street** | Outside (choose a machine) | Night pavement, booths glowing in a row, marquee bulbs, the hum of the city |
| **The booth** | Shooting | Curtain closed, just you, the lens and the flash (mostly as today) |
| **The darkroom** | Printing + developing | Safelight red, the strip rising in the developer tray, film-edge frame numbers, chemistry sounds |
| **The studio table** | Decorate | Cutting mat, tape, grease pencils, stickers on a sheet, scattered offcuts |
| **The gallery** | The wall | White walls, a wall label per strip ("Untitled (Pose 3 of 4), 2026. Inkjet on paper. Collection of the sitter"), catalogue numbers |

**Keywords:** *nocturnal · chemical · handmade · exhibited*

**Why this works:**
- It's one idea, so every screen has a reason to look the way it does.
- The rooms map 1:1 onto our existing stages: we re-dress them, we don't rebuild the flow.
- It earns the art-history link (booth → darkroom → gallery is how photos really travel).
- Each room can change the light, so the site has rhythm, not one flat cream page.

**Craft rules (so it reads as art, not a theme park):**
1. Restraint: one strong texture per room, not five.
2. Typography carries the voice: one expressive display face per room, one quiet text face everywhere.
3. Real material references (film rebate numbers, wall-label format, cutting-mat grid), never clip-art.
4. Transitions between rooms are moments (door, curtain, light switch), with reduced-motion fades.
5. Copy is part of the art: short, wry, in-world ("Fix for 30 seconds. Or don't.").
6. The UI stays clear: controls get styled, never hidden.
