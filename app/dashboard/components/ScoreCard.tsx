import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Icon } from "../../components/Icon";

export async function ScoreCard() {
  const t = await getTranslations("dashboard.score");
  return (
    <div className="card card-pad-lg">
      <div className="card-hd">
        <h3>{t("title")}</h3>
      </div>

      <div className="empty" style={{ padding: "var(--s-6) 0" }}>
        <Icon name="camera" size={26} />
        <p className="strong">{t("emptyTitle")}</p>
        <p className="small muted">{t("emptyBody")}</p>
      </div>

      <div className="row-wrap" style={{ marginTop: "var(--s-5)" }}>
        <Link className="btn" href="/dashboard/scan">
          <Icon name="camera" size={17} />
          {t("cta")}
        </Link>
      </div>
    </div>
  );
}
