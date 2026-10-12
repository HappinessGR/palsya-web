import Link from "next/link";
import { and, count, eq, isNull, sql } from "drizzle-orm";
import { getFormatter, getTranslations } from "next-intl/server";
import { SiteHeader } from "../components/SiteHeader";
import { pageMetadata } from "../../i18n/metadata";
import { db } from "../../src/db";
import { patientProfiles, users } from "../../src/db/schema/users";
import { requirePagePermission } from "../../src/lib/authz";
import { listPendingInvitations } from "../../src/lib/user-admin";
import { AdminNav } from "./AdminNav";

export async function generateMetadata() {
  return pageMetadata("admin.meta");
}

async function loadCounts() {
  const byRole = await db
    .select({ role: users.role, n: count() })
    .from(users)
    .where(isNull(users.deletedAt))
    .groupBy(users.role);
  const roleCount = (...roles: string[]) =>
    byRole.filter((r) => roles.includes(r.role)).reduce((sum, r) => sum + Number(r.n), 0);

  const [unassigned] = await db
    .select({ n: count() })
    .from(patientProfiles)
    .innerJoin(users, eq(users.id, patientProfiles.userId))
    .where(and(isNull(patientProfiles.assignedClinicianId), isNull(users.deletedAt), sql`${users.role} = 'patient'`));

  let pending: number | null = null;
  try {
    pending = (await listPendingInvitations()).length;
  } catch {
    pending = null; // Clerk unreachable — show a dash rather than failing the page.
  }

  return {
    patients: roleCount("patient"),
    clinicians: roleCount("clinician"),
    admins: roleCount("admin", "superuser"),
    unassigned: Number(unassigned?.n ?? 0),
    pendingInvitations: pending,
  };
}

export default async function AdminPage() {
  const actor = await requirePagePermission("users:read");
  const t = await getTranslations("admin");
  const format = await getFormatter();
  const counts = await loadCounts();
  const firstName = actor.fullName.split(" ")[0];

  const stats = [
    { key: "patients", value: counts.patients },
    { key: "clinicians", value: counts.clinicians },
    { key: "admins", value: counts.admins },
    { key: "unassigned", value: counts.unassigned },
    { key: "pendingInvitations", value: counts.pendingInvitations },
  ] as const;

  const links = [
    { href: "/admin/users", title: "users", body: "usersBody" },
    { href: "/admin/invite", title: "invite", body: "inviteBody" },
    { href: "/admin/audit", title: "audit", body: "auditBody" },
  ] as const;

  return (
    <>
      <SiteHeader />
      <div className="page">
        <div className="greet">
          <h2>{firstName ? t("headingNamed", { name: firstName }) : t("heading")}</h2>
          <p>{t("subtitle")}</p>
        </div>

        <div style={{ marginTop: "var(--s-5)" }}>
          <AdminNav />
        </div>

        <div
          style={{ display: "grid", gap: "var(--s-4)", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}
        >
          {stats.map((s) => (
            <div key={s.key} className="card card-pad-sm stat">
              <div className="stat-n">{s.value === null ? t("overview.unavailable") : format.number(s.value)}</div>
              <div className="stat-l">{t(`overview.counts.${s.key}`)}</div>
            </div>
          ))}
        </div>

        <h3 className="card-title" style={{ marginTop: "var(--s-7)" }}>
          {t("overview.links.title")}
        </h3>
        <div
          style={{ display: "grid", gap: "var(--s-4)", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}
        >
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="card card-pad-lg" style={{ textDecoration: "none", color: "inherit" }}>
              <h4 className="card-title">{t(`overview.links.${l.title}`)}</h4>
              <p className="small muted">{t(`overview.links.${l.body}`)}</p>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
