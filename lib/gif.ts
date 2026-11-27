/**
 * Small animated-GIF encoder (no dependencies).
 * - One shared 256-color palette built by median cut over all frames
 * - Floyd–Steinberg dithering, so skin tones don't band
 * - LZW compression following the classic GIF encoder's code-width rules
 * - Loops forever (NETSCAPE2.0 extension)
 */

type RGB = [number, number, number];

/** Median cut over sampled pixels → up to `max` colors. */
function buildPalette(frames: ImageData[], max = 256): RGB[] {
  // Sample roughly 60k pixels across all frames.
  const total = frames.reduce((n, f) => n + f.width * f.height, 0);
  const step = Math.max(1, Math.floor(total / 60000));
  const px: number[] = [];
  let k = 0;
  for (const f of frames) {
    const d = f.data;
    for (let i = 0; i < d.length; i += 4) {
      if (k++ % step === 0) px.push(d[i], d[i + 1], d[i + 2]);
    }
  }
  type Box = { idx: number[] };
  const all: number[] = [];
  for (let i = 0; i < px.length; i += 3) all.push(i);
  const boxes: Box[] = [{ idx: all }];

  const range = (b: Box) => {
    const lo = [255, 255, 255];
    const hi = [0, 0, 0];
    for (const i of b.idx) {
      for (let c = 0; c < 3; c++) {
        const v = px[i + c];
        if (v < lo[c]) lo[c] = v;
        if (v > hi[c]) hi[c] = v;
      }
    }
    const r = [hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]];
    const ch = r[0] >= r[1] && r[0] >= r[2] ? 0 : r[1] >= r[2] ? 1 : 2;
    return { ch, size: r[ch] };
  };

  while (boxes.length < max) {
    let best = -1;
    let bestSize = 0;
    let bestCh = 0;
    boxes.forEach((b, i) => {
      if (b.idx.length < 2) return;
      const { ch, size } = range(b);
      if (size > bestSize) {
        bestSize = size;
        best = i;
        bestCh = ch;
      }
    });
    if (best < 0 || bestSize === 0) break;
    const b = boxes[best];
    b.idx.sort((a, c) => px[a + bestCh] - px[c + bestCh]);
    const mid = b.idx.length >> 1;
    boxes.splice(best, 1, { idx: b.idx.slice(0, mid) }, { idx: b.idx.slice(mid) });
  }

  const palette = boxes.map((b): RGB => {
    let r = 0;
    let g = 0;
    let bl = 0;
    for (const i of b.idx) {
      r += px[i];
      g += px[i + 1];
      bl += px[i + 2];
    }
    const n = b.idx.length || 1;
    return [Math.round(r / n), Math.round(g / n), Math.round(bl / n)];
  });
  while (palette.length < max) palette.push([0, 0, 0]);
  return palette;
}

/** Maps a frame to palette indices with Floyd–Steinberg dithering. */
function indexFrame(f: ImageData, palette: RGB[], cache: Int16Array): Uint8Array {
  const { width: w, height: h, data } = f;
  const out = new Uint8Array(w * h);
  const err = new Float32Array(w * h * 3);
  const nearest = (r: number, g: number, b: number) => {
    const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
    const hit = cache[key];
    if (hit >= 0) return hit;
    let best = 0;
    let bd = Infinity;
    for (let i = 0; i < palette.length; i++) {
      const p = palette[i];
      const d = (p[0] - r) ** 2 * 2 + (p[1] - g) ** 2 * 4 + (p[2] - b) ** 2 * 3;
      if (d < bd) {
        bd = d;
        best = i;
      }
    }
    cache[key] = best;
    return best;
  };
  const clamp = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : v);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = y * w + x;
      const r = clamp(data[p * 4] + err[p * 3]);
      const g = clamp(data[p * 4 + 1] + err[p * 3 + 1]);
      const b = clamp(data[p * 4 + 2] + err[p * 3 + 2]);
      const i = nearest(r | 0, g | 0, b | 0);
      out[p] = i;
      const c = palette[i];
      const er = r - c[0];
      const eg = g - c[1];
      const eb = b - c[2];
      const spread = (q: number, f: number) => {
        err[q * 3] += er * f;
        err[q * 3 + 1] += eg * f;
        err[q * 3 + 2] += eb * f;
      };
      if (x + 1 < w) spread(p + 1, 7 / 16);
      if (y + 1 < h) {
        if (x > 0) spread(p + w - 1, 3 / 16);
        spread(p + w, 5 / 16);
        if (x + 1 < w) spread(p + w + 1, 1 / 16);
      }
    }
  }
  return out;
}

/** LZW-compresses palette indices into GIF data sub-blocks. */
function lzw(indices: Uint8Array, minCodeSize = 8): number[] {
  const clear = 1 << minCodeSize;
  const eoi = clear + 1;
  const initBits = minCodeSize + 1;
  let nBits = initBits;
  let maxCode = (1 << nBits) - 1;
  let freeEnt = clear + 2;
  let clearFlag = false;
  const dict = new Map<number, number>();
  const bytes: number[] = [];
  let cur = 0;
  let curBits = 0;

  const output = (code: number) => {
    cur |= code << curBits;
    curBits += nBits;
    while (curBits >= 8) {
      bytes.push(cur & 0xff);
      cur >>>= 8;
      curBits -= 8;
    }
    if (freeEnt > maxCode || clearFlag) {
      if (clearFlag) {
        nBits = initBits;
        maxCode = (1 << nBits) - 1;
        clearFlag = false;
      } else {
        nBits++;
        maxCode = nBits === 12 ? 4096 : (1 << nBits) - 1;
      }
    }
  };

  output(clear);
  let ent = indices[0];
  for (let i = 1; i < indices.length; i++) {
    const c = indices[i];
    const key = (c << 12) | ent;
    const hit = dict.get(key);
    if (hit !== undefined) {
      ent = hit;
      continue;
    }
    output(ent);
    ent = c;
    if (freeEnt < 4096) {
      dict.set(key, freeEnt++);
    } else {
      dict.clear();
      freeEnt = clear + 2;
      clearFlag = true;
      output(clear);
    }
  }
  output(ent);
  output(eoi);
  if (curBits > 0) bytes.push(cur & 0xff);

  // Split into sub-blocks of at most 255 bytes.
  const blocks: number[] = [minCodeSize];
  for (let i = 0; i < bytes.length; i += 255) {
    const chunk = bytes.slice(i, i + 255);
    blocks.push(chunk.length, ...chunk);
  }
  blocks.push(0);
  return blocks;
}

export function encodeGif(frames: ImageData[], delayCs: number): Blob {
  const { width: w, height: h } = frames[0];
  const palette = buildPalette(frames);
  const cache = new Int16Array(1 << 15).fill(-1);
  const parts: Uint8Array[] = [];
  const u16 = (n: number) => [n & 0xff, (n >> 8) & 0xff];

  parts.push(new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, ...u16(w), ...u16(h), 0xf7, 0, 0]));
  parts.push(new Uint8Array(palette.flat()));
  // Loop forever.
  parts.push(new Uint8Array([0x21, 0xff, 0x0b, ...[..."NETSCAPE2.0"].map((c) => c.charCodeAt(0)), 0x03, 0x01, 0, 0, 0]));

  for (const f of frames) {
    parts.push(new Uint8Array([0x21, 0xf9, 0x04, 0x04, ...u16(delayCs), 0, 0]));
    parts.push(new Uint8Array([0x2c, 0, 0, 0, 0, ...u16(w), ...u16(h), 0]));
    parts.push(new Uint8Array(lzw(indexFrame(f, palette, cache))));
  }
  parts.push(new Uint8Array([0x3b]));
  return new Blob(parts as BlobPart[], { type: "image/gif" });
}
