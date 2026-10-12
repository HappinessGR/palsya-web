import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { SiteHeader } from "../../components/SiteHeader";
import { pageMetadata } from "../../../i18n/metadata";
import { listActiveClinicians, requirePagePermission } from "../../../src/lib/authz";
import { APP_ROLES, isAppRole, toAppRole } from "../../../src/lib/permissions";
import { listUsers } from "../../../src/lib/user-admin";
import { AdminNav } from "../AdminNav";
import { Flash } from "../Flash";
import { param } from "../shared";
import { assignClinicianAction, changeRoleAction, setStatusAction } from "./actions";

export async function generateMetadata() {
  return pageMetadata("admin.users.meta");
}

const RESULT_CODES = ["role_changed", "status_changed", "assigned"] as const;

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const actor = await requirePagePermission("users:read");
  const sp = await searchParams;
  const filterParam = param(sp, "role");
  const filter = isAppRole(filterParam) ? filterParam : null;

  const t = await getTranslations("admin");
  const format = await getFormatter();
  const [allUsers, clinicians] = await Promise.all([listUsers(), listActiveClinicians()]);

  const nameById = new Map(allUsers.map((u) => [u.id, u.fullName || u.email]));
  const rows = allUsers
    .map((u) => ({ ...u, appRole: toAppRole(u.role) ?? "patient" }))
    .filter((u) => !filter || u.appRole === filter);

  const filters = [{ key: "all", role: null }, ...APP_ROLES.map((r) => ({ key: r, role: r }))];

  return (
    <>
      <SiteHeader />
      <div className="page">
        <div className="greet">
          <h2>{t("users.heading")}</h2>
          <p>{t("users.subtitle")}</p>
        </div>
        <div style={{ marginTop: "var(--s-5)" }}>
          <AdminNav />
        </div>

        <Flash result={param(sp, "result")} error={param(sp, "error")} resultNs="users" resultCodes={RESULT_CODES} />

        <nav aria-label={t("users.filter.label")} style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: "var(--s-4)" }}>
          {filters.map((f) => {
            const on = f.role === filter;
            return (
              <Link
                key={f.key}
                href={f.role ? `/admin/users?role=${f.role}` : "/admin/users"}
                className={on ? "badge badge-brand" : "badge badge-outline"}
                aria-current={on ? "page" : undefined}
                style={{ textDecoration: "none" }}
              >
                {f.role ? t(`roles.${f.role}`) : t("users.filter.all")}
              </Link>
            );
          })}
        </nav>

        {rows.length === 0 ? (
          <p className="muted">{t("users.empty")}</p>
        ) : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>{t("users.columns.name")}</th>
                  <th>{t("users.columns.email")}</th>
                  <th>{t("users.columns.role")}</th>
                  <th>{t("users.columns.status")}</th>
                  <th>{t("users.columns.created")}</th>
                  <th>{t("users.columns.clinician")}</th>
                  <th>{t("users.columns.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((u) => {
                  const isSelf = u.id === actor.userId;
                  const name = u.fullName || u.email;
                  const suspended = u.status === "suspended";
                  const profile = u.appRole === "patient" ? u.patientProfile : null;
                  return (
                    <tr key={u.id}>
                      <td>
                        {name}
                        {isSelf && (
                          <span className="badge badge-info" style={{ marginLeft: 6 }}>
                            {t("users.you")}
                          </span>
                        )}
                      </td>
                      <td className="small">{u.email}</td>
                      <td>{t(`roles.${u.appRole}`)}</td>
                      <td>
                        <span className={`badge ${suspended ? "badge-alert" : u.status === "active" ? "badge-ok" : "badge-warn"}`}>
                          {t(`statuses.${u.status}`)}
                        </span>
                      </td>
                      <td className="small" style={{ whiteSpace: "nowrap" }}>
                        {format.dateTime(u.createdAt, { day: "numeric", month: "short", year: "numeric" })}
                      </td>
                      <td>
                        {profile ? (
                          <form action={assignClinicianAction} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                            <input type="hidden" name="patientProfileId" value={profile.id} />
                            {filter && <input type="hidden" name="filter" value={filter} />}
                            <select
                              name="clinicianUserId"
                              className="select"
                              defaultValue={profile.assignedClinicianId ?? ""}
                              aria-label={t("users.clinicianSelect", { name })}
                            >
                              <option value="">{t("users.unassigned")}</option>
                              {profile.assignedClinicianId && !clinicians.some((c) => c.id === profile.assignedClinicianId) && (
                                <option value={profile.assignedClinicianId}>
                                  {nameById.get(profile.assignedClinicianId) ?? profile.assignedClinicianId}
                                </option>
                              )}
                              {clinicians.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.fullName || c.email}
                                </option>
                              ))}
                            </select>
                            <button type="submit" className="btn btn-sm btn-ghost">
                              {t("users.assign")}
                            </button>
                          </form>
                        ) : (
                          <span className="muted">{t("users.notApplicable")}</span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                          <form action={changeRoleAction} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                            <input type="hidden" name="userId" value={u.id} />
                            {filter && <input type="hidden" name="filter" value={filter} />}
                            <select
                              name="role"
                              className="select"
                              defaultValue={u.appRole}
                              aria-label={t("users.roleSelect", { name })}
                            >
                              {APP_ROLES.map((r) => (
                                <option key={r} value={r}>
                                  {t(`roles.${r}`)}
                                </option>
                              ))}
                            </select>
                            <button type="submit" className="btn btn-sm btn-ghost">
                              {t("users.saveRole")}
                            </button>
                          </form>
                          {!isSelf && (
                            <form action={setStatusAction}>
                              <input type="hidden" name="userId" value={u.id} />
                              <input type="hidden" name="status" value={suspended ? "active" : "suspended"} />
                              {filter && <input type="hidden" name="filter" value={filter} />}
                              <button type="submit" className={suspended ? "btn btn-sm btn-ghost" : "btn btn-sm btn-danger"}>
                                {suspended ? t("users.reactivate") : t("users.deactivate")}
                              </button>
                            </form>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
