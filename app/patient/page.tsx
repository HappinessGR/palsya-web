import { redirect } from "next/navigation";
import { pageMetadata } from "../../i18n/metadata";
import { requirePagePermission } from "../../src/lib/authz";

export function generateMetadata() {
  return pageMetadata("dashboard.meta");
}

// The patient dashboard already lives at /dashboard (with its subscription
// and onboarding gates); /patient is just the role-named entry point.
export default async function PatientPage() {
  await requirePagePermission("self:programme");
  redirect("/dashboard");
}
