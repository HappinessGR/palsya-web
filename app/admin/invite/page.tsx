import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { SiteHeader } from "../../components/SiteHeader";
import { pageMetadata } from "../../../i18n/metadata";
import { isLocale, localeNames, locales } from "../../../i18n/config";
import { requirePagePermission } from "../../../src/lib/authz";
import { INVITABLE_ROLES, isAppRole } from "../../../src/lib/permissions";
import { listPendingInvitations } from "../../../src/lib/user-admin";
import { AdminNav } from "../AdminNav";
import { Flash } from "../Flash";
import { param } from "../shared";
import { inviteAction, revokeAction } from "./actions";

export async function generateMetadata() {
  return pageMetadata("admin.invite.meta");
}

const RESULT_CODES = ["invited", "revoked"] as const;

export default async function AdminInvitePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requirePagePermission("users:invite");
  const sp = await searchParams;
  const t = await getTranslations("admin");
  const format = await getFormatter();
  const current = await getLocale();

  let pending: Awaited<ReturnType<typeof listPendingInvitations>> | null = null;
  try {
    pending = await listPendingInvitations();
  } catch {
    pending = null;
  }

  return (
    <>
      <SiteHeader />
      <div className="page">
        <div className="greet">
          <h2>{t("invite.heading")}</h2>
          <p>{t("invite.subtitle")}</p>
        </div>
        <div style={{ marginTop: "var(--s-5)" }}>
          <AdminNav />
        </div>

        <Flash result={param(sp, "result")} error={param(sp, "error")} resultNs="invite" resultCodes={RESULT_CODES} />

        <div className="card card-pad-lg" style={{ maxWidth: 560 }}>
          <h3 className="card-title">{t("invite.form.title")}</h3>
          <form action={inviteAction}>
            <div className="field">
              <label className="label" htmlFor="invite-email">
                {t("invite.form.email")}
              </label>
              <input
                id="invite-email"
                name="email"
                type="email"
                required
                autoComplete="off"
                className="input"
                placeholder={t("invite.form.emailPlaceholder")}
              />
            </div>
            <div className="field">
              <label className="label" htmlFor="invite-role">
                {t("invite.form.role")}
              </label>
              <select id="invite-role" name="role" className="select" defaultValue={INVITABLE_ROLES[0]}>
                {INVITABLE_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {t(`roles.${r}`)}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label className="label" htmlFor="invite-locale">
                {t("invite.form.language")}
              </label>
              <select
                id="invite-locale"
                name="locale"
                className="select"
                defaultValue={isLocale(current) ? current : locales[0]}
                aria-describedby="invite-locale-hint"
              >
                {locales.map((l) => (
                  <option key={l} value={l} lang={l}>
                    {localeNames[l]}
                  </option>
                ))}
              </select>
              <p id="invite-locale-hint" className="hint">
                {t("invite.form.languageHint")}
              </p>
            </div>
            <button type="submit" className="btn">
              {t("invite.form.submit")}
            </button>
          </form>
        </div>

        <div className="card card-pad-lg" style={{ marginTop: "var(--s-6)" }}>
          <h3 className="card-title">{t("invite.pending.title")}</h3>
          {pending === null ? (
            <p className="small muted">{t("invite.pending.unavailable")}</p>
          ) : pending.length === 0 ? (
            <p className="small muted">{t("invite.pending.empty")}</p>
          ) : (
            <div className="tbl-wrap" style={{ marginTop: 12 }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>{t("invite.pending.email")}</th>
                    <th>{t("invite.pending.role")}</th>
                    <th>{t("invite.pending.sent")}</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {pending.map((inv) => (
                    <tr key={inv.id}>
                      <td>{inv.email}</td>
                      <td>{isAppRole(inv.role) ? t(`roles.${inv.role}`) : inv.role}</td>
                      <td className="small" style={{ whiteSpace: "nowrap" }}>
                        {format.dateTime(inv.createdAt, { dateStyle: "medium", timeStyle: "short" })}
                      </td>
                      <td className="tr">
                        <form action={revokeAction}>
                          <input type="hidden" name="invitationId" value={inv.id} />
                          <button
                            type="submit"
                            className="btn btn-sm btn-danger"
                            aria-label={t("invite.pending.revokeLabel", { email: inv.email })}
                          >
                            {t("invite.pending.revoke")}
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
