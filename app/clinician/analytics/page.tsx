import { pageMetadata } from "../../../i18n/metadata";
import { requirePagePermission } from "../../../src/lib/authz";
import { listPatients, scopeFor } from "../../../src/lib/backoffice";
import { AnalyticsView } from "../../components/backoffice/analytics";

export async function generateMetadata() {
  return pageMetadata("backoffice.clinician.meta");
}

/** Clinician portal — Analytics: the admin analytics, for this clinician's caseload only. */
export default async function ClinicianAnalyticsPage() {
  const actor = await requirePagePermission("patients:assigned:read");
  const patients = await listPatients(scopeFor(actor));
  return <AnalyticsView patients={patients} area="clinician" />;
}
