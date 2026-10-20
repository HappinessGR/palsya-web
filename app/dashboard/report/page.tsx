import { Fragment } from "react";
import { getFormatter, getTranslations } from "next-intl/server";
import { pageMetadata } from "../../../i18n/metadata";
import { today } from "../../../src/lib/assessment";
import { BrandMark } from "../../components/BrandMark";
import { Icon } from "../../components/Icon";
import { getProgressData, observations, recentPattern, utcDate } from "../progress/_lib/data";
import { StageBadge, getReasonText } from "../progress/_lib/ui";
import { PrintButton } from "./PrintButton";

export function generateMetadata() {
  return pageMetadata("appProgress.report.meta");
}

/**
 * Ported from legacy V['app/report'] + SC.report() (assets/js/scanner.js).
 * Built only from the patient's own session log and stage history: no
 * prediction, no severity grade. The measurement section says plainly that
 * no scan has been stored rather than showing a number.
 */
export default async function ReportPage() {
  const t = await getTranslations("appProgress");
  const tProgramme = await getTranslations("programme");
  const format = await getFormatter();
  const reasonText = await getReasonText();
  const data = await getProgressData();

  const stage = data.stageNum;
  const mdy = (d: Date) => format.dateTime(d, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  const todayIso = today();
  const fromIso = data.sessions[0]?.date ?? todayIso;

  const pattern = recentPattern(data.sessions, 28);
  const full = pattern.filter((d) => d.state === "full").length;
  const part = pattern.filter((d) => d.state === "part").length;
  const done = data.sessions.filter((s) => s.state === "full").length;
  const notes = observations(data.sessions).slice(0, 5);

  const lastChange = data.phases.length > 1 ? data.phases.at(-1) : undefined;
  const lastReason = lastChange?.reasons[0] != null ? reasonText(lastChange.reasons[0]) : null;

  const sections: { h: string; p: string[] }[] = [
    { h: t("report.sections.what.h"), p: [t("report.sections.what.p", { from: mdy(utcDate(fromIso)), to: mdy(utcDate(todayIso)) })] },
    { h: t("report.sections.measurement.h"), p: [t("report.sections.measurement.none")] },
    {
      h: t("report.sections.programme.h"),
      p: [
        t("report.sections.programme.stage", {
          n: stage,
          name: tProgramme(`stages.${stage}.name`),
          short: tProgramme(`stages.${stage}.short`),
        }),
        lastChange
          ? [t("report.sections.programme.changed", { date: mdy(lastChange.assignedAt) }), lastReason].filter(Boolean).join(" ")
          : t("report.sections.programme.unchanged"),
      ],
    },
    {
      h: t("report.sections.logged.h"),
      p: [t("report.sections.logged.p1", { full, part, done }), t("report.sections.logged.p2")],
    },
  ];
  if (notes.length) {
    sections.push({
      h: t("report.sections.noticed.h"),
      p: [t("report.sections.noticed.intro"), ...notes.map((n) => `“${n.text}” — ${mdy(utcDate(n.date))}`)],
    });
  }
  sections.push({ h: t("report.sections.not.h"), p: [t("report.sections.not.p")] });

  return (
    <div className="page">
      <div className="row-between" style={{ flexWrap: "wrap", gap: 14, marginBottom: "var(--s-6)" }}>
        <div>
          <h2 className="display" style={{ fontSize: "var(--t-3xl)" }}>
            {t("report.title")}
          </h2>
          <p className="muted" style={{ marginTop: 6 }}>
            {t("report.fromToGenerated", { from: mdy(utcDate(fromIso)), to: mdy(utcDate(todayIso)) })}
          </p>
        </div>
        <div className="row-wrap">
          <PrintButton label={t("report.printOrPdf")} />
        </div>
      </div>

      <div className="card card-pad-lg report">
        <div className="row-between" style={{ flexWrap: "wrap", gap: 12, paddingBottom: 18, borderBottom: "1px solid var(--line)" }}>
          <div className="row" style={{ gap: 10 }}>
            <BrandMark size={30} />
            <div>
              <div className="strong">{t("report.brandedTitle")}</div>
              <div className="small muted">
                {data.name ? `${data.name} · ` : ""}
                {t("common.stageLabel", { n: stage })}
              </div>
            </div>
          </div>
          <StageBadge n={stage} label={`${t("common.stageLabel", { n: stage })} · ${tProgramme(`stages.${stage}.name`)}`} />
        </div>

        {sections.map((s) => (
          <Fragment key={s.h}>
            <h2>{s.h}</h2>
            {s.p.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </Fragment>
        ))}

        <div className="note note-clinical" style={{ marginTop: "var(--s-7)" }}>
          <Icon name="stethoscope" size={20} className="note-icon" />
          <div>
            <b>{t("report.forClinician")}</b> {t("report.clinicalNote")}
          </div>
        </div>
      </div>
    </div>
  );
}
