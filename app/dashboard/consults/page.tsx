import { currentUser } from "@clerk/nextjs/server";
import { getTranslations } from "next-intl/server";
import { pageMetadata } from "../../../i18n/metadata";
import { db } from "../../../src/db";
import { Icon } from "../../components/Icon";

export function generateMetadata() {
  return pageMetadata("appSupport.consults.meta");
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return ((parts[0][0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

/** The clinician on patient_profiles.assigned_clinician_id, if any. */
async function getAssignedClinician(clerkUserId: string) {
  const row = await db.query.users.findFirst({
    where: { clerkUserId },
    with: { patientProfile: { with: { assignedClinician: { with: { staffProfile: true } } } } },
  });
  const c = row?.patientProfile?.assignedClinician;
  if (!c || c.deletedAt) return null;
  return { name: c.fullName, title: c.staffProfile?.title ?? null, institution: c.staffProfile?.institution ?? null };
}

/**
 * Ported from the legacy prototype's V['app/consults']. There is no
 * consultations or booking table yet, so the counts are zero, the history is
 * empty and the booking buttons are disabled with an explanation — nothing on
 * this page is invented. The assigned clinician is real.
 */
export default async function ConsultsPage() {
  const t = await getTranslations("appSupport.consults");
  const tShell = await getTranslations("dashboard.shell");
  const user = await currentUser();
  const clinician = user ? await getAssignedClinician(user.id) : null;

  return (
    <div className="page">
      <div className="row-between" style={{ alignItems: "flex-start", flexWrap: "wrap", gap: 16, marginBottom: "var(--s-6)" }}>
        <div>
          <h2 className="display" style={{ fontSize: "var(--t-3xl)" }}>
            {tShell("nav.consults")}
          </h2>
          <p className="muted" style={{ marginTop: 6, maxWidth: "64ch" }}>
            {t("pageSub")}
          </p>
        </div>
        <div className="row-wrap">
          <button type="button" className="btn btn-sm" disabled title={t("bookingUnavailable")}>
            <Icon name="calendar" size={15} />
            {t("bookACall")}
          </button>
        </div>
      </div>

      <div className="grid g2" style={{ marginBottom: "var(--s-6)" }}>
        <div className="stat">
          <div className="stat-n">0</div>
          <div className="stat-l">{t("completed")}</div>
        </div>
        <div className="stat">
          <div className="stat-n">0</div>
          <div className="stat-l">{t("booked")}</div>
        </div>
      </div>

      <h3 className="h-card">{t("yourClinician")}</h3>
      <div className="card card-pad-lg" style={{ marginTop: "var(--s-4)", marginBottom: "var(--s-6)" }}>
        {clinician ? (
          <div className="row" style={{ gap: 14 }}>
            <div className="avatar avatar-lg" aria-hidden="true">
              {initials(clinician.name)}
            </div>
            <div>
              <div className="strong">{clinician.name}</div>
              {(clinician.title || clinician.institution) && (
                <div className="small muted">{[clinician.title, clinician.institution].filter(Boolean).join(" · ")}</div>
              )}
            </div>
          </div>
        ) : (
          <div className="row" style={{ gap: 14 }}>
            <div className="avatar avatar-soft avatar-lg" aria-hidden="true">
              <Icon name="stethoscope" size={20} />
            </div>
            <div>
              <div className="strong">{t("noClinician")}</div>
              <div className="small muted">{t("noClinicianBody")}</div>
            </div>
          </div>
        )}
      </div>

      <div className="card card-pad-lg">
        <div className="empty">
          <Icon name="video" size={30} />
          <p className="strong">{t("noneYet")}</p>
          <p className="small muted" style={{ maxWidth: "44ch", marginInline: "auto" }}>
            {t("mostPeopleWrong")}
          </p>
          <button type="button" className="btn" disabled style={{ marginTop: 16 }}>
            <Icon name="calendar" size={17} />
            {t("bookFirstCall")}
          </button>
          <p className="small faint" style={{ marginTop: 10 }}>
            {t("bookingUnavailable")}
          </p>
        </div>
      </div>
    </div>
  );
}
