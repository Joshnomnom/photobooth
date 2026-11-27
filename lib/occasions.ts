/**
 * Occasions and together modes (Phase 7). An occasion sets a caption, a
 * sticker sheet, a suggested paper and themed prompts; everything stays
 * mixable. Research: docs/research/07-user-outcomes.md.
 */

import type { StickerKind } from "./stickers";

export type Together = "solo" | "couple" | "friends";

export type Occasion = {
  id: string;
  name: string;
  caption: string;
  /** Used when the paper is left on "Machine". */
  paperId: string;
  stickers: readonly StickerKind[];
  prompts: readonly string[];
};

export const OCCASIONS: readonly Occasion[] = [
  {
    id: "birthday",
    name: "Birthday",
    caption: "Happy birthday!",
    paperId: "bubblegum",
    stickers: ["text-hbd", "cake", "balloon", "partyhat", "star", "sparkle", "heart", "crown"],
    prompts: ["Make a wish!", "Blow out the candles!", "Party hat face!", "Surprise!"],
  },
  {
    id: "date",
    name: "Date night",
    caption: "us.",
    paperId: "midnight",
    stickers: ["heart", "text-xoxo", "sparkle", "star", "bubble-hi", "rose-bud", "flower", "text-us"],
    prompts: ["Look at each other, not the camera.", "Almost-kiss.", "Forehead to forehead.", "Your best date-night face."],
  },
  {
    id: "besties",
    name: "Besties",
    caption: "besties forever",
    paperId: "lavender",
    stickers: ["text-bff", "heart", "star", "shades", "crown", "ears", "sparkle", "text-lol"],
    prompts: ["Matching faces!", "Secret handshake!", "Fake laugh, then a real one.", "Squish together!"],
  },
  {
    id: "graduation",
    name: "Graduation",
    caption: `class of '${String(new Date().getFullYear() % 100).padStart(2, "0")}`,
    paperId: "midnight",
    stickers: ["gradcap", "text-grad", "star", "sparkle", "arrow", "crown", "shades", "heart"],
    prompts: ["Throw your cap!", "Serious graduate face.", "Point to the future.", "We did it!"],
  },
  {
    id: "wedding",
    name: "Wedding",
    caption: "just married",
    paperId: "cream",
    stickers: ["rings", "text-justmarried", "heart", "flower", "sparkle", "star", "rose-bud", "bubble-hi"],
    prompts: ["Raise a glass!", "Dip!", "Best dance move.", "Happy tears face."],
  },
  {
    id: "holiday",
    name: "Holiday",
    caption: "happy holidays",
    paperId: "sage",
    stickers: ["snowflake", "gift", "star", "sparkle", "heart", "text-xoxo", "tophat", "smiley"],
    prompts: ["Catch a snowflake!", "Cozy sweater face.", "Unwrap a surprise!", "Holiday cheer!"],
  },
];

export const occasionById = (id: string) => OCCASIONS.find((o) => o.id === id);

const BASE: Record<Together, readonly string[]> = {
  solo: [
    "Big smile!",
    "Now look serious.",
    "Silly face!",
    "Look surprised!",
    "Strike a pose.",
    "Look off into the distance.",
    "Laugh like you mean it.",
    "Blow a kiss.",
    "Your passport photo face.",
    "Wink!",
  ],
  couple: [
    "Look at each other!",
    "Cheek to cheek.",
    "One of you laughs, one stays serious.",
    "Make a heart with your hands.",
    "Swap places!",
    "Pretend you just met.",
    "Whisper a secret.",
    "Both look surprised!",
  ],
  friends: [
    "Everyone squeeze in!",
    "Everyone look at the camera except one person.",
    "Group scream!",
    "Point at whoever's late.",
    "Swap places!",
    "Tallest in front!",
    "Everyone's a superhero.",
    "Pile on!",
  ],
};

/** Prompts for this session: occasion prompts first, then the together set. */
export function promptsFor(together: Together, occasion?: Occasion): string[] {
  return [...(occasion?.prompts ?? []), ...BASE[together]];
}
