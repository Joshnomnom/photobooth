/**
 * Sticker art, drawn with canvas paths (no image assets, nothing to license).
 * Every sticker is designed in a 100×100 box centered on (0,0) and gets a
 * white "die-cut" border with a soft shadow, like a real sticker.
 */

import type { FontKey, Fonts } from "./fonts";

export type StickerKind =
  | "heart"
  | "star"
  | "sparkle"
  | "flower"
  | "crown"
  | "smiley"
  | "bolt"
  | "shades"
  | "rainbow"
  | "sun"
  | "peace"
  | "ears"
  | "arrow"
  | "bubble-hi"
  | "tape-smile"
  | "tape-snap"
  | "text-xoxo"
  | "text-groovy"
  | "text-farout"
  | "text-bff"
  | "text-cutie"
  | "text-lol"
  | "text-omg"
  | "mustache"
  | "tophat"
  | "monocle"
  | "text-summer"
  | "rec-badge"
  | "play-badge"
  | "barcode"
  | "paid-stamp";

type Draw = (ctx: CanvasRenderingContext2D, fonts: Fonts) => void;

const OUTLINE = 13;

/** Strokes the path thick and white (with shadow) for the die-cut edge, then fills it. */
function dieCut(ctx: CanvasRenderingContext2D, path: Path2D, fill: string, outline = OUTLINE) {
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.25)";
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 3;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.lineWidth = outline;
  ctx.strokeStyle = "#ffffff";
  ctx.stroke(path);
  ctx.restore();
  ctx.fillStyle = fill;
  ctx.fill(path);
}

function heartPath(s = 1, dx = 0, dy = 0) {
  const p = new Path2D();
  p.moveTo(dx, dy + 38 * s);
  p.bezierCurveTo(dx - 55 * s, dy + 2 * s, dx - 40 * s, dy - 44 * s, dx, dy - 20 * s);
  p.bezierCurveTo(dx + 40 * s, dy - 44 * s, dx + 55 * s, dy + 2 * s, dx, dy + 38 * s);
  p.closePath();
  return p;
}

function starPath(r = 44, inner = 0.45, points = 5) {
  const p = new Path2D();
  for (let i = 0; i < points * 2; i++) {
    const a = (Math.PI / points) * i - Math.PI / 2;
    const rr = i % 2 ? r * inner : r;
    if (i === 0) p.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
    else p.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  p.closePath();
  return p;
}

function circle(r: number, x = 0, y = 0) {
  const p = new Path2D();
  p.arc(x, y, r, 0, Math.PI * 2);
  return p;
}

/** Text sticker: bold word with a white outline. */
function word(text: string, font: FontKey, color: string, size: number, weight = 700, tilt = -0.08): Draw {
  return (ctx, fonts) => {
    ctx.save();
    ctx.rotate(tilt);
    ctx.font = `${weight} ${size}px ${fonts[font]}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const w = ctx.measureText(text).width;
    const scale = w > 120 ? 120 / w : 1;
    ctx.scale(scale, scale);
    ctx.lineJoin = "round";
    ctx.shadowColor = "rgba(0,0,0,0.25)";
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 3;
    ctx.lineWidth = size * 0.32;
    ctx.strokeStyle = "#ffffff";
    ctx.strokeText(text, 0, 0);
    ctx.shadowColor = "transparent";
    ctx.fillStyle = color;
    ctx.fillText(text, 0, 0);
    ctx.restore();
  };
}

/** A strip of masking tape with typed text on it. */
function tape(text: string): Draw {
  return (ctx, fonts) => {
    ctx.save();
    ctx.rotate(-0.12);
    const p = new Path2D();
    // Torn ends: small zigzags.
    p.moveTo(-58, -16);
    for (let y = -16; y <= 16; y += 8) p.lineTo(y % 16 === 0 ? -58 : -54, y);
    p.lineTo(58, 16);
    for (let y = 16; y >= -16; y -= 8) p.lineTo(y % 16 === 0 ? 58 : 54, y);
    p.closePath();
    ctx.shadowColor = "rgba(0,0,0,0.2)";
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 2;
    ctx.fillStyle = "rgba(236,224,196,0.95)";
    ctx.fill(p);
    ctx.shadowColor = "transparent";
    ctx.fillStyle = "#2a251d";
    ctx.font = `700 20px ${fonts.typewriter}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 0, 1);
    ctx.restore();
  };
}

const ART: Record<StickerKind, { label: string; draw: Draw }> = {
  heart: { label: "Heart", draw: (ctx) => dieCut(ctx, heartPath(), "#ff4f8b") },
  star: { label: "Star", draw: (ctx) => dieCut(ctx, starPath(), "#ffd23f") },
  sparkle: { label: "Sparkle", draw: (ctx) => dieCut(ctx, starPath(46, 0.2, 4), "#fff2a8") },
  flower: {
    label: "Flower",
    draw: (ctx) => {
      // Each petal is its own sub-path, so they don't join into one blob.
      const petals = new Path2D();
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i;
        const cx = Math.cos(a) * 25;
        const cy = Math.sin(a) * 25;
        petals.moveTo(cx + Math.cos(a) * 19, cy + Math.sin(a) * 19);
        petals.ellipse(cx, cy, 19, 12, a, 0, Math.PI * 2);
      }
      dieCut(ctx, petals, "#fffdf5");
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = "#e3a92f";
      ctx.stroke(petals);
      ctx.fillStyle = "#f5b82e";
      ctx.fill(circle(14));
    },
  },
  crown: {
    label: "Crown",
    draw: (ctx) => {
      const p = new Path2D();
      p.moveTo(-42, 26);
      p.lineTo(-46, -22);
      p.lineTo(-22, 2);
      p.lineTo(0, -32);
      p.lineTo(22, 2);
      p.lineTo(46, -22);
      p.lineTo(42, 26);
      p.closePath();
      dieCut(ctx, p, "#ffcf3f");
      ctx.fillStyle = "#ff4f8b";
      ctx.fill(circle(5, 0, 12));
      ctx.fillStyle = "#4fb6ff";
      ctx.fill(circle(4, -24, 14));
      ctx.fill(circle(4, 24, 14));
    },
  },
  smiley: {
    label: "Smiley",
    draw: (ctx) => {
      dieCut(ctx, circle(40), "#ffd93b");
      ctx.fillStyle = "#2a2116";
      ctx.fill(circle(5, -13, -8));
      ctx.fill(circle(5, 13, -8));
      ctx.lineWidth = 5;
      ctx.lineCap = "round";
      ctx.strokeStyle = "#2a2116";
      ctx.beginPath();
      ctx.arc(0, 4, 20, 0.2 * Math.PI, 0.8 * Math.PI);
      ctx.stroke();
    },
  },
  bolt: {
    label: "Lightning",
    draw: (ctx) => {
      const p = new Path2D();
      p.moveTo(8, -46);
      p.lineTo(-24, 6);
      p.lineTo(-2, 6);
      p.lineTo(-10, 46);
      p.lineTo(24, -8);
      p.lineTo(2, -8);
      p.closePath();
      dieCut(ctx, p, "#ffd000");
    },
  },
  shades: {
    label: "Shades",
    draw: (ctx) => {
      const p = new Path2D();
      p.roundRect(-50, -14, 42, 28, 10);
      p.roundRect(8, -14, 42, 28, 10);
      p.rect(-10, -10, 20, 6);
      dieCut(ctx, p, "#141414");
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.fillRect(-42, -8, 10, 5);
      ctx.fillRect(16, -8, 10, 5);
    },
  },
  rainbow: {
    label: "Rainbow",
    draw: (ctx) => {
      const colors = ["#e84a3c", "#f39a2b", "#f7d443", "#5cb85c", "#3f8fd8"];
      ctx.lineCap = "round";
      ctx.lineWidth = 9 * colors.length + OUTLINE;
      ctx.strokeStyle = "#ffffff";
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.25)";
      ctx.shadowBlur = 6;
      ctx.shadowOffsetY = 3;
      ctx.beginPath();
      ctx.arc(0, 22, 26, Math.PI, 0);
      ctx.stroke();
      ctx.restore();
      colors.forEach((c, i) => {
        ctx.lineWidth = 9;
        ctx.strokeStyle = c;
        ctx.lineCap = "butt";
        ctx.beginPath();
        ctx.arc(0, 22, 44 - i * 9, Math.PI, 0);
        ctx.stroke();
      });
    },
  },
  sun: {
    label: "Sun",
    draw: (ctx) => {
      dieCut(ctx, starPath(48, 0.68, 12), "#f6a623");
      ctx.fillStyle = "#ffd25a";
      ctx.fill(circle(24));
    },
  },
  peace: {
    label: "Peace",
    draw: (ctx) => {
      dieCut(ctx, circle(40), "#7bc47f");
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 7;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.arc(0, 0, 27, 0, Math.PI * 2);
      ctx.moveTo(0, -27);
      ctx.lineTo(0, 27);
      ctx.moveTo(0, 2);
      ctx.lineTo(-19, 19);
      ctx.moveTo(0, 2);
      ctx.lineTo(19, 19);
      ctx.stroke();
    },
  },
  ears: {
    label: "Bunny ears",
    draw: (ctx) => {
      const p = new Path2D();
      p.ellipse(-20, -6, 14, 40, -0.25, 0, Math.PI * 2);
      p.moveTo(20 + 14 * Math.cos(0.25), -6 + 14 * Math.sin(0.25));
      p.ellipse(20, -6, 14, 40, 0.25, 0, Math.PI * 2);
      dieCut(ctx, p, "#fff4f8");
      ctx.fillStyle = "#ffa8c8";
      const inner = new Path2D();
      inner.ellipse(-20, -4, 6, 28, -0.25, 0, Math.PI * 2);
      inner.moveTo(20 + 6 * Math.cos(0.25), -4 + 6 * Math.sin(0.25));
      inner.ellipse(20, -4, 6, 28, 0.25, 0, Math.PI * 2);
      ctx.fill(inner);
    },
  },
  arrow: {
    label: "Arrow",
    draw: (ctx) => {
      const p = new Path2D();
      p.moveTo(-44, 22);
      p.quadraticCurveTo(-6, -26, 34, -14);
      ctx.save();
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      for (const [w, c] of [
        [20, "#ffffff"],
        [7, "#e5482f"],
      ] as const) {
        ctx.lineWidth = w;
        ctx.strokeStyle = c;
        ctx.stroke(p);
        ctx.beginPath();
        ctx.moveTo(20, -30);
        ctx.lineTo(38, -13);
        ctx.lineTo(16, -2);
        ctx.stroke();
      }
      ctx.restore();
    },
  },
  "bubble-hi": {
    label: "Speech bubble",
    draw: (ctx, fonts) => {
      const p = new Path2D();
      p.ellipse(0, -6, 46, 32, 0, 0, Math.PI * 2);
      p.moveTo(-18, 20);
      p.lineTo(-30, 42);
      p.lineTo(2, 24);
      dieCut(ctx, p, "#ffffff", 8);
      ctx.strokeStyle = "#1f1d1a";
      ctx.lineWidth = 3;
      ctx.stroke(p);
      ctx.fillStyle = "#1f1d1a";
      ctx.font = `700 30px ${fonts.rounded}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("hi!", 0, -5);
    },
  },
  "tape-smile": { label: "Tape: SMILE", draw: tape("SMILE") },
  "tape-snap": { label: "Tape: SNAP!", draw: tape("SNAP!") },
  "text-xoxo": { label: "xoxo", draw: word("xoxo", "typewriter", "#b3261e", 34) },
  "text-groovy": { label: "groovy", draw: word("groovy", "groovy", "#e8862a", 34, 400) },
  "text-farout": { label: "far out", draw: word("far out", "groovy", "#8a4a19", 30, 400, 0.08) },
  "text-bff": { label: "BFF", draw: word("BFF", "rounded", "#ff4f8b", 44) },
  "text-cutie": { label: "cutie", draw: word("cutie", "rounded", "#8a5cf6", 38) },
  "text-lol": { label: "LOL", draw: word("LOL", "body", "#2f7bff", 42, 800) },
  "text-omg": { label: "OMG", draw: word("OMG", "body", "#ff7a1a", 40, 800, 0.1) },
  // Added with the 1890, 72, 89 and 25 machines.
  mustache: { label: "Mustache", draw: (ctx: CanvasRenderingContext2D) => dieCut(ctx, mustachePath(), "#2a1d14") },
  tophat: {
    label: "Top hat",
    draw: (ctx: CanvasRenderingContext2D) => {
      const p = new Path2D();
      p.rect(-24, -42, 48, 56);
      p.roundRect(-46, 10, 92, 14, 6);
      dieCut(ctx, p, "#1b1b1d");
      ctx.fillStyle = "#7a1f1f";
      ctx.fillRect(-24, 0, 48, 9);
    },
  },
  monocle: {
    label: "Monocle",
    draw: (ctx: CanvasRenderingContext2D) => {
      const ring = new Path2D();
      ring.arc(-6, -6, 26, 0, Math.PI * 2);
      ctx.save();
      ctx.lineWidth = 9 + OUTLINE;
      ctx.strokeStyle = "#ffffff";
      ctx.shadowColor = "rgba(0,0,0,0.25)";
      ctx.shadowBlur = 6;
      ctx.stroke(ring);
      ctx.restore();
      ctx.fillStyle = "rgba(200,225,255,0.35)";
      ctx.fill(ring);
      ctx.lineWidth = 7;
      ctx.strokeStyle = "#c9a24a";
      ctx.stroke(ring);
      ctx.beginPath();
      ctx.moveTo(14, 12);
      ctx.quadraticCurveTo(30, 30, 22, 46);
      ctx.lineWidth = 3;
      ctx.stroke();
    },
  },
  "text-summer": { label: "summer '72", draw: word("summer '72", "hand", "#c4532a", 38, 600) },
  "rec-badge": {
    label: "REC",
    draw: (ctx: CanvasRenderingContext2D, fonts: Fonts) => {
      const p = new Path2D();
      p.roundRect(-46, -20, 92, 40, 8);
      dieCut(ctx, p, "#111111", 8);
      ctx.fillStyle = "#ff3b3b";
      ctx.beginPath();
      ctx.arc(-24, 0, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.font = `400 34px ${fonts.pixel}`;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText("REC", -10, 2);
    },
  },
  "play-badge": {
    label: "PLAY",
    draw: (ctx: CanvasRenderingContext2D, fonts: Fonts) => {
      const p = new Path2D();
      p.roundRect(-50, -20, 100, 40, 6);
      dieCut(ctx, p, "#1d3fbf", 8);
      ctx.fillStyle = "#ffffff";
      ctx.font = `400 32px ${fonts.pixel}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("PLAY \u25B6", 0, 2);
    },
  },
  barcode: {
    label: "Barcode",
    draw: (ctx: CanvasRenderingContext2D) => {
      const p = new Path2D();
      p.rect(-48, -26, 96, 52);
      dieCut(ctx, p, "#f6f4ee", 8);
      ctx.fillStyle = "#1d1d1d";
      const widths = [3, 1, 2, 1, 3, 2, 1, 1, 3, 1, 2, 3, 1, 2, 1, 3, 1, 1, 2, 3, 1, 2];
      let x = -40;
      widths.forEach((bw, i) => {
        if (i % 2 === 0) ctx.fillRect(x, -18, bw * 1.6, 30);
        x += bw * 1.8;
      });
    },
  },
  "paid-stamp": {
    label: "PAID stamp",
    draw: (ctx: CanvasRenderingContext2D, fonts: Fonts) => {
      ctx.save();
      ctx.rotate(-0.2);
      ctx.strokeStyle = "rgba(196,40,40,0.9)";
      ctx.lineWidth = 6;
      ctx.strokeRect(-46, -22, 92, 44);
      ctx.lineWidth = 2;
      ctx.strokeRect(-40, -16, 80, 32);
      ctx.fillStyle = "rgba(196,40,40,0.9)";
      ctx.font = `700 30px ${fonts.typewriter}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("PAID", 0, 2);
      ctx.restore();
    },
  },
};

export const stickerLabel = (kind: StickerKind) => ART[kind].label;

function mustachePath() {
  const p = new Path2D();
  p.moveTo(0, -6);
  p.bezierCurveTo(10, -18, 30, -14, 34, -2);
  p.bezierCurveTo(40, 6, 50, 4, 54, -6);
  p.bezierCurveTo(54, 12, 34, 20, 18, 10);
  p.bezierCurveTo(10, 6, 4, 4, 0, 6);
  p.bezierCurveTo(-4, 4, -10, 6, -18, 10);
  p.bezierCurveTo(-34, 20, -54, 12, -54, -6);
  p.bezierCurveTo(-50, 4, -40, 6, -34, -2);
  p.bezierCurveTo(-30, -14, -10, -18, 0, -6);
  p.closePath();
  return p;
}



/** Draws a sticker centered at (x, y), `size` px across, rotated by `rotation` radians. */
export function drawSticker(ctx: CanvasRenderingContext2D, kind: StickerKind, x: number, y: number, size: number, rotation: number, fonts: Fonts) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  const s = size / 100;
  ctx.scale(s, s);
  ART[kind].draw(ctx, fonts);
  ctx.restore();
}
