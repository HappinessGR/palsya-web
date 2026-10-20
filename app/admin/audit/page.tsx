import { desc, eq } from "drizzle-orm";
import { getFormatter, getTranslations } from "next-intl/server";
import { pageMetadata } from "../../../i18n/metadata";
import { db } from "../../../src/db";
import { actionTypes, activityLog } from "../../../src/db/schema/activity";
import { users } from "../../../src/db/schema/users";
import { requirePagePermission } from "../../../src/lib/authz";

export async function generateMetadata() {
  return pageMetadata("admin.audit.meta");
}

const LIMIT = 200;

/** Renders one metadata value compactly: scalars as-is, null as a dash, objects as JSON. */
function renderValue(v: unknown, dash: string): string {
  if (v === null || v === undefined || v === "") return dash;
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") return String(v);
  return JSON.stringify(v);
}

export default async function AdminAuditPage() {
  await requirePagePermission("audit:read");
  const t = await getTranslations("admin.audit");
  const format = await getFormatter();

  const rows = await db
    .select({
      id: activityLog.id,
      createdAt: activityLog.createdAt,
      targetType: activityLog.targetType,
      targetId: activityLog.targetId,
      metadata: activityLog.metadata,
      code: actionTypes.code,
      actorName: users.fullName,
      actorEmail: users.email,
    })
    .from(activityLog)
    .innerJoin(actionTypes, eq(actionTypes.id, activityLog.actionTypeId))
    .leftJoin(users, eq(users.id, activityLog.userId))
    .orderBy(desc(activityLog.createdAt))
    .limit(LIMIT);

  return (
    <>
      <div>
        <div className="greet">
          <h2>{t("heading")}</h2>
          <p>{t("subtitle", { count: LIMIT })}</p>
        </div>

        {rows.length === 0 ? (
          <p className="muted">{t("empty")}</p>
        ) : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>{t("columns.when")}</th>
                  <th>{t("columns.who")}</th>
                  <th>{t("columns.action")}</th>
                  <th>{t("columns.target")}</th>
                  <th>{t("columns.details")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const meta =
                    r.metadata && typeof r.metadata === "object" && !Array.isArray(r.metadata)
                      ? Object.entries(r.metadata as Record<string, unknown>)
                      : [];
                  const targetLabel = r.targetType
                    ? t.has(`targets.${r.targetType}`)
                      ? t(`targets.${r.targetType}`)
                      : r.targetType
                    : null;
                  return (
                    <tr key={r.id}>
                      <td className="small" style={{ whiteSpace: "nowrap" }}>
                        {format.dateTime(r.createdAt, { dateStyle: "medium", timeStyle: "short" })}
                      </td>
                      <td className="small">
                        {r.actorEmail ? (
                          <>
                            <div>{r.actorName}</div>
                            <div className="muted">{r.actorEmail}</div>
                          </>
                        ) : (
                          <span className="muted">{t("system")}</span>
                        )}
                      </td>
                      <td>{t.has(`actions.${r.code}`) ? t(`actions.${r.code}`) : r.code}</td>
                      <td className="small">
                        {targetLabel ? (
                          <>
                            <div>{targetLabel}</div>
                            {r.targetId && (
                              <code className="muted" title={r.targetId}>
                                {r.targetId.slice(0, 8)}
                              </code>
                            )}
                          </>
                        ) : (
                          <span className="muted">{t("noTarget")}</span>
                        )}
                      </td>
                      <td className="small">
                        {meta.length === 0 ? (
                          <span className="muted">{t("noDetails")}</span>
                        ) : (
                          meta.map(([k, v]) => (
                            <div key={k} style={{ wordBreak: "break-word" }}>
                              <span className="muted">{k}:</span> {renderValue(v, t("noDetails"))}
                            </div>
                          ))
                        )}
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
