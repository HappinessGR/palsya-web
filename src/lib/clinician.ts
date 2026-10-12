import "server-only";
import { and, desc, eq, isNull, max } from "drizzle-orm";
import { db } from "../db";
import { patientProfiles, users } from "../db/schema/users";
import { phaseAssignments } from "../db/schema/onboarding";
import { clinicianNotes } from "../db/schema/clinical-notes";
import { dailySessions } from "../db/schema/daily-sessions";
import { assertCanAccessPatient, type Actor } from "./authz";
import { logAction } from "./audit";
import { can, type Permission } from "./permissions";

/**
 * Everything a clinician can do with a patient record. A clinician only ever
 * sees patients whose patient_profiles.assigned_clinician_id is their own
 * users.id. Callers (pages, server actions, API routes) check the permission
 * first with requirePagePermission / authorizeAction / authorizeApi; every
 * function here checks the permission AND the assignment again, so a missed
 * check upstream still can't leak another clinician's patient.
 */

export const NOTE_MAX_LENGTH = 5000;
export const REASON_MAX_LENGTH = 500;

export type ClinicianError = "forbidden" | "invalid_note" | "invalid_stage" | "invalid_reason";
export type ClinicianResult<T = void> =
  | ({ ok: true } & (T extends void ? object : { value: T }))
  | { ok: false; error: ClinicianError };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

function allowed(actor: Actor, permission: Permission): boolean {
  return !actor.blocked && can(actor.role, permission);
}

/** The profile when this clinician may act on it with `permission`, otherwise null. */
async function accessiblePatient(actor: Actor, patientProfileId: string, permission: Permission) {
  if (!isUuid(patientProfileId) || !allowed(actor, permission)) return null;
  const profile = await assertCanAccessPatient(actor, patientProfileId);
  // Clinician area: assigned patients only, even for a role that could see more.
  if (!profile || profile.assignedClinicianId !== actor.userId) return null;
  return profile;
}

export interface AssignedPatient {
  patientProfileId: string;
  fullName: string;
  email: string;
  stage: number | null;
  onsetDate: string | null;
  lastSessionDate: string | null;
}

/** Patients assigned to this clinician, alphabetically. */
export async function listAssignedPatients(actor: Actor): Promise<AssignedPatient[]> {
  if (!allowed(actor, "patients:assigned:read")) return [];

  const lastSessions = db
    .select({ patientProfileId: dailySessions.patientProfileId, lastDate: max(dailySessions.date).as("last_date") })
    .from(dailySessions)
    .groupBy(dailySessions.patientProfileId)
    .as("last_sessions");

  const rows = await db
    .select({
      patientProfileId: patientProfiles.id,
      fullName: users.fullName,
      email: users.email,
      stage: patientProfiles.phase,
      onsetDate: patientProfiles.onsetDate,
      lastSessionDate: lastSessions.lastDate,
    })
    .from(patientProfiles)
    .innerJoin(users, eq(users.id, patientProfiles.userId))
    .leftJoin(lastSessions, eq(lastSessions.patientProfileId, patientProfiles.id))
    .where(and(eq(patientProfiles.assignedClinicianId, actor.userId), isNull(users.deletedAt)))
    .orderBy(users.fullName);

  return rows.map((r) => ({ ...r, lastSessionDate: r.lastSessionDate ?? null }));
}

export interface ClinicianPatient {
  patientProfileId: string;
  fullName: string;
  email: string;
  stage: number | null;
  onsetDate: string | null;
}

/** One assigned patient, or null when unknown / not assigned to this clinician. */
export async function getPatientForClinician(actor: Actor, patientProfileId: string): Promise<ClinicianPatient | null> {
  const profile = await accessiblePatient(actor, patientProfileId, "patients:assigned:read");
  if (!profile) return null;
  const user = await db.query.users.findFirst({ where: { id: profile.userId } });
  if (!user || user.deletedAt) return null;
  return {
    patientProfileId: profile.id,
    fullName: user.fullName,
    email: user.email,
    stage: profile.phase,
    onsetDate: profile.onsetDate,
  };
}

export interface ClinicianNote {
  id: string;
  body: string;
  authorName: string | null;
  createdAt: Date;
}

/**
 * Notes on a patient, newest first. No access check of its own — pass only an
 * id that getPatientForClinician (or another check) already approved; use
 * listNotesForClinician otherwise.
 */
export async function listNotes(patientProfileId: string): Promise<ClinicianNote[]> {
  if (!isUuid(patientProfileId)) return [];
  const rows = await db
    .select({
      id: clinicianNotes.id,
      body: clinicianNotes.body,
      authorName: users.fullName,
      createdAt: clinicianNotes.createdAt,
    })
    .from(clinicianNotes)
    .leftJoin(users, eq(users.id, clinicianNotes.authorId))
    .where(eq(clinicianNotes.patientProfileId, patientProfileId))
    .orderBy(desc(clinicianNotes.createdAt));
  return rows;
}

/** listNotes behind the same assigned-patient check as everything else. */
export async function listNotesForClinician(actor: Actor, patientProfileId: string): Promise<ClinicianNote[] | null> {
  const profile = await accessiblePatient(actor, patientProfileId, "patients:assigned:read");
  if (!profile) return null;
  return listNotes(profile.id);
}

export async function addNote(
  actor: Actor,
  patientProfileId: string,
  body: unknown,
): Promise<ClinicianResult<ClinicianNote>> {
  const profile = await accessiblePatient(actor, patientProfileId, "patients:assigned:notes");
  if (!profile) return { ok: false, error: "forbidden" };

  const text = typeof body === "string" ? body.trim() : "";
  if (text.length < 1 || text.length > NOTE_MAX_LENGTH) return { ok: false, error: "invalid_note" };

  const [row] = await db
    .insert(clinicianNotes)
    .values({ patientProfileId: profile.id, authorId: actor.userId, body: text })
    .returning();

  // The note text itself stays out of the audit log.
  await logAction(actor.userId, "clinician_note_added", { type: "patient_profile", id: profile.id }, {
    noteId: row.id,
    length: text.length,
  });
  return { ok: true, value: { id: row.id, body: row.body, authorName: actor.fullName, createdAt: row.createdAt } };
}

/** Parses a stage from a form/JSON value: an integer 1–5, otherwise null. */
export function parseStage(value: unknown): number | null {
  const n = typeof value === "number" ? value : typeof value === "string" && /^\d$/.test(value.trim()) ? Number(value) : NaN;
  return Number.isInteger(n) && n >= 1 && n <= 5 ? n : null;
}

/**
 * Sets the patient's stage: a phase_assignments row (source clinician_override)
 * for the history, then patient_profiles.phase, in one batch (neon-http runs a
 * batch as a single transaction).
 */
export async function changeStage(
  actor: Actor,
  patientProfileId: string,
  stageValue: unknown,
  reason?: unknown,
): Promise<ClinicianResult<{ from: number | null; to: number }>> {
  const profile = await accessiblePatient(actor, patientProfileId, "patients:assigned:stage");
  if (!profile) return { ok: false, error: "forbidden" };

  const stage = parseStage(stageValue);
  if (stage === null) return { ok: false, error: "invalid_stage" };
  if (reason != null && typeof reason !== "string") return { ok: false, error: "invalid_reason" };
  const reasonText = (reason ?? "").trim();
  if (reasonText.length > REASON_MAX_LENGTH) return { ok: false, error: "invalid_reason" };

  const now = new Date();
  await db.batch([
    db.insert(phaseAssignments).values({
      patientProfileId: profile.id,
      stage,
      source: "clinician_override",
      confidence: "high",
      needsReview: false,
      reasons: [{ key: "clinicianOverride", values: {}, text: reasonText }],
      reviewedByStaffId: actor.userId,
      reviewedAt: now,
      assignedAt: now,
    }),
    db
      .update(patientProfiles)
      .set({ phase: stage, updatedAt: now })
      .where(and(eq(patientProfiles.id, profile.id), eq(patientProfiles.assignedClinicianId, actor.userId))),
  ]);

  await logAction(actor.userId, "patient_stage_changed", { type: "patient_profile", id: profile.id }, {
    from: profile.phase,
    to: stage,
  });
  return { ok: true, value: { from: profile.phase, to: stage } };
}

/** The clinician's own text on a clinician_override history row ("" when none). */
export function overrideReasonText(reasons: unknown[]): string | null {
  const first = reasons[0];
  if (first && typeof first === "object" && "key" in first && first.key === "clinicianOverride") {
    return "text" in first && typeof first.text === "string" ? first.text : "";
  }
  return null;
}
