import Link from "next/link";
import { draftMode } from "next/headers";
import { getTranslations } from "next-intl/server";
import { exitPreviewAction } from "../admin/text/actions";

/**
 * Shown on every page while an admin previews unpublished website text
 * (Draft Mode, turned on from /admin/text). Draft Mode can only be enabled by
 * that admin-only action, and drafts are only applied for admins.
 */
export async function PreviewBanner() {
  if (!(await draftMode()).isEnabled) return null;
  const t = await getTranslations("backoffice.admin.text.banner");

  return (
    <div
      role="status"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 200,
        display: "flex",
        gap: 12,
        alignItems: "center",
        justifyContent: "center",
        flexWrap: "wrap",
        padding: "8px 16px",
        background: "var(--warn-tint)",
        color: "var(--warn-ink)",
        borderBottom: "1px solid var(--line)",
        fontSize: "var(--t-sm)",
      }}
    >
      <strong>{t("title")}</strong>
      <span>{t("body")}</span>
      <Link href="/admin/text" className="btn btn-sm btn-ghost">
        {t("back")}
      </Link>
      <form action={exitPreviewAction}>
        <button className="btn btn-sm" type="submit">
          {t("exit")}
        </button>
      </form>
    </div>
  );
}
