import type { ReactNode } from "react";
import { Icon } from "../Icon";

/**
 * Building blocks of the back-office pages, ported from the legacy
 * prototype: kpi() (views-admin.js), CH.bars / CH.stack (charts.js) and the
 * "Needs attention" rows.
 */

export function Kpi({ n, label, delta, trend = "flat" }: { n: ReactNode; label: string; delta?: string; trend?: "up" | "down" | "flat" }) {
  return (
    <div className="card card-pad-lg stat">
      <div className="stat-n">{n}</div>
      <div className="stat-l">{label}</div>
      {delta && <div className={`stat-d ${trend}`}>{delta}</div>}
    </div>
  );
}

/** Marks a card or figure whose numbers are the prototype's demonstration data, not ours. */
export function DemoBadge({ label }: { label: string }) {
  return <span className="badge badge-warn">{label}</span>;
}

/** Card heading with an optional demo badge next to it. */
export function CardTitle({ children, demo }: { children: ReactNode; demo?: string }) {
  return (
    <div className="bo-demo">
      <h3 className="h-card">{children}</h3>
      {demo && <DemoBadge label={demo} />}
    </div>
  );
}

export type BarDatum = { l: string; v: number; colour?: string };

/** Simple SVG bar chart (legacy CH.bars). */
export function Bars({ data, max: maxOpt, w = 560, h = 180 }: { data: BarDatum[]; max?: number; w?: number; h?: number }) {
  const m = { t: 12, r: 8, b: 26, l: 30 };
  const iw = w - m.l - m.r;
  const ih = h - m.t - m.b;
  const max = maxOpt || Math.max(...data.map((d) => d.v)) * 1.1 || 1;
  const bw = iw / Math.max(1, data.length);
  const r1 = (n: number) => Math.round(n * 10) / 10;

  return (
    <svg className="chart" viewBox={`0 0 ${w} ${h}`} role="img">
      {[0, 0.5, 1].map((f) => {
        const yy = m.t + ih - f * ih;
        return (
          <g key={f}>
            <line x1={m.l} y1={yy} x2={w - m.r} y2={yy} stroke="var(--line)" strokeDasharray="2 4" />
            <text x={m.l - 6} y={yy + 4} textAnchor="end" fontSize="9" fill="var(--ink-4)">
              {Math.round(max * f)}
            </text>
          </g>
        );
      })}
      {data.map((d, i) => {
        const bh = Math.max(2, (d.v / max) * ih);
        const xx = m.l + i * bw + bw * 0.18;
        return (
          <g key={`${d.l}-${i}`}>
            <rect x={r1(xx)} y={r1(m.t + ih - bh)} width={r1(bw * 0.64)} height={r1(bh)} rx="3" fill={d.colour ?? "var(--brand)"} opacity={0.9}>
              <title>{`${d.l}: ${d.v}`}</title>
            </rect>
            <text x={r1(xx + bw * 0.32)} y={h - 9} textAnchor="middle" fontSize="9" fill="var(--ink-4)">
              {d.l}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** Stacked distribution bar with legend (legacy CH.stack). */
export function StackBar({ parts, format = String }: { parts: BarDatum[]; format?: (n: number) => string }) {
  const total = parts.reduce((t, p) => t + p.v, 0) || 1;
  return (
    <>
      <div className="stackbar">
        {parts.map((p) => (
          <i key={p.l} style={{ width: `${Math.round((p.v / total) * 10000) / 100}%`, background: p.colour }} title={`${p.l}: ${p.v}`} />
        ))}
      </div>
      <div className="stackleg">
        {parts.map((p) => (
          <span key={p.l}>
            <i style={{ background: p.colour }} />
            {p.l} <b className="num">{format(p.v)}</b>
          </span>
        ))}
      </div>
    </>
  );
}

/** One "Needs attention" row: tinted icon tile, title and a short explanation. */
export function AttentionRow({ kind, icon, title, sub }: { kind: "alert" | "warn" | "info"; icon: string; title: string; sub: string }) {
  const tile = kind === "alert" ? "" : kind === "warn" ? " icon-tile-warm" : " icon-tile-info";
  return (
    <div className="card card-pad-sm card-flat row" style={{ gap: 12, alignItems: "flex-start" }}>
      <div className={`icon-tile icon-tile-sm${tile}`}>
        <Icon name={icon} size={16} />
      </div>
      <div>
        <div className="strong small">{title}</div>
        <div className="small muted" style={{ marginTop: 2 }}>
          {sub}
        </div>
      </div>
    </div>
  );
}

/** Stage badge in the stage's colour: "3 · Coordination". */
export function StageBadge({ stage, name }: { stage: number | null; name: string }) {
  if (stage === null) return <span className="badge badge-outline">{name}</span>;
  return (
    <span className={`badge badge-p${stage}`}>
      {stage} · {name}
    </span>
  );
}

export const STAGE_COLOURS = ["var(--p1)", "var(--p2)", "var(--p3)", "var(--p4)", "var(--p5)"];
