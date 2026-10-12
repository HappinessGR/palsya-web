/**
 * Schematic face, ported 1:1 from the legacy prototype's
 * assets/js/charts.js CH.face (without the landmark/tape overlays the
 * landing page doesn't use), so the hero matches the reference exactly.
 */
import { useTranslations } from "next-intl";

function round(n: number, d = 0): number {
  const f = 10 ** d;
  return Math.round(n * f) / f;
}

export function FaceIllustration({
  droop = 0,
  side = "left",
  size = 200,
  label,
}: {
  /** 0 = symmetric, 1 = maximum asymmetry */
  droop?: number;
  /** Patient's affected side; drawn mirror-view (patient left -> image right). */
  side?: "left" | "right";
  size?: number;
  label?: string;
}) {
  const t = useTranslations("landing.face");
  const d = Math.max(0, Math.min(1, droop));
  const sgn = side === "left" ? 1 : -1;
  const cx = 100;
  const cy = 132;
  const browY = 92;
  const eyeY = 112;
  const mouthY = 186;
  const aBrowY = browY + d * 9;
  const aEyeOpen = 1 - d * 0.55;
  const aMouthY = mouthY + d * 13;
  const aMouthX = 26 - d * 6;
  const ex = (off: number) => cx + sgn * off;
  const ux = (off: number) => cx - sgn * off;
  const ucx = ux(26);
  const acx = ex(aMouthX);

  return (
    <svg
      className="face-diagram"
      viewBox="0 0 200 260"
      width={size}
      height={Math.round(size * 1.3)}
      role="img"
      aria-label={label ?? t("defaultLabel")}
    >
      <ellipse cx={cx} cy={cy} rx="66" ry="86" fill="#f6eee6" stroke="var(--line-strong)" strokeWidth="1.5" />

      <path d={`M${ux(46)} ${browY} Q${ux(30)} ${browY - 7} ${ux(14)} ${browY - 1}`} stroke="#6b5647" strokeWidth="4" fill="none" strokeLinecap="round" />
      <path
        d={`M${ex(46)} ${round(aBrowY, 1)} Q${ex(30)} ${round(aBrowY - 7 + d * 6, 1)} ${ex(14)} ${round(aBrowY - 1 + d * 2, 1)}`}
        stroke="#6b5647"
        strokeWidth="4"
        fill="none"
        strokeLinecap="round"
      />

      <ellipse cx={ux(29)} cy={eyeY} rx="12" ry="6.5" fill="#fff" stroke="#4a3d34" strokeWidth="1.6" />
      <circle cx={ux(29)} cy={eyeY} r="3.6" fill="#3c514d" />
      <ellipse
        cx={ex(29)}
        cy={eyeY}
        rx="12"
        ry={round((6.5 / Math.max(aEyeOpen, 0.3)) * (0.55 + aEyeOpen * 0.45), 1)}
        fill="#fff"
        stroke="#4a3d34"
        strokeWidth="1.6"
      />
      <circle cx={ex(29)} cy={eyeY} r="3.6" fill="#3c514d" />

      <path d={`M${cx} ${eyeY + 10} L${cx - 2} ${eyeY + 40} Q${cx} ${eyeY + 46} ${cx + 6} ${eyeY + 40}`} stroke="#c9ab93" strokeWidth="2" fill="none" strokeLinecap="round" />

      <path d={`M${ux(11)} ${eyeY + 42} Q${ux(24)} ${mouthY - 8} ${ux(21)} ${mouthY + 4}`} stroke="#e0c3ab" strokeWidth="2" fill="none" opacity=".9" />
      {d < 0.75 && (
        <path
          d={`M${ex(11)} ${eyeY + 42} Q${ex(20)} ${mouthY - 4} ${ex(17)} ${round(mouthY + 6 + d * 8, 1)}`}
          stroke="#e0c3ab"
          strokeWidth="2"
          fill="none"
          opacity={round(0.9 - d, 2)}
        />
      )}

      <path
        d={`M${round(ucx, 1)} ${mouthY} Q${cx} ${round(mouthY + 9 - d * 2, 1)} ${round(acx, 1)} ${round(aMouthY, 1)}`}
        stroke="#b8574f"
        strokeWidth="3.4"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d={`M${round(ucx, 1)} ${mouthY} Q${cx} ${round(mouthY - 3, 1)} ${round(acx, 1)} ${round(aMouthY, 1)}`}
        stroke="#d98b83"
        strokeWidth="1.6"
        fill="none"
        opacity=".7"
      />
    </svg>
  );
}
