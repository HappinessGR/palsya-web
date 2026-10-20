import { getFormatter, getTranslations } from "next-intl/server";
import { pageMetadata } from "../../../i18n/metadata";
import { Icon } from "../../components/Icon";
import { getProgressData, utcDate } from "../progress/_lib/data";
import { PageHead, getReasonText } from "../progress/_lib/ui";

export function generateMetadata() {
  return pageMetadata("appProgress.milestones.meta");
}

type Milestone = { key: string; date: Date; icon: string; title: string; body: string };

/**
 * Ported from legacy V['app/milestones'] and the rules in P.milestones.check()
 * (assets/js/store.js). Computed from the patient's own rows on every visit,
 * so nothing is stored and nothing can disappear. Rules that need scans
 * (baseline scan, measurable change) wait until scans are stored.
 */
export default async function MilestonesPage() {
  const t = await getTranslations("appProgress");
  const tProgramme = await getTranslations("programme");
  const format = await getFormatter();
  const reasonText = await getReasonText();
  const data = await getProgressData();

  const milestones: Milestone[] = [];

  // Complete sessions: the 1st, 7th and 30th, dated the day each happened.
  const complete = data.sessions.filter((s) => s.state === "full");
  for (const [n, key] of [
    [1, "firstSession"],
    [7, "sevenSessions"],
    [30, "thirtySessions"],
  ] as const) {
    const s = complete[n - 1];
    if (s) {
      milestones.push({
        key,
        date: utcDate(s.date),
        icon: "check-circle",
        title: t(`milestones.rules.${key}.title`),
        body: t(`milestones.rules.${key}.body`),
      });
    }
  }

  // Stage changes after the first assignment.
  data.phases.forEach((p, i) => {
    const prev = data.phases[i - 1];
    if (!prev || prev.stage === p.stage) return;
    const reason = p.reasons[0] != null ? reasonText(p.reasons[0]) : null;
    milestones.push({
      key: `stage-${i}`,
      date: p.assignedAt,
      icon: "layers",
      title: t("milestones.rules.stage.title", { n: p.stage, name: tProgramme(`stages.${p.stage}.name`) }),
      body: reason ?? t("milestones.rules.stage.body", { n: p.stage }),
    });
  });

  milestones.sort((a, b) => b.date.getTime() - a.date.getTime());

  return (
    <div className="page">
      <PageHead title={t("milestones.title")} sub={t("milestones.pageSub")} />
      <div className="note note-clinical">
        <Icon name="info" size={19} className="note-icon" />
        <div>{t("milestones.explainer")}</div>
      </div>

      {milestones.length ? (
        <div style={{ marginTop: "var(--s-6)" }}>
          {milestones.map((m) => (
            <div className="ms ms-big" key={m.key}>
              <div className="icon-tile icon-tile-sm">
                <Icon name={m.icon} size={17} />
              </div>
              <div>
                <div className="row-between" style={{ gap: 10, flexWrap: "wrap" }}>
                  <div className="ms-t">{m.title}</div>
                  <div className="ms-w">
                    {format.dateTime(m.date, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })}
                  </div>
                </div>
                <div className="ms-d">{m.body}</div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card card-pad-lg" style={{ marginTop: "var(--s-6)" }}>
          <div className="empty">
            <Icon name="flag" size={30} />
            <p className="strong">{t("milestones.nothingYet")}</p>
            <p className="small muted">{t("milestones.firstArrives")}</p>
          </div>
        </div>
      )}
    </div>
  );
}
