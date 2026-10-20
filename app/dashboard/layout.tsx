import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requirePagePermission } from "../../src/lib/authz";
import { requireActiveSubscription } from "../../lib/billing/require-active-subscription";
import { getOnboardingProgress, nextOnboardingPath } from "../onboarding/data";
import { AppShell } from "./components/AppShell";
import { getShellData } from "./shell-data";

export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  await requirePagePermission("self:programme");
  await requireActiveSubscription();

  const progress = await getOnboardingProgress();
  const next = nextOnboardingPath(progress);
  if (next !== "/dashboard") redirect(next);

  const data = await getShellData();
  const tProgramme = await getTranslations("programme");

  return (
    // Sidebar (Stage card, programme nav, settings, sign out) + top bar
    // (page title, language, Help, Scan) around every patient page.
    <AppShell data={data} stageName={tProgramme(`stages.${data.stageNum}.name`)}>
      {children}
    </AppShell>
  );
}
