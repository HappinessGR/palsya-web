import { currentUser } from "@clerk/nextjs/server";
import { pageMetadata } from "../../../i18n/metadata";
import { db } from "../../../src/db";
import { ScanCapture } from "./ScanCapture";

export function generateMetadata() {
  return pageMetadata("appScan.scan.meta");
}

/** Take a scan — ported from the legacy prototype's V['app/scan']. */
export default async function ScanPage() {
  const user = await currentUser();
  const row = user
    ? await db.query.users.findFirst({
        where: { clerkUserId: user.id },
        with: { patientProfile: { with: { preferences: true } } },
      })
    : null;
  // Default matches patient_preferences.camera_mirror's column default.
  const mirror = row?.patientProfile?.preferences?.cameraMirror ?? true;

  return (
    <div className="page">
      <ScanCapture mirror={mirror} />
    </div>
  );
}
