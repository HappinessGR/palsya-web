import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { pageMetadata } from "../../../i18n/metadata";
import "../../../styles/appProgress.css";
import { today } from "../../../src/lib/assessment";
import { Icon } from "../../components/Icon";
import { getProgressData, observations, utcDate, type SessionRow } from "../progress/_lib/data";
import { PageHead } from "../progress/_lib/ui";

export function generateMetadata() {
  return pageMetadata("appProgress.log.meta");
}

const PARTS = ["taping", "exercises", "routine"] as const;
const DONE_KEY = { taping: "tapingDone", exercises: "exercisesDone", routine: "routineDone" } as const;

function monthParam(v: string | string[] | undefined): { y: number; m: number } {
  const match = typeof v === "string" ? /^(\d{4})-(\d{2})$/.exec(v) : null;
  if (match) {
    const m = Number(match[2]) - 1;
    if (m >= 0 && m < 12) return { y: Number(match[1]), m };
  }
  const now = new Date();
  return { y: now.getUTCFullYear(), m: now.getUTCMonth() };
}

const ym = (y: number, m: number) => {
  const d = new Date(Date.UTC(y, m, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
};

/**
 * Ported from legacy V['app/log']: a month calendar and the recent-session
 * list from daily_sessions, plus the observations written on those days.
 * Month navigation and the day detail use the URL (?m=YYYY-MM&d=YYYY-MM-DD)
 * instead of the legacy modal, so the page stays a server component.
 */
export default async function LogPage({ searchParams }: PageProps<"/dashboard/log">) {
  const sp = await searchParams;
  const t = await getTranslations("appProgress");
  const format = await getFormatter();
  const data = await getProgressData();

  const { y, m } = monthParam(sp.m);
  const selected = typeof sp.d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.d) ? sp.d : null;
  const byDate = new Map(data.sessions.map((s) => [s.date, s]));
  const stageColour = `var(--p${data.stageNum})`;
  const todayIso = today();
  const recent = data.sessions.slice(-20).reverse();
  const notes = observations(data.sessions);

  const md = (iso: string) => format.dateTime(utcDate(iso), { day: "numeric", month: "short", timeZone: "UTC" });
  const partLabel = (k: (typeof PARTS)[number]) => t(`common.parts.${k}`);

  // Monday-first month grid (legacy CH.calendar).
  const lead = (new Date(Date.UTC(y, m, 1)).getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const dows = Array.from({ length: 7 }, (_, i) =>
    format.dateTime(new Date(Date.UTC(2024, 0, 1 + i)), { weekday: "short", timeZone: "UTC" }),
  );

  const statusText = (s: SessionRow) =>
    s.state === "full"
      ? t("common.state.full")
      : s.state === "part"
        ? t("common.state.part")
        : s.date === todayIso
          ? t("log.notStartedYet")
          : t("common.state.none");

  const sel = selected ? byDate.get(selected) : undefined;

  return (
    <div className="page">
      <PageHead title={t("log.title")} sub={t("log.pageSub")} />

      <div className="grid g2" style={{ alignItems: "start", gap: "var(--s-6)" }}>
        <div className="card card-pad-lg">
          <div className="cal-hd">
            <Link className="btn-icon btn-quiet" href={`?m=${ym(y, m - 1)}`} aria-label={t("log.prevMonth")} scroll={false}>
              <Icon name="chevron-left" size={18} />
            </Link>
            <div className="strong">
              {format.dateTime(new Date(Date.UTC(y, m, 1)), { month: "long", year: "numeric", timeZone: "UTC" })}
            </div>
            <Link className="btn-icon btn-quiet" href={`?m=${ym(y, m + 1)}`} aria-label={t("log.nextMonth")} scroll={false}>
              <Icon name="chevron-right" size={18} />
            </Link>
          </div>

          <div className="cal-grid">
            {dows.map((d) => (
              <div className="cal-dow" key={d}>
                {d}
              </div>
            ))}
            {Array.from({ length: lead }, (_, i) => (
              <div className="cal-cell blank pad" key={`pad-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const iso = `${ym(y, m)}-${String(i + 1).padStart(2, "0")}`;
              const s = byDate.get(iso);
              const cls = ["cal-cell", iso === todayIso && "today", iso === selected && "on"].filter(Boolean).join(" ");
              return (
                <Link
                  key={iso}
                  className={cls}
                  href={`?m=${ym(y, m)}&d=${iso}`}
                  scroll={false}
                  aria-label={`${md(iso)} — ${s ? statusText(s) : t("common.state.none")}`}
                  aria-current={iso === selected ? "date" : undefined}
                >
                  <span className="cd">{i + 1}</span>
                  {s?.state === "full" && <i className="cal-mark full" style={{ ["--pc" as string]: stageColour }} />}
                  {s?.state === "part" && <i className="cal-mark half" style={{ ["--pc" as string]: stageColour }} />}
                </Link>
              );
            })}
          </div>

          <div className="cal-legend">
            <span>
              <i className="cal-mark full" style={{ ["--pc" as string]: stageColour }} />
              {t("common.state.full")}
            </span>
            <span>
              <i className="cal-mark half" style={{ ["--pc" as string]: stageColour }} />
              {t("common.state.part")}
            </span>
          </div>

          {selected && (
            <div className="card card-pad-sm card-flat card-tint" style={{ marginTop: "var(--s-5)" }}>
              <div className="small strong">
                {format.dateTime(utcDate(selected), { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}
              </div>
              {sel ? (
                <dl className="kv" style={{ marginTop: 10 }}>
                  <dt>{t("log.session")}</dt>
                  <dd>{statusText(sel)}</dd>
                  {PARTS.map((k) => (
                    <FragmentRow key={k} label={partLabel(k)} value={sel[DONE_KEY[k]] ? t("common.yes") : t("common.no")} />
                  ))}
                  {sel.comfort && <FragmentRow label={t("log.feltLabel")} value={t(`log.comfort.${sel.comfort}`)} />}
                  {sel.minutes != null && <FragmentRow label={t("log.minutesLabel")} value={String(sel.minutes)} />}
                  {sel.note && <FragmentRow label={t("log.noteLabel")} value={sel.note} />}
                </dl>
              ) : (
                <p className="small muted" style={{ marginTop: 6 }}>
                  {t("log.noSessionLogged")}
                </p>
              )}
            </div>
          )}

          <p className="small faint" style={{ marginTop: 14 }}>
            {t("log.emptyDaysHint")}
          </p>
        </div>

        <div className="card card-pad-lg">
          <h3 className="h-card">{t("log.recentSessions")}</h3>
          {recent.length ? (
            <div style={{ marginTop: 10 }}>
              {recent.map((s) => (
                <div className="log-entry" key={s.date}>
                  <div className="log-date">
                    <b>{md(s.date)}</b>
                    <span>{format.dateTime(utcDate(s.date), { weekday: "short", timeZone: "UTC" })}</span>
                  </div>
                  <div>
                    <div className="row-wrap" style={{ gap: 6 }}>
                      {PARTS.map((k) => (
                        <span key={k} className={`badge ${s[DONE_KEY[k]] ? "badge-ok" : "badge-outline"}`}>
                          {s[DONE_KEY[k]] && <Icon name="check" size={12} />}
                          {partLabel(k)}
                        </span>
                      ))}
                      {s.comfort && (
                        <span className="badge badge-outline">{t("log.felt", { comfort: t(`log.comfort.${s.comfort}`) })}</span>
                      )}
                    </div>
                    <div className="small muted" style={{ marginTop: 6 }}>
                      {[
                        statusText(s),
                        s.minutes ? t("log.minutes", { n: s.minutes }) : null,
                        s.exerciseCount ? t("log.exercises", { n: s.exerciseCount }) : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty">
              <Icon name="calendar" size={26} />
              <p className="small muted">{t("log.noSessionsYet")}</p>
            </div>
          )}
        </div>
      </div>

      <div className="card card-pad-lg" style={{ marginTop: "var(--s-6)" }}>
        <div className="card-hd">
          <h3>{t("log.thingsYouNoticed")}</h3>
          <Link className="btn btn-sm btn-ghost" href="/dashboard/session">
            <Icon name="plus" size={15} />
            {t("log.addOne")}
          </Link>
        </div>
        {notes.length ? (
          <div className="stack-sm">
            {notes.map((n) => (
              <div className="card card-pad-sm card-flat card-tint" key={n.date}>
                <div className="small faint">
                  {format.dateTime(utcDate(n.date), { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })}
                </div>
                <div style={{ marginTop: 4 }}>{n.text}</div>
              </div>
            ))}
          </div>
        ) : (
          <p className="muted">{t("log.nothingYet")}</p>
        )}
      </div>
    </div>
  );
}

function FragmentRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </>
  );
}
