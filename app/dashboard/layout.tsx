import { redirect } from "next/navigation";
import { requirePagePermission } from "../../src/lib/authz";
import { requireActiveSubscription } from "../../lib/billing/require-active-subscription";
import { getOnboardingProgress, nextOnboardingPath } from "../onboarding/data";
import { SiteHeader } from "../components/SiteHeader";

export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  await requirePagePermission("self:programme");
  await requireActiveSubscription();

  const progress = await getOnboardingProgress();
  const next = nextOnboardingPath(progress);
  if (next !== "/dashboard") redirect(next);

  return (
    <>
      {/* Name, "My dashboard", "Log out" and the language picker. */}
      <SiteHeader />
      {children}
    </>
  );
}
