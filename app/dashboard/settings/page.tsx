import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import { SignOutButton } from "@clerk/nextjs";
import { getFormatter, getTranslations } from "next-intl/server";
import { pageMetadata } from "../../../i18n/metadata";
import { db } from "../../../src/db";
import { daysBetween, today } from "../../../src/lib/assessment";
import { getBillingStatus } from "../../../lib/billing/trial-subscription.service";
import { Icon } from "../../components/Icon";
import { getShellData } from "../shell-data";
import { RemindersForm } from "./RemindersForm";
import "../../../styles/appSupport.css";

export function generateMetadata() {
  return pageMetadata("appSupport.settings.meta");
}

const TABS = ["account", "programme", "reminders", "subscription", "privacy", "security"] as const;
type Tab = (typeof TABS)[number];

const CONSENTS = [
  { type: "data_processing", required: true },
  { type: "photo_storage_analysis", required: true },
  { type: "photo_keep", required: false },
  { type: "clinician_share", required: false },
  { type: "research_opt_in", required: false },
  { type: "marketing", required: false },
] as const;

/**
 * Ported from the legacy prototype's V['app/settings'] — same six tabs, each
 * reading real data. Only Reminders and language saves (patient_preferences);
 * the actions with no backend yet (assessment retake, clinician review,
 * cancelling, consent changes, export, deletion) are shown disabled with a
 * one-line explanation rather than pretending to work.
 */
export default async function SettingsPage({ searchParams }: PageProps<"/dashboard/settings">) {
  const sp = await searchParams;
  const tab: Tab = TABS.find((x) => x === sp.tab) ?? "account";

  const t = await getTranslations("appSupport.settings");
  const tShell = await getTranslations("dashboard.shell");
  const tProgramme = await getTranslations("programme");
  const format = await getFormatter();
  const date = (d: Date | string) =>
    format.dateTime(typeof d === "string" ? new Date(`${d}T00:00:00Z`) : d, {
      dateStyle: "medium",
      ...(typeof d === "string" ? { timeZone: "UTC" } : {}),
    });

  const clerkUser = await currentUser();
  const row = clerkUser
    ? await db.query.users.findFirst({ where: { clerkUserId: clerkUser.id }, with: { patientProfile: true } })
    : null;
  const profile = row?.patientProfile ?? null;

  let body: React.ReactNode;

  if (tab === "account") {
    const { programDay } = await getShellData();
    const name = [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(" ") || row?.fullName || "";
    const email = clerkUser?.primaryEmailAddress?.emailAddress ?? row?.email ?? "";
    body = (
      <div className="card card-pad-lg">
        <h3 className="h-card">{t("account.yourDetails")}</h3>
        <div className="grid g2" style={{ marginTop: 18 }}>
          <div className="field">
            <label className="label" htmlFor="s-name">
              {t("account.fullName")}
            </label>
            <input className="input" id="s-name" value={name} readOnly disabled />
          </div>
          <div className="field">
            <label className="label" htmlFor="s-email">
              {t("account.email")}
            </label>
            <input className="input" id="s-email" type="email" value={email} readOnly disabled />
          </div>
        </div>
        <div className="hint">{t("account.managedHint")}</div>
        <dl className="kv" style={{ marginTop: 16 }}>
          <dt>{t("account.accountCreated")}</dt>
          <dd>{clerkUser ? date(new Date(clerkUser.createdAt)) : "—"}</dd>
          <dt>{t("account.programmeDay")}</dt>
          <dd className="num">{programDay}</dd>
        </dl>
      </div>
    );
  } else if (tab === "programme") {
    const stage = profile?.phase ?? 1;
    const latest = profile
      ? await db.query.phaseAssignments.findFirst({ where: { patientProfileId: profile.id }, orderBy: { assignedAt: "desc" } })
      : null;
    const onset = profile?.onsetDate ?? null;
    body = (
      <div className="card card-pad-lg">
        <h3 className="h-card">{t("programme.yourStage")}</h3>
        <div className="row-between" style={{ marginTop: 16, flexWrap: "wrap", gap: 14 }}>
          <div>
            <span className={`badge badge-p${stage}`}>
              <Icon name="activity" size={13} />
              {t("programme.stageLabel", { n: stage })} · {tProgramme(`stages.${stage}.name`)}
            </span>
            <p style={{ marginTop: 10, maxWidth: "52ch" }}>{tProgramme(`stages.${stage}.short`)}</p>
          </div>
          <button type="button" className="btn btn-sm btn-ghost" disabled title={t("notAvailable")}>
            <Icon name="stethoscope" size={15} />
            {t("programme.askClinicianReview")}
          </button>
        </div>
        {latest?.needsReview && (
          <div className="note note-clinical" style={{ marginTop: 16 }}>
            <Icon name="clock" size={18} className="note-icon" />
            <div>
              <b>{t("programme.reviewPendingTitle")}</b> {t("programme.reviewPendingBody")}
            </div>
          </div>
        )}
        <div className="divider" />
        <dl className="kv">
          <dt>{t("programme.onsetDate")}</dt>
          <dd>{onset ? date(onset) : "—"}</dd>
          <dt>{t("programme.daysSinceOnset")}</dt>
          <dd className="num">{onset ? daysBetween(onset, today()) : "—"}</dd>
          <dt>{t("programme.placementConfidence")}</dt>
          <dd>{latest ? t(`programme.confidence.${latest.confidence}`) : "—"}</dd>
        </dl>
        <div className="divider" />
        <h4 className="h-card" style={{ fontSize: "var(--t-md)" }}>
          {t("programme.retakeAssessment")}
        </h4>
        <p className="small muted mt-4">{t("programme.retakeAssessmentHint")}</p>
        <button type="button" className="btn btn-sm btn-ghost" style={{ marginTop: 12 }} disabled>
          {t("programme.retakeAssessmentBtn")}
        </button>
        <p className="small faint" style={{ marginTop: 8 }}>
          {t("notAvailable")}
        </p>
      </div>
    );
  } else if (tab === "reminders") {
    const prefs = profile
      ? await db.query.patientPreferences.findFirst({ where: { patientProfileId: profile.id } })
      : null;
    // Same defaults as the onboarding preferences step.
    body = (
      <RemindersForm
        initial={{
          remindersOn: prefs?.remindersOn ?? true,
          reminderTime: prefs?.reminderTime ?? "08:30",
          secondReminderTime: prefs?.secondReminderTime ?? "",
          cameraMirror: prefs?.cameraMirror ?? true,
          textSize: prefs?.textSize ?? "normal",
          weeklySummaryEmail: prefs?.weeklySummaryEmail ?? true,
          clinicianUpdatesEmail: prefs?.clinicianUpdatesEmail ?? true,
        }}
      />
    );
  } else if (tab === "subscription") {
    const billing = clerkUser ? await getBillingStatus(clerkUser.id) : { status: "none" as const, trialEnd: null, currentPeriodEnd: null };
    if (billing.status === "none") {
      body = (
        <div className="card card-pad-lg">
          <div className="empty">
            <Icon name="credit" size={28} />
            <p className="strong">{t("subscription.noSubscription")}</p>
            <Link className="btn" href="/pricing" style={{ marginTop: 14 }}>
              {t("subscription.seePlans")}
            </Link>
          </div>
        </div>
      );
    } else {
      const status = billing.status;
      const badge =
        status === "trialing"
          ? { cls: "badge-brand", label: t("subscription.freeTrial") }
          : status === "active"
            ? { cls: "badge-ok", label: t("subscription.active") }
            : status === "canceled"
              ? { cls: "badge-warn", label: t("subscription.cancelledStatus") }
              : status === "past_due" || status === "unpaid"
                ? { cls: "badge-warn", label: t("subscription.pastDue") }
                : { cls: "badge-outline", label: status };
      body = (
        <div className="card card-pad-lg">
          <div className="row-between" style={{ flexWrap: "wrap", gap: 14 }}>
            <h3 className="h-card">{t("subscription.plan")}</h3>
            <span className={`badge ${badge.cls}`}>{badge.label}</span>
          </div>
          <dl className="kv" style={{ marginTop: 18 }}>
            {status === "trialing" && billing.trialEnd && (
              <>
                <dt>{t("subscription.firstCharge")}</dt>
                <dd>{date(billing.trialEnd)}</dd>
              </>
            )}
            {billing.currentPeriodEnd && (
              <>
                <dt>{status === "canceled" ? t("subscription.accessUntil") : t("subscription.renews")}</dt>
                <dd>{date(billing.currentPeriodEnd)}</dd>
              </>
            )}
          </dl>
          {status !== "canceled" && (
            <>
              <div className="row-wrap" style={{ marginTop: 20 }}>
                <Link className="btn btn-sm" href="/pricing">
                  {t("subscription.changePlan")}
                </Link>
                <button type="button" className="btn btn-sm btn-ghost" disabled>
                  {t("subscription.cancelSubscription")}
                </button>
              </div>
              <p className="small faint" style={{ marginTop: 10 }}>
                {t("subscription.cancelHint")}
              </p>
            </>
          )}
        </div>
      );
    }
  } else if (tab === "privacy") {
    const records = row
      ? await db.query.consentRecords.findMany({ where: { userId: row.id }, orderBy: { createdAt: "desc" } })
      : [];
    // Records are append-only; the newest row per type is the current answer.
    const latest = new Map<string, (typeof records)[number]>();
    for (const r of records) if (!latest.has(r.consentType)) latest.set(r.consentType, r);
    body = (
      <div className="card card-pad-lg">
        <h3 className="h-card">{t("privacy.yourConsents")}</h3>
        <p className="small muted mt-4">{t("privacy.consentsHint")}</p>
        <div style={{ marginTop: 18 }}>
          {CONSENTS.map((c) => {
            const r = latest.get(c.type);
            const granted = !!r?.granted;
            return (
              <div className="check-row" style={{ marginBottom: 12 }} key={c.type}>
                <input type="checkbox" checked={granted} disabled readOnly id={`pc-${c.type}`} />
                <label htmlFor={`pc-${c.type}`}>
                  <span className="strong">{t(`privacy.consent.${c.type}`)}</span>
                  {c.required && (
                    <>
                      {" "}
                      <span className="badge badge-brand">{t("privacy.required")}</span>
                    </>
                  )}
                  <div className="small muted" style={{ marginTop: 4 }}>
                    {granted && r ? t("privacy.granted", { date: date(r.createdAt) }) : t("privacy.notGiven")}
                  </div>
                </label>
              </div>
            );
          })}
        </div>
        <div className="divider" />
        <h4 className="h-card" style={{ fontSize: "var(--t-md)" }}>
          {t("privacy.yourData")}
        </h4>
        <div className="row-wrap" style={{ marginTop: 16 }}>
          <button type="button" className="btn btn-sm btn-ghost" disabled>
            <Icon name="download" size={15} />
            {t("privacy.exportEverything")}
          </button>
        </div>
        <div className="divider" />
        <h4 className="h-card" style={{ fontSize: "var(--t-md)" }}>
          {t("privacy.deleteAccount")}
        </h4>
        <p className="small muted mt-4">{t("privacy.deleteAccountHint")}</p>
        <button type="button" className="btn btn-sm btn-danger" style={{ marginTop: 14 }} disabled>
          <Icon name="x" size={15} />
          {t("privacy.deleteAllMyData")}
        </button>
        <p className="small faint" style={{ marginTop: 10 }}>
          {t("privacy.selfServiceHint")}
        </p>
      </div>
    );
  } else {
    body = (
      <div className="card card-pad-lg">
        <h3 className="h-card">{t("security.signInSecurity")}</h3>
        <dl className="kv" style={{ marginTop: 18 }}>
          <dt>{t("security.twoStepVerification")}</dt>
          <dd>
            {clerkUser?.twoFactorEnabled ? (
              <span className="badge badge-ok">
                <Icon name="check" size={12} />
                {t("security.on")}
              </span>
            ) : (
              <span className="badge badge-warn">{t("security.off")}</span>
            )}
          </dd>
          <dt>{t("security.lastSignIn")}</dt>
          <dd>{clerkUser?.lastSignInAt ? date(new Date(clerkUser.lastSignInAt)) : "—"}</dd>
        </dl>
        <div className="row-wrap" style={{ marginTop: 18 }}>
          {clerkUser?.passwordEnabled && (
            <Link className="btn btn-sm btn-ghost" href="/forgot-password">
              {t("security.changePassword")}
            </Link>
          )}
          <SignOutButton redirectUrl="/">
            <button type="button" className="btn btn-sm btn-quiet">
              <Icon name="log-out" size={15} />
              {t("security.signOut")}
            </button>
          </SignOutButton>
        </div>
      </div>
    );
  }

  return (
    <div className="page page-narrow">
      <div className="row-between" style={{ alignItems: "flex-start", flexWrap: "wrap", gap: 16, marginBottom: "var(--s-6)" }}>
        <div>
          <h2 className="display" style={{ fontSize: "var(--t-3xl)" }}>
            {tShell("nav.settings")}
          </h2>
        </div>
      </div>
      <nav className="bo-tabs" aria-label={tShell("nav.settings")}>
        {TABS.map((x) => (
          <Link
            key={x}
            className="bo-tab"
            href={x === "account" ? "/dashboard/settings" : `/dashboard/settings?tab=${x}`}
            aria-current={tab === x ? "page" : undefined}
          >
            {t(`tabs.${x}`)}
          </Link>
        ))}
      </nav>
      {body}
    </div>
  );
}
