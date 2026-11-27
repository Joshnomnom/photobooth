/**
 * Seven-segment digits, like the orange date stamp on a disposable camera.
 * One geometry is shared by the canvas date stamp and the SVG countdown.
 * A cell is 10 × 18 units; segments are rounded bars.
 */

type Seg = { x: number; y: number; w: number; h: number };

export const CELL_W = 10;
export const CELL_H = 18;
export const CELL_GAP = 3;

export const SEGMENTS: Record<string, Seg> = {
  a: { x: 1.6, y: 0, w: 6.8, h: 2 },
  b: { x: 8, y: 1.6, w: 2, h: 6.8 },
  c: { x: 8, y: 9.6, w: 2, h: 6.8 },
  d: { x: 1.6, y: 16, w: 6.8, h: 2 },
  e: { x: 0, y: 9.6, w: 2, h: 6.8 },
  f: { x: 0, y: 1.6, w: 2, h: 6.8 },
  g: { x: 1.6, y: 8, w: 6.8, h: 2 },
};

const DIGITS: Record<string, string> = {
  "0": "abcdef",
  "1": "bc",
  "2": "abdeg",
  "3": "abcdg",
  "4": "bcfg",
  "5": "acdfg",
  "6": "acdefg",
  "7": "abc",
  "8": "abcdefg",
  "9": "abcdfg",
};

/** Lit segments for a character. "'" and " " are narrow special cases. */
export function segmentsFor(ch: string): string[] {
  return (DIGITS[ch] ?? "").split("");
}

/** Width in cell units of one character. */
export function charWidth(ch: string) {
  if (ch === "'") return 3;
  if (ch === " ") return 5;
  return CELL_W;
}

export function textWidth(text: string) {
  return [...text].reduce((sum, ch, i) => sum + charWidth(ch) + (i ? CELL_GAP : 0), 0);
}

/** Draws seven-segment text with its top-left at (x, y), `unit` px per cell unit. */
export function drawSevenSeg(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, unit: number) {
  let cx = x;
  for (const ch of text) {
    if (ch === "'") {
      roundRect(ctx, cx + 0.5 * unit, y, 2 * unit, 5 * unit, unit);
    } else {
      for (const s of segmentsFor(ch)) {
        const seg = SEGMENTS[s];
        // Slight italic slant, like real LCD digits.
        const slant = (1 - (seg.y + seg.h / 2) / CELL_H) * 1.6 * unit;
        roundRect(ctx, cx + seg.x * unit + slant, y + seg.y * unit, seg.w * unit, seg.h * unit, unit);
      }
    }
    cx += (charWidth(ch) + CELL_GAP) * unit;
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
  else ctx.rect(x, y, w, h);
  ctx.fill();
}

/** "'26 11 27" style stamp for a date. */
export function stampText(date = new Date()) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `'${p(date.getFullYear() % 100)} ${p(date.getMonth() + 1)} ${p(date.getDate())}`;
}
