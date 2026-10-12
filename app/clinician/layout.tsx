import { requirePagePermission } from "../../src/lib/authz";

export default async function ClinicianLayout({ children }: LayoutProps<"/clinician">) {
  await requirePagePermission("patients:assigned:read");
  return <>{children}</>;
}
