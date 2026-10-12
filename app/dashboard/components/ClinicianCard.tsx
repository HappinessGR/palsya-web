import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Icon } from "../../components/Icon";

export async function ClinicianCard() {
  const t = await getTranslations("dashboard.clinician");
  return (
    <div className="card card-pad-lg">
      <div className="card-hd">
        <h3>{t("title")}</h3>
        <Link className="link-arrow small" href="/dashboard/consults">
          {t("allConsultations")}
          <Icon name="arrow-right" size={14} />
        </Link>
      </div>

      <p className="muted">{t("available", { count: 0 })}</p>
      <div className="row-wrap" style={{ marginTop: 14 }}>
        <Link className="btn btn-sm btn-ghost" href="/dashboard/consults">
          <Icon name="calendar" size={15} />
          {t("add")}
        </Link>
      </div>
    </div>
  );
}
