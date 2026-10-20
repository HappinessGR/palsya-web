import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { pageMetadata } from "../../../i18n/metadata";
import { getOnboardingProgress, nextOnboardingPath } from "../data";
import { assignPhase, isBlocked, flagKey, reasonKey, reasonValues, reviewWhyKey, type Answers, type SafetyFlag } from "../../../src/lib/assessment";
import { stage as stageFor } from "../../lib/programme";
import { OnboardingShell } from "../components/OnboardingShell";
import { Icon } from "../../components/Icon";
import { ProceedFromStageForm } from "../components/ProceedFromStageForm";

function flagNoteClass(level: SafetyFlag["level"]) {
  if (level === "urgent") return "note-safety";
  if (level === "wait") return "note-warn";
  if (level === "review") return "note-clinical";
  return "note-warm";
}
function flagIcon(level: SafetyFlag["level"]) {
  if (level === "urgent") return "alert";
  if (level === "wait") return "camera"; // clock has no icon defined yet -- closest visual weight available
  if (level === "review") return "stethoscope";
  return "info";
}

function FlagCard({ flag, title, body }: { flag: SafetyFlag; title: string; body: string }) {
  return (
    <div className={`note ${flagNoteClass(flag.level)}`} style={{ marginBottom: 14 }}>
      <Icon name={flagIcon(flag.level)} size={20} className="note-icon" />
      <div>
        <strong>{title}</strong>
        <div className="small" style={{ marginTop: 6, whiteSpace: "pre-wrap" }}>
          {body}
        </div>
      </div>
    </div>
  );
}

export async function generateMetadata() {
  return pageMetadata("onboarding.phase.meta");
}

export default async function StagePage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const progress = await getOnboardingProgress();
  if (!progress.assessment) redirect("/onboarding/assessment");
  if (progress.phase) redirect(nextOnboardingPath(progress));

  const t = await getTranslations("onboarding.phase");
  const tA = await getTranslations("assessment");
  const tP = await getTranslations("programme");
  const format = await getFormatter();
  const answers = progress.assessment.answers as Answers;
  const result = assignPhase(answers);
  const blocked = isBlocked(result.flags);

  if (blocked) {
    const blockingFlags = result.flags.filter((f) => f.level === "urgent" || f.level === "wait");
    return (
      <OnboardingShell step={2}>
        <div className="wrap-read" style={{ padding: 0 }}>
          <div className="icon-tile" style={{ background: "var(--alert-tint)", color: "var(--alert-ink)", marginBottom: 18 }}>
            <Icon name="alert" size={22} />
          </div>
          <h1 className="display" style={{ fontSize: "var(--t-3xl)" }}>
            {t("blockedTitle")}
          </h1>
          <p className="lead" style={{ marginTop: 14 }}>
            {t("blockedLead")}
          </p>

          <div style={{ marginTop: 26 }}>
            {blockingFlags.map((f) => (
              <FlagCard key={f.id} flag={f} title={tA(`${flagKey(f)}.title`)} body={tA(`${flagKey(f)}.body`, f.values)} />
            ))}
          </div>

          <div className="card card-pad-lg card-tint" style={{ marginTop: 22 }}>
            <h3 className="h-card">{t("blockedSavedTitle")}</h3>
            <p className="mt-4">{t("blockedSavedBody")}</p>
            <div className="row-wrap" style={{ marginTop: 18 }}>
              <ProceedFromStageForm assessmentResponseId={progress.assessment.id} override label={t("continueAnyway")} />
            </div>
          </div>
        </div>
      </OnboardingShell>
    );
  }

  const s = stageFor(result.stage);
  const st = (field: string) => tP("stages." + s.n + "." + field);
  const advisory = result.flags.filter((f) => f.level === "review" || f.level === "action");

  return (
    <OnboardingShell step={2} wide>
      <div className="wrap-mid" style={{ padding: 0 }}>
        <p className="eyebrow">{t("eyebrow")}</p>
        <h1 className="display" style={{ fontSize: "var(--t-4xl)", marginTop: 12 }}>
          {t("stageHeadingNamed", { stage: result.stage, name: st("name") })}
        </h1>
        <p className="lead" style={{ marginTop: 16, maxWidth: "60ch" }}>
          {st("short")}
        </p>

        <div className="phase-band" style={{ marginTop: 32 }}>
          {[1, 2, 3, 4, 5].map((n) => {
            const x = stageFor(n);
            return (
              <div key={n} className={`pb-seg ${n < result.stage ? "past" : n === result.stage ? "now" : ""}`} style={{ ["--pc" as string]: `var(--${x.colour})` }}>
                <div className="pb-n">{t("stageBandLabel", { n })}</div>
                <div className="pb-l">{tP(`stages.${x.n}.name`)}</div>
              </div>
            );
          })}
        </div>

        <div className="grid g2" style={{ marginTop: 32, alignItems: "start" }}>
          <div className="card card-pad-lg">
            <h2 className="h-card">{t("whyStageHeading", { stage: result.stage })}</h2>
            <ul style={{ marginTop: 14, paddingLeft: "1.1em" }}>
              {result.reasons.map((r, i) => (
                <li key={i} style={{ marginBottom: 10 }}>
                  {tA(reasonKey(r), reasonValues(r))}
                </li>
              ))}
            </ul>
            <div className="divider" />
            <dl className="kv">
              <dt>{t("daysSinceOnset")}</dt>
              <dd className="num">{format.number(result.days)}</dd>
              <dt>{t("confidenceLabel")}</dt>
              <dd>
                {result.confidence === "high"
                  ? t("confidenceHigh")
                  : result.confidence === "medium"
                    ? t("confidenceMedium")
                    : t("confidenceLow")}
              </dd>
              <dt>{t("typicalWindow")}</dt>
              <dd>{st("window")}</dd>
            </dl>
          </div>

          <div className="card card-pad-lg card-tint">
            <h2 className="h-card">{t("dailyMeaning")}</h2>
            <p className="mt-4">{st("body")}</p>
            <h4 style={{ marginTop: 20, fontSize: "var(--t-sm)", textTransform: "uppercase", letterSpacing: ".07em", color: "var(--ink-3)" }}>
              {t("yourFocus")}
            </h4>
            <ul style={{ marginTop: 8, paddingLeft: "1.1em" }}>
              {s.focus.map((x) => (
                <li key={x}>{st("focus." + x)}</li>
              ))}
            </ul>
            <h4 style={{ marginTop: 16, fontSize: "var(--t-sm)", textTransform: "uppercase", letterSpacing: ".07em", color: "var(--ink-3)" }}>
              {t("whatToAvoid")}
            </h4>
            <ul style={{ marginTop: 8, paddingLeft: "1.1em" }}>
              {s.avoid.map((x) => (
                <li key={x}>{st("avoid." + x)}</li>
              ))}
            </ul>
            <div className="note note-warm" style={{ marginTop: 18 }}>
              <Icon name="tape" size={18} className="note-icon" />
              <div>
                <strong>{t("tapingLabel")}</strong> {st("tapeMode")}
              </div>
            </div>
          </div>
        </div>

        {result.needsReview && (
          <div className="note note-clinical" style={{ marginTop: 24 }}>
            <Icon name="stethoscope" size={20} className="note-icon" />
            <div>
              {t.rich("reviewNotice", {
                b: (c) => <b>{c}</b>,
                why: result.reviewWhy.map((id) => tA(reviewWhyKey(id))).join(t("reasonJoiner")),
              })}
            </div>
          </div>
        )}

        {advisory.length > 0 && (
          <div style={{ marginTop: 22 }}>
            {advisory.map((f) => (
              <FlagCard key={f.id} flag={f} title={tA(`${flagKey(f)}.title`)} body={tA(`${flagKey(f)}.body`, f.values)} />
            ))}
          </div>
        )}

        <div className="note" style={{ marginTop: 22 }}>
          <Icon name="info" size={20} className="note-icon" />
          <div>{t("stageNotFixedNote")}</div>
        </div>

        <div className="row-between" style={{ marginTop: 32, flexWrap: "wrap", gap: 12 }}>
          <Link className="btn btn-ghost" href="/onboarding/assessment">
            <Icon name="arrow-left" size={17} />
            {t("changeAnswer")}
          </Link>
          <ProceedFromStageForm assessmentResponseId={progress.assessment.id} label={t("setupSessions")} showArrow />
        </div>
      </div>
    </OnboardingShell>
  );
}
