/**
 * Photo filters.
 *
 * Each filter is a list of CSS filter operations. The same list drives both
 * the live camera preview (as a CSS `filter` string) and the captured photo
 * (as per-pixel color matrices). We don't use `CanvasRenderingContext2D.filter`
 * because Safari doesn't support it, which used to silently drop filters from
 * captured shots.
 */

type OpName = "brightness" | "contrast" | "saturate" | "sepia" | "grayscale" | "hue-rotate";
type Op = readonly [OpName, number];

export type Filter = {
  id: string;
  name: string;
  ops: readonly Op[];
};

export const FILTERS: readonly Filter[] = [
  { id: "none", name: "Natural", ops: [] },
  { id: "warm", name: "Warm", ops: [["sepia", 0.22], ["saturate", 1.2], ["brightness", 1.04]] },
  { id: "pop", name: "Pop", ops: [["contrast", 1.15], ["saturate", 1.5]] },
  { id: "soft", name: "Soft", ops: [["contrast", 0.85], ["brightness", 1.1], ["saturate", 0.8]] },
  { id: "film", name: "Film", ops: [["sepia", 0.35], ["contrast", 0.92], ["saturate", 0.85]] },
  { id: "cool", name: "Cool", ops: [["hue-rotate", -12], ["saturate", 0.9], ["brightness", 1.05]] },
  { id: "rose", name: "Rose", ops: [["sepia", 0.15], ["hue-rotate", -20], ["saturate", 1.2]] },
  { id: "mono", name: "Mono", ops: [["grayscale", 1], ["contrast", 1.2], ["brightness", 1.05]] },
  { id: "noir", name: "Noir", ops: [["grayscale", 1], ["contrast", 1.6], ["brightness", 0.9]] },
];

export function filterToCss(filter: Filter): string {
  if (filter.ops.length === 0) return "none";
  return filter.ops
    .map(([name, v]) => (name === "hue-rotate" ? `hue-rotate(${v}deg)` : `${name}(${v})`))
    .join(" ");
}

/** 3x4 affine color matrix, row-major: [rr, rg, rb, ro, gr, gg, gb, go, br, bg, bb, bo]. */
type Matrix = number[];

// Matrices follow the Filter Effects spec so results match the CSS preview.
function opToMatrix([name, v]: Op): Matrix {
  switch (name) {
    case "brightness":
      return [v, 0, 0, 0, 0, v, 0, 0, 0, 0, v, 0];
    case "contrast": {
      const o = 0.5 - 0.5 * v;
      return [v, 0, 0, o, 0, v, 0, o, 0, 0, v, o];
    }
    case "saturate":
      return [
        0.213 + 0.787 * v, 0.715 - 0.715 * v, 0.072 - 0.072 * v, 0,
        0.213 - 0.213 * v, 0.715 + 0.285 * v, 0.072 - 0.072 * v, 0,
        0.213 - 0.213 * v, 0.715 - 0.715 * v, 0.072 + 0.928 * v, 0,
      ];
    case "grayscale": {
      const s = 1 - Math.min(1, v);
      return [
        0.2126 + 0.7874 * s, 0.7152 - 0.7152 * s, 0.0722 - 0.0722 * s, 0,
        0.2126 - 0.2126 * s, 0.7152 + 0.2848 * s, 0.0722 - 0.0722 * s, 0,
        0.2126 - 0.2126 * s, 0.7152 - 0.7152 * s, 0.0722 + 0.9278 * s, 0,
      ];
    }
    case "sepia": {
      const s = 1 - Math.min(1, v);
      return [
        0.393 + 0.607 * s, 0.769 - 0.769 * s, 0.189 - 0.189 * s, 0,
        0.349 - 0.349 * s, 0.686 + 0.314 * s, 0.168 - 0.168 * s, 0,
        0.272 - 0.272 * s, 0.534 - 0.534 * s, 0.131 + 0.869 * s, 0,
      ];
    }
    case "hue-rotate": {
      const a = (v * Math.PI) / 180;
      const c = Math.cos(a);
      const s = Math.sin(a);
      return [
        0.213 + c * 0.787 - s * 0.213, 0.715 - c * 0.715 - s * 0.715, 0.072 - c * 0.072 + s * 0.928, 0,
        0.213 - c * 0.213 + s * 0.143, 0.715 + c * 0.285 + s * 0.14, 0.072 - c * 0.072 - s * 0.283, 0,
        0.213 - c * 0.213 - s * 0.787, 0.715 - c * 0.715 + s * 0.715, 0.072 + c * 0.928 + s * 0.072, 0,
      ];
    }
  }
}

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);

/** Applies a filter to canvas pixels in place. Ops run in order and clamp between steps, as CSS does. */
export function applyFilter(ctx: CanvasRenderingContext2D, width: number, height: number, filter: Filter) {
  if (filter.ops.length === 0) return;
  const matrices = filter.ops.map(opToMatrix);
  const image = ctx.getImageData(0, 0, width, height);
  const d = image.data;
  for (let i = 0; i < d.length; i += 4) {
    let r = d[i] / 255;
    let g = d[i + 1] / 255;
    let b = d[i + 2] / 255;
    for (const m of matrices) {
      const nr = clamp01(m[0] * r + m[1] * g + m[2] * b + m[3]);
      const ng = clamp01(m[4] * r + m[5] * g + m[6] * b + m[7]);
      const nb = clamp01(m[8] * r + m[9] * g + m[10] * b + m[11]);
      r = nr;
      g = ng;
      b = nb;
    }
    d[i] = r * 255;
    d[i + 1] = g * 255;
    d[i + 2] = b * 255;
  }
  ctx.putImageData(image, 0, 0);
}
