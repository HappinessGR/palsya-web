import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { Icon } from "../../../components/Icon";
import type { DayState } from "./data";

type Values = Record<string, string | number>;
type Translator = { (key: string, values?: Values): string; has(key: string): boolean };

/**
 * phase_assignments.reasons holds whatever the stage assignment stored:
 * a message key under assessment.reasons (optionally as { key, values, text },
 * where text is the English audit copy), or — for rows written before
 * localisation — an English sentence.
 */
export async function getReasonText() {
  const tReasons = (await getTranslations("assessment.reasons")) as unknown as Translator;
  return (reason: unknown): string | null => {
    if (typeof reason === "string") return tReasons.has(reason) ? tReasons(reason) : reason;
    if (reason && typeof reason === "object" && "key" in reason && typeof reason.key === "string") {
      const values = "values" in reason ? (reason.values as Values) : undefined;
      if (tReasons.has(reason.key)) return tReasons(reason.key, values);
      return "text" in reason && typeof reason.text === "string" ? reason.text : null;
    }
    return null;
  };
}

/** Legacy pageHead(): display title, muted subtitle, optional actions on the right. */
export function PageHead({ title, sub, right }: { title: string; sub?: string; right?: ReactNode }) {
  return (
    <div className="row-between" style={{ alignItems: "flex-start", flexWrap: "wrap", gap: 16, marginBottom: "var(--s-6)" }}>
      <div>
        <h2 className="display" style={{ fontSize: "var(--t-3xl)" }}>
          {title}
        </h2>
        {sub && (
          <p className="muted" style={{ marginTop: 6, maxWidth: "64ch" }}>
            {sub}
          </p>
        )}
      </div>
      {right && <div className="row-wrap">{right}</div>}
    </div>
  );
}

/** Legacy stageBadge(n). */
export function StageBadge({ n, label }: { n: number; label: string }) {
  return (
    <span className={`badge badge-p${n}`}>
      <Icon name="activity" size={13} />
      {label}
    </span>
  );
}

/** Legacy CH.arc: a 270° gauge, open at the bottom, split into weighted segments. */
export function Arc({
  segs,
  size = 172,
  stroke = 13,
  centre,
  aria,
}: {
  segs: { weight: number; value: number; colour: string; label: string }[];
  size?: number;
  stroke?: number;
  centre?: ReactNode;
  aria: string;
}) {
  const r = (size - stroke) / 2 - 2;
  const c = size / 2;
  const START = 135;
  const SWEEP = 270;
  const round = (v: number) => Math.round(v * 10) / 10;
  const pt = (deg: number) => {
    const a = ((deg - 90) * Math.PI) / 180;
    return [c + r * Math.cos(a), c + r * Math.sin(a)];
  };
  const arcPath = (from: number, to: number) => {
    const [ax, ay] = pt(from);
    const [bx, by] = pt(to);
    return `M${round(ax)} ${round(ay)} A${r} ${r} 0 ${to - from > 180 ? 1 : 0} 1 ${round(bx)} ${round(by)}`;
  };
  const total = segs.reduce((sum, s) => sum + s.weight, 0) || 1;
  const gap = 3;
  const spans = segs.map((s) => (s.weight / total) * SWEEP);
  const paths = segs.map((s, i) => {
    const span = spans[i];
    const from = START + spans.slice(0, i).reduce((a, b) => a + b, 0);
    const filled = span * Math.min(1, Math.max(0, s.value));
    if (filled <= 1.5) return null;
    return (
      <path
        key={i}
        d={arcPath(from + gap / 2, from + Math.max(filled, gap + 1) - gap / 2)}
        fill="none"
        stroke={s.colour}
        strokeWidth={stroke}
        strokeLinecap="round"
      >
        <title>{s.label}</title>
      </path>
    );
  });

  return (
    <div className="arc-wrap" style={{ width: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} role="img" aria-label={aria}>
        <path d={arcPath(START, START + SWEEP)} fill="none" stroke="var(--surface-2)" strokeWidth={stroke} strokeLinecap="round" />
        {paths}
      </svg>
      {centre && <div className="arc-centre">{centre}</div>}
    </div>
  );
}

/** Legacy CH.pattern: one square per day. */
export function Pattern({ days, aria, title }: { days: { date: string; state: DayState }[]; aria: string; title: (d: { date: string; state: DayState }) => string }) {
  return (
    <div className="pat" role="img" aria-label={aria}>
      {days.map((d) => (
        <i key={d.date} className={`pat-d pat-${d.state}`} title={title(d)} />
      ))}
    </div>
  );
}
