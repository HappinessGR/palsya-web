import { FaceIllustration } from "../../components/FaceIllustration";

type Pt = [number, number];

function pathFrom(pts: Pt[]): string {
  return pts.map((p, i) => `${i ? "L" : "M"}${Math.round(p[0] * 10) / 10} ${Math.round(p[1] * 10) / 10}`).join(" ");
}

/**
 * The schematic face with the two overlays the reference screens use —
 * taping strips and the dashed midline — from legacy CH.face (charts.js).
 * FaceIllustration draws the face; this lays a same-viewBox SVG on top.
 */
export function ProgrammeFace({
  droop,
  side = "left",
  size,
  tape,
  midline,
}: {
  droop: number;
  side?: "left" | "right";
  size: number;
  /** Strips as offsets from the midline towards the affected side, legacy units. */
  tape?: Pt[][];
  midline?: boolean;
}) {
  const sgn = side === "left" ? 1 : -1;
  const cx = 100;
  const cy = 132;
  return (
    <div style={{ position: "relative", display: "inline-block", width: size, lineHeight: 0 }}>
      <FaceIllustration droop={droop} side={side} size={size} />
      <svg
        viewBox="0 0 200 260"
        width={size}
        height={Math.round(size * 1.3)}
        aria-hidden="true"
        style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
      >
        {midline && (
          <line x1={cx} y1={cy - 88} x2={cx} y2={cy + 88} stroke="var(--brand)" strokeWidth="1" strokeDasharray="3 4" opacity=".55" />
        )}
        {tape?.map((strip, i) => {
          const d = pathFrom(strip.map(([x, y]) => [cx + sgn * x, y] as Pt));
          return (
            <g key={i}>
              <path d={d} stroke="var(--warm)" strokeWidth="9" strokeLinecap="round" fill="none" opacity=".55" />
              <path d={d} stroke="var(--warm-ink)" strokeWidth="1" strokeDasharray="3 4" fill="none" opacity=".5" />
            </g>
          );
        })}
      </svg>
    </div>
  );
}
