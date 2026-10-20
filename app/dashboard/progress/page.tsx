import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { pageMetadata } from "../../../i18n/metadata";
import { Icon } from "../../components/Icon";
import { stages } from "../../lib/programme";
import { daysInStage, daysSince, getProgressData, observations, recentPattern, utcDate } from "./_lib/data";
import { Arc, PageHead, Pattern, StageBadge, getReasonText } from "./_lib/ui";

export function generateMetadata() {
  return pageMetadata("appProgress.progress.meta");
}

const SOURCE_KEY = {
  assessment: "fromAssessment",
  progress_adjustment: "fromProgress",
  clinician_override: "setByClinician",
} as const;

/** Ported from legacy V['app/progress'] — phase band, three-arc summary, session pattern, score timeline. */
export default async function ProgressPage() {
  const t = await getTranslations("appProgress");
  const tProgramme = await getTranslations("programme");
  const format = await getFormatter();
  const reasonText = await getReasonText();
  const data = await getProgressData();

  const stage = data.stageNum;
  const stageName = (n: number) => tProgramme(`stages.${n}.name`);
  const stageLabel = (n: number) => t("common.stageLabel", { n });
  const md = (iso: string) => format.dateTime(utcDate(iso), { day: "numeric", month: "short", timeZone: "UTC" });

  const pattern = recentPattern(data.sessions, 28);
  const fullCount = pattern.filter((d) => d.state === "full").length;
  const partCount = pattern.filter((d) => d.state === "part").length;
  const allTime = data.sessions.filter((s) => s.state === "full").length;
  const notes = observations(data.sessions);
  const onsetDays = daysSince(data.onsetDate);

  // Three separate arcs. With no scans stored yet, the measured arc stays empty.
  const consistency = Math.min(1, fullCount / 24);
  const fn = Math.min(1, notes.length / 6);

  return (
    <div className="page">
      <PageHead
        title={t("progress.pageTitle")}
        sub={t("progress.pageSub")}
        right={
          <>
            <Link className="btn btn-sm" href="/dashboard/report">
              <Icon name="file" size={15} />
              {t("progress.reportLink")}
            </Link>
            <Link className="btn btn-sm btn-ghost" href="/dashboard/scan">
              <Icon name="camera" size={15} />
              {t("progress.newScan")}
            </Link>
          </>
        }
      />

      {/* Layer 1: phase band */}
      <div className="card card-pad-lg">
        <div className="card-hd">
          <h3>{t("progress.yourStage")}</h3>
          <StageBadge n={stage} label={`${stageLabel(stage)} · ${stageName(stage)}`} />
        </div>
        <div className="phase-band">
          {stages.map((x) => (
            <div
              key={x.n}
              className={`pb-seg ${x.n < stage ? "past" : x.n === stage ? "now" : ""}`}
              style={{ ["--pc" as string]: `var(--${x.colour})` }}
            >
              <div className="pb-n">{stageLabel(x.n)}</div>
              <div className="pb-l">{stageName(x.n)}</div>
            </div>
          ))}
        </div>
        <div className="grid g2" style={{ marginTop: 20, alignItems: "start" }}>
          <div>
            <p>{tProgramme(`stages.${stage}.body`)}</p>
            <dl className="kv" style={{ marginTop: 16 }}>
              <dt>{t("progress.daysInStage")}</dt>
              <dd className="num">{daysInStage(data.phases)}</dd>
              <dt>{t("progress.typicalWindow")}</dt>
              <dd>{tProgramme(`stages.${stage}.window`)}</dd>
              <dt>{t("progress.daysSinceOnset")}</dt>
              <dd className="num">{onsetDays ?? "—"}</dd>
            </dl>
          </div>
          <div className="card card-pad-sm card-tint">
            <div className="small strong">{t("progress.howStageChanged")}</div>
            <div className="stack-sm" style={{ marginTop: 10 }}>
              {data.phases.length === 0 ? (
                <p className="small muted">{t("progress.noPhase")}</p>
              ) : (
                data.phases
                  .slice()
                  .reverse()
                  .map((h, i) => {
                    const reason = h.reasons[0] != null ? reasonText(h.reasons[0]) : null;
                    return (
                      <div key={i}>
                        <div
                          className="tl-phase-band-row"
                          style={{ background: `var(--p${h.stage}-tint)`, color: `var(--p${h.stage}-ink)` }}
                        >
                          <b>{stageLabel(h.stage)}</b>
                          <span>{format.dateTime(h.assignedAt, { day: "numeric", month: "short" })}</span>
                          <span className="small" style={{ fontWeight: 400, opacity: 0.85 }}>
                            {t(`progress.${SOURCE_KEY[h.source]}`)}
                          </span>
                        </div>
                        {reason && (
                          <p className="small muted" style={{ margin: "0 0 10px 4px" }}>
                            {reason}
                          </p>
                        )}
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Layer 2: arc + session pattern */}
      <div className="grid g2" style={{ marginTop: "var(--s-6)", alignItems: "start" }}>
        <div className="card card-pad-lg">
          <h3 className="h-card">{t("progress.threeThingsAtOnce")}</h3>
          <p className="small muted mt-4">{t("progress.threeThingsBody")}</p>
          <div className="arc-row" style={{ marginTop: 20 }}>
            <Arc
              segs={[
                { weight: 1, value: 0, colour: "var(--p3)", label: t("progress.measuredSymmetryChange") },
                { weight: 1, value: consistency, colour: "var(--p2)", label: t("progress.sessionsLogged") },
                { weight: 1, value: fn, colour: "var(--warm)", label: t("progress.functionReported") },
              ]}
              centre={
                <>
                  <div className="an">—</div>
                  <div className="al">{t("progress.symmetryScore")}</div>
                </>
              }
              aria={t("progress.arcAria")}
            />
            <div className="arc-legend">
              <ArcLeg colour="var(--p3)" label={t("progress.measuredSymmetry")} sub={t("progress.noBaselineYet")} />
              <ArcLeg colour="var(--p2)" label={t("progress.sessionsLogged")} sub={t("progress.completeIn28", { n: fullCount })} />
              <ArcLeg colour="var(--warm)" label={t("progress.functionReported")} sub={t("progress.observationsRecorded", { n: notes.length })} />
            </div>
          </div>
          <p className="small faint" style={{ marginTop: 16 }}>
            {t("progress.threeArcsHint")}
          </p>
        </div>

        <div className="card card-pad-lg">
          <h3 className="h-card">{t("progress.sessionsLast28")}</h3>
          <div style={{ marginTop: 16 }}>
            <Pattern
              days={pattern}
              aria={t("progress.patternAria", { n: pattern.length })}
              title={(d) => `${md(d.date)} — ${t(`common.state.${d.state}`)}`}
            />
          </div>
          <div className="grid g3" style={{ marginTop: 20 }}>
            <div className="stat">
              <div className="stat-n">{fullCount}</div>
              <div className="stat-l">{t("common.state.full")}</div>
            </div>
            <div className="stat">
              <div className="stat-n">{partCount}</div>
              <div className="stat-l">{t("common.state.part")}</div>
            </div>
            <div className="stat">
              <div className="stat-n">{allTime}</div>
              <div className="stat-l">{t("progress.allTime")}</div>
            </div>
          </div>
          <p className="small faint" style={{ marginTop: 16 }}>
            {t("progress.noStreakHint")}
          </p>
          <Link className="link-arrow small" href="/dashboard/log" style={{ marginTop: 12 }}>
            {t("progress.sessionLogCalendar")}
            <Icon name="arrow-right" size={14} />
          </Link>
        </div>
      </div>

      {/* Layer 3: score timeline — empty until scans are stored. */}
      <div className="card card-pad-lg" style={{ marginTop: "var(--s-6)" }}>
        <div className="card-hd">
          <h3>{t("progress.scoreOverTime")}</h3>
        </div>
        <div className="empty">
          <Icon name="camera" size={26} />
          <p className="strong">{t("progress.noScansTitle")}</p>
          <p className="small muted">{t("progress.noScansBody")}</p>
          <Link className="btn btn-sm" href="/dashboard/scan" style={{ marginTop: 8 }}>
            <Icon name="camera" size={15} />
            {t("progress.newScan")}
          </Link>
        </div>
      </div>
    </div>
  );
}

function ArcLeg({ colour, label, sub }: { colour: string; label: string; sub: string }) {
  return (
    <div className="arc-leg">
      <span className="sw" style={{ background: colour }} />
      <span>
        <b>{label}</b>
        <br />
        <span>{sub}</span>
      </span>
    </div>
  );
}
