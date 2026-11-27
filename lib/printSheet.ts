/**
 * Print-ready export: a 4×6 in sheet at 300 dpi (1200×1800 px).
 * Strips print two-up with a cut line down the middle, like a real booth;
 * grids print one-up. The PNG carries a 300 dpi pHYs chunk so photo printers
 * size it correctly.
 */

const DPI = 300;
const SHORT = 4 * DPI; // 1200
const LONG = 6 * DPI; // 1800

type Source = CanvasImageSource & { width: number; height: number };

export async function printSheet(src: Source): Promise<Blob> {
  const strip = src.width / src.height < 0.5;
  const landscape = !strip && src.width > src.height;
  const canvas = document.createElement("canvas");
  canvas.width = landscape ? LONG : SHORT;
  canvas.height = landscape ? SHORT : LONG;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not supported");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingQuality = "high";

  const fit = (x: number, y: number, w: number, h: number, margin: number) => {
    const s = Math.min((w - margin * 2) / src.width, (h - margin * 2) / src.height);
    const dw = src.width * s;
    const dh = src.height * s;
    ctx.drawImage(src, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  };

  if (strip) {
    const half = canvas.width / 2;
    fit(0, 0, half, canvas.height, 24);
    fit(half, 0, half, canvas.height, 24);
    // Cut guide.
    ctx.strokeStyle = "rgba(0,0,0,0.25)";
    ctx.lineWidth = 2;
    ctx.setLineDash([14, 12]);
    ctx.beginPath();
    ctx.moveTo(half, 0);
    ctx.lineTo(half, canvas.height);
    ctx.stroke();
  } else {
    fit(0, 0, canvas.width, canvas.height, 60);
  }

  const png = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Couldn't export"))), "image/png"),
  );
  return withDpi(png, DPI);
}

// ── PNG pHYs chunk ──

let crcTable: Uint32Array | null = null;
function crc32(bytes: Uint8Array) {
  if (!crcTable) {
    crcTable = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crcTable[n] = c >>> 0;
    }
  }
  let c = 0xffffffff;
  for (const b of bytes) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** Inserts a pHYs chunk right after IHDR. */
async function withDpi(png: Blob, dpi: number): Promise<Blob> {
  const bytes = new Uint8Array(await png.arrayBuffer());
  const ihdrEnd = 8 + 4 + 4 + 13 + 4; // signature + IHDR (len, type, data, crc)
  const ppm = Math.round(dpi / 0.0254);
  const chunk = new Uint8Array(4 + 4 + 9 + 4);
  const v = new DataView(chunk.buffer);
  v.setUint32(0, 9);
  chunk.set([0x70, 0x48, 0x59, 0x73], 4); // "pHYs"
  v.setUint32(8, ppm);
  v.setUint32(12, ppm);
  chunk[16] = 1; // unit: meter
  v.setUint32(17, crc32(chunk.subarray(4, 17)));
  return new Blob([bytes.subarray(0, ihdrEnd), chunk, bytes.subarray(ihdrEnd)], { type: "image/png" });
}
