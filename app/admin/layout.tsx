import { getTranslations } from "next-intl/server";
import { requirePagePermission } from "../../src/lib/authz";
import { BackOfficeShell } from "../components/backoffice/BackOfficeShell";

const TABS = [
  { key: "overview", href: "/admin" },
  { key: "clinicians", href: "/admin/clinicians" },
  { key: "patients", href: "/admin/patients" },
  { key: "content", href: "/admin/content" },
  { key: "analytics", href: "/admin/analytics" },
  { key: "finance", href: "/admin/finance" },
  { key: "compliance", href: "/admin/compliance" },
  { key: "text", href: "/admin/text" },
  { key: "users", href: "/admin/users" },
] as const;

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  await requirePagePermission("users:read");
  const t = await getTranslations("backoffice");

  return (
    <BackOfficeShell
      heading={t("admin.heading")}
      intro={t("admin.intro")}
      backLabel={t("common.backToSite")}
      tabsLabel={t("common.tabsLabel")}
      tabs={TABS.map((tab) => ({ href: tab.href, label: t(`admin.tabs.${tab.key}`) }))}
    >
      {children}
    </BackOfficeShell>
  );
}
