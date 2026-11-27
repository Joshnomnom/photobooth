"use client";

import { type KeyboardEvent, type PointerEvent, useCallback, useEffect, useRef } from "react";
import { type Decorations, drawDecorations, handlePos, hitSticker, newId } from "@/lib/decorations";
import { drawStrip, type StripOptions } from "@/lib/strip";

export type Tool = "stickers" | "pen";
export type Pen = { color: string; width: number; halo: boolean };

type Props = {
  strip: StripOptions;
  decorations: Decorations;
  /** `snapshot` is the state before this change; pass it once per user action so it can be undone. */
  onChange: (next: Decorations, snapshot?: Decorations) => void;
  tool: Tool;
  pen: Pen;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onSize: (size: { width: number; height: number }) => void;
  locked: boolean;
};

type Drag =
  | { type: "move"; id: string; dx: number; dy: number; start: Decorations; moved: boolean }
  | { type: "transform"; id: string; a0: number; d0: number; size0: number; rot0: number; start: Decorations; moved: boolean }
  | { type: "draw"; id: string };

/** Base sticker size for a strip canvas. */
export const stickerBase = (w: number, h: number) => Math.round(Math.min(w, h) * 0.32);

/** The strip as an editable canvas: drag stickers, turn/resize with the handle, draw with the pen. */
export function StripEditor({ strip, decorations, onChange, tool, pen, selectedId, onSelect, onSize, locked }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const baseRef = useRef<HTMLCanvasElement | null>(null);
  const drag = useRef<Drag | null>(null);
  const latest = useRef({ decorations, selectedId });
  useEffect(() => {
    latest.current = { decorations, selectedId };
  });

  /** Handle radius in canvas px, so it's ~14 CSS px whatever the display scale. */
  const handleRadius = useCallback(() => {
    const c = ref.current;
    if (!c) return 30;
    const w = c.getBoundingClientRect().width || c.width;
    return 14 * (c.width / w);
  }, []);

  const paint = useCallback(() => {
    const c = ref.current;
    const base = baseRef.current;
    const ctx = c?.getContext("2d");
    if (!c || !base || !ctx) return;
    const { decorations: deco, selectedId: sel } = latest.current;
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.drawImage(base, 0, 0);
    drawDecorations(ctx, deco, strip.fonts);
    const s = deco.stickers.find((x) => x.id === sel);
    if (s && !locked) {
      // Selection ring + resize/rotate handle (editor only, never exported).
      const r = handleRadius();
      ctx.save();
      ctx.lineWidth = r * 0.22;
      ctx.setLineDash([r * 0.6, r * 0.45]);
      ctx.strokeStyle = "rgba(255,255,255,0.95)";
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size * 0.6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      const h = handlePos(s);
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = "#e5482f";
      ctx.lineWidth = r * 0.3;
      ctx.beginPath();
      ctx.arc(h.x, h.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Little rotate arrow inside the handle.
      ctx.beginPath();
      ctx.arc(h.x, h.y, r * 0.45, -Math.PI * 0.9, Math.PI * 0.4);
      ctx.stroke();
      ctx.restore();
    }
  }, [strip.fonts, locked, handleRadius]);

  // Rebuild the undecorated strip only when the strip itself changes.
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const build = () => {
      const base = baseRef.current ?? document.createElement("canvas");
      drawStrip(base, { ...strip, decorations: undefined });
      baseRef.current = base;
      if (c.width !== base.width || c.height !== base.height) {
        c.width = base.width;
        c.height = base.height;
        onSize({ width: base.width, height: base.height });
      }
      paint();
    };
    build();
    let cancelled = false;
    document.fonts?.ready.then(() => {
      if (!cancelled) build();
    });
    return () => {
      cancelled = true;
    };
  }, [strip, paint, onSize]);

  useEffect(() => {
    paint();
  }, [decorations, selectedId, paint]);

  const toCanvas = (e: PointerEvent) => {
    const c = ref.current!;
    const rect = c.getBoundingClientRect();
    return { x: ((e.clientX - rect.left) * c.width) / rect.width, y: ((e.clientY - rect.top) * c.height) / rect.height };
  };

  const onPointerDown = (e: PointerEvent<HTMLCanvasElement>) => {
    if (locked) return;
    const p = toCanvas(e);
    e.currentTarget.setPointerCapture(e.pointerId);
    const deco = latest.current.decorations;

    if (tool === "pen") {
      const id = newId();
      onChange({ ...deco, strokes: [...deco.strokes, { id, ...pen, points: [p.x, p.y] }] }, deco);
      drag.current = { type: "draw", id };
      return;
    }

    const sel = deco.stickers.find((s) => s.id === latest.current.selectedId);
    if (sel) {
      const h = handlePos(sel);
      if (Math.hypot(p.x - h.x, p.y - h.y) < handleRadius() * 1.7) {
        drag.current = {
          type: "transform",
          id: sel.id,
          a0: Math.atan2(p.y - sel.y, p.x - sel.x),
          d0: Math.max(1, Math.hypot(p.x - sel.x, p.y - sel.y)),
          size0: sel.size,
          rot0: sel.rotation,
          start: deco,
          moved: false,
        };
        return;
      }
    }

    const i = hitSticker(deco, p.x, p.y);
    if (i >= 0) {
      const s = deco.stickers[i];
      onSelect(s.id);
      drag.current = { type: "move", id: s.id, dx: p.x - s.x, dy: p.y - s.y, start: deco, moved: false };
      return;
    }
    onSelect(null);
  };

  const onPointerMove = (e: PointerEvent<HTMLCanvasElement>) => {
    const d = drag.current;
    if (!d) return;
    const p = toCanvas(e);
    const deco = latest.current.decorations;

    if (d.type === "draw") {
      const strokes = deco.strokes.map((s) => {
        if (s.id !== d.id) return s;
        const n = s.points.length;
        if (Math.hypot(p.x - s.points[n - 2], p.y - s.points[n - 1]) < 3) return s;
        return { ...s, points: [...s.points, p.x, p.y] };
      });
      onChange({ ...deco, strokes });
      return;
    }

    const c = ref.current!;
    const base = stickerBase(c.width, c.height);
    const update = (fn: (s: Decorations["stickers"][number]) => Decorations["stickers"][number]) => {
      // The sticker being handled moves to the top of the stack.
      const target = deco.stickers.find((s) => s.id === d.id);
      if (!target) return;
      const stickers = [...deco.stickers.filter((s) => s.id !== d.id), fn(target)];
      onChange({ ...deco, stickers }, d.moved ? undefined : d.start);
      d.moved = true;
    };

    if (d.type === "move") {
      update((s) => ({ ...s, x: p.x - d.dx, y: p.y - d.dy }));
    } else {
      update((s) => {
        const a = Math.atan2(p.y - s.y, p.x - s.x);
        const dist = Math.hypot(p.x - s.x, p.y - s.y);
        const size = Math.min(base * 3, Math.max(base * 0.35, (d.size0 * dist) / d.d0));
        return { ...s, size, rotation: d.rot0 + (a - d.a0) };
      });
    }
  };

  const onPointerUp = () => {
    drag.current = null;
  };

  const onKeyDown = (e: KeyboardEvent<HTMLCanvasElement>) => {
    if (locked) return;
    const { decorations: deco, selectedId: sel } = latest.current;
    const s = deco.stickers.find((x) => x.id === sel);
    if (!s) return;
    const step = e.shiftKey ? 40 : 10;
    let next: typeof s | null = null;
    switch (e.key) {
      case "ArrowLeft":
        next = { ...s, x: s.x - step };
        break;
      case "ArrowRight":
        next = { ...s, x: s.x + step };
        break;
      case "ArrowUp":
        next = { ...s, y: s.y - step };
        break;
      case "ArrowDown":
        next = { ...s, y: s.y + step };
        break;
      case "+":
      case "=":
        next = { ...s, size: s.size * 1.1 };
        break;
      case "-":
        next = { ...s, size: s.size / 1.1 };
        break;
      case "[":
        next = { ...s, rotation: s.rotation - 0.12 };
        break;
      case "]":
        next = { ...s, rotation: s.rotation + 0.12 };
        break;
      case "Delete":
      case "Backspace":
        e.preventDefault();
        onChange({ ...deco, stickers: deco.stickers.filter((x) => x.id !== s.id) }, deco);
        onSelect(null);
        return;
      case "Escape":
        onSelect(null);
        return;
      default:
        return;
    }
    e.preventDefault();
    onChange({ ...deco, stickers: deco.stickers.map((x) => (x.id === s.id ? next! : x)) }, deco);
  };

  return (
    <canvas
      ref={ref}
      tabIndex={0}
      role="img"
      aria-label="Your strip. Select a sticker, then use arrow keys to move, plus and minus to resize, square brackets to rotate, Delete to remove."
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onKeyDown={onKeyDown}
      className={`mx-auto block h-auto max-h-[82vh] w-auto max-w-full touch-none shadow-[0_18px_40px_-12px_rgb(28_26_23/0.35)] ${
        locked ? "cursor-not-allowed" : tool === "pen" ? "cursor-crosshair" : "cursor-grab active:cursor-grabbing"
      }`}
    />
  );
}
