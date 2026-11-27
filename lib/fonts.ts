import { Caveat, Courier_Prime, Fraunces, Fredoka, Inter, Shrikhand } from "next/font/google";

export const display = Fraunces({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-fraunces",
  display: "swap",
});

export const body = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

/** '62 Chemical: typed-label feel. */
export const typewriter = Courier_Prime({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--nf-typewriter",
  display: "swap",
});

/** '79 Color: chunky groovy display face. */
export const groovy = Shrikhand({
  subsets: ["latin"],
  weight: "400",
  variable: "--nf-groovy",
  display: "swap",
});

/** '98 Sticker: round, bubbly. */
export const rounded = Fredoka({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--nf-rounded",
  display: "swap",
});

/** Studio table: grease-pencil handwriting for notes and hints. */
export const hand = Caveat({
  subsets: ["latin"],
  weight: ["600"],
  variable: "--nf-hand",
  display: "swap",
});

export const fontVariables = [display, body, typewriter, groovy, rounded, hand].map((f) => f.variable).join(" ");

/** Resolved font families for canvas drawing. */
export const CANVAS_FONTS = {
  display: display.style.fontFamily,
  body: body.style.fontFamily,
  typewriter: typewriter.style.fontFamily,
  groovy: groovy.style.fontFamily,
  rounded: rounded.style.fontFamily,
};

export type FontKey = keyof typeof CANVAS_FONTS;
export type Fonts = typeof CANVAS_FONTS;
