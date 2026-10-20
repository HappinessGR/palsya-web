import { getTranslations } from "next-intl/server";
import { requirePagePermission } from "../../src/lib/authz";
import { BackOfficeShell } from "../components/backoffice/BackOfficeShell";

// Same structure as the admin back office (app/admin/layout.tsx), scoped to
// the clinician's own patients — no Finance or Compliance tabs.
const TABS = [
  { key: "overview", href: "/clinician" },
  { key: "patients", href: "/clinician/patients" },
  { key: "review", href: "/clinician/review" },
  { key: "consultations", href: "/clinician/consultations" },
  { key: "content", href: "/clinician/content" },
  { key: "analytics", href: "/clinician/analytics" },
] as const;

export default async function ClinicianLayout({ children }: LayoutProps<"/clinician">) {
  await requirePagePermission("patients:assigned:read");
  const t = await getTranslations("backoffice");

  return (
    <BackOfficeShell
      heading={t("clinician.heading")}
      intro={t("clinician.intro")}
      backLabel={t("common.backToSite")}
      tabsLabel={t("common.tabsLabel")}
      tabs={TABS.map((tab) => ({ href: tab.href, label: t(`clinician.tabs.${tab.key}`) }))}
    >
      {children}
    </BackOfficeShell>
  );
}
