import { requirePagePermission } from "../../src/lib/authz";

// Onboarding creates patient records, so only patients may open it; staff are
// sent to their own dashboard (src/lib/permissions.ts).
export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  await requirePagePermission("self:programme");
  return <>{children}</>;
}
