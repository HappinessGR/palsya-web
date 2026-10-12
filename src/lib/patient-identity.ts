import { getLocale } from "next-intl/server";
import { db } from "../db";
import { patientProfiles } from "../db/schema/users";
import { getActor } from "./authz";
import { can } from "./permissions";

export interface PatientIdentity {
  userId: string;
  patientProfileId: string;
}

/**
 * Finds the signed-in patient's user/patientProfile row, creating the profile
 * if the Clerk -> DB webhook (app/api/webhooks/clerk) hasn't landed yet --
 * webhook delivery is async, and a patient can reach /onboarding or
 * /dashboard/session before it fires. Throws for non-patient accounts, so a
 * clinician or admin calling a patient server action gets no patient record.
 */
export async function getOrCreatePatientIdentity(): Promise<PatientIdentity> {
  // getActor() provisions the users row (role decided server-side) and reads
  // the role from the database; only patients have a patient profile.
  const actor = await getActor();
  if (!actor) throw new Error("getOrCreatePatientIdentity called with no signed-in user");
  if (actor.blocked || !can(actor.role, "self:programme")) {
    throw new Error("getOrCreatePatientIdentity called by a non-patient account");
  }

  let patientProfileId = (await db.query.patientProfiles.findFirst({ where: { userId: actor.userId } }))?.id;
  if (!patientProfileId) {
    const [inserted] = await db
      .insert(patientProfiles)
      .values({ userId: actor.userId, preferredLanguage: await getLocale() })
      .onConflictDoNothing({ target: patientProfiles.userId })
      .returning({ id: patientProfiles.id });

    patientProfileId =
      inserted?.id ?? (await db.query.patientProfiles.findFirst({ where: { userId: actor.userId } }))?.id;
  }

  if (!patientProfileId) throw new Error("Failed to find or create patient profile for signed-in patient");

  return { userId: actor.userId, patientProfileId };
}
