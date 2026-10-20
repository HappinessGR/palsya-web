import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { pageMetadata } from "../../../i18n/metadata";
import { Icon } from "../../components/Icon";

export function generateMetadata() {
  return pageMetadata("appScan.timeline.meta");
}

/**
 * Photo timeline — ported from the legacy prototype's V['app/timeline'].
 * Scans aren't stored yet (no table or photo storage), so every patient sees
 * the prototype's empty state; the list/compare view arrives with storage.
 */
export default async function TimelinePage() {
  const t = await getTranslations("appScan.timeline");

  return (
    <div className="page">
      <div className="row-between" style={{ alignItems: "flex-start", flexWrap: "wrap", gap: 16, marginBottom: "var(--s-6)" }}>
        <div>
          <h2 className="display" style={{ fontSize: "var(--t-3xl)" }}>
            {t("title")}
          </h2>
        </div>
      </div>

      <div className="card card-pad-lg">
        <div className="empty">
          <Icon name="image" size={30} />
          <p className="strong">{t("nothingYet")}</p>
          <p className="small muted">{t("fillsUp")}</p>
          <Link className="btn" href="/dashboard/scan" style={{ marginTop: 16 }}>
            <Icon name="camera" size={17} />
            {t("takeBaselineScan")}
          </Link>
        </div>
      </div>
    </div>
  );
}
