import type { CountdownStyle } from "@/lib/machines";
import { CELL_H, CELL_W, SEGMENTS, segmentsFor } from "@/lib/sevenSeg";

/** The booth's countdown number, styled per machine. */
export function Countdown({ value, variant }: { value: number; variant: CountdownStyle }) {
  if (variant === "lcd") return <LcdDigits text={String(value)} />;
  return (
    <span key={value} className={`animate-count count-${variant}`}>
      {value}
    </span>
  );
}

/** Seven-segment digits with faint "ghost" segments, like a real LCD. */
function LcdDigits({ text }: { text: string }) {
  const w = text.length * (CELL_W + 3) - 3;
  return (
    <svg key={text} viewBox={`-2 -1 ${w + 4} ${CELL_H + 2}`} className="count-lcd animate-count" role="img" aria-label={text}>
      {[...text].map((ch, i) => {
        const lit = new Set(segmentsFor(ch));
        return (
          <g key={i} transform={`translate(${i * (CELL_W + 3)} 0) skewX(-6)`}>
            {Object.entries(SEGMENTS).map(([id, s]) => (
              <rect key={id} x={s.x} y={s.y} width={s.w} height={s.h} rx={0.9} className={lit.has(id) ? "seg-on" : "seg-off"} />
            ))}
          </g>
        );
      })}
    </svg>
  );
}
