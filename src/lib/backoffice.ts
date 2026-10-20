import "server-only";
import { and, count, desc, eq, gte, inArray, isNull, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "../db";
import { patientProfiles, staffProfiles, users } from "../db/schema/users";
import { assessmentResponses, phaseAssignments, safetyFlags } from "../db/schema/onboarding";
import { dailySessions } from "../db/schema/daily-sessions";
import { clinicianNotes } from "../db/schema/clinical-notes";
import { subscriptions } from "../db/schema/subscriptions";
import { actionTypes, activityLog } from "../db/schema/activity";
import {
  exerciseStages,
  exercises,
  routineItemStages,
  routineItems,
  tapingTechniqueStages,
  tapingTechniques,
} from "../db/schema/content-library";
import { can } from "./permissions";
import type { Actor } from "./authz";

/**
 * Read-only figures for the back office (app/admin) and the clinician portal
 * (app/clinician). Every function takes a scope: an admin sees the whole
 * platform, a clinician only the patients assigned to them — the scope is
 * derived from the actor's role here, never from a request parameter.
 *
 * Where the database has no source for a figure yet (scans, consultations,
 * payments history, GDPR requests) the pages show the legacy prototype's
 * demonstration figures under a "Demonstration data" badge instead.
 */

export type Scope = { kind: "all" } | { kind: "clinician"; clinicianId: string };

export function scopeFor(actor: Actor): Scope {
  if (can(actor.role, "patients:all:read")) return { kind: "all" };
  return { kind: "clinician", clinicianId: actor.userId };
}

/** Days without a logged session after which a patient counts as inactive. */
export const INACTIVE_DAYS = 10;

export type PatientFlag = "review" | "inactive" | "safety";

export interface BoPatient {
  patientProfileId: string;
  fullName: string;
  /** "M. Nowak" — what operations staff see instead of the full name. */
  initials: string;
  stage: number | null;
  /** Days since the patient's profile was created (programme day). */
  day: number;
  createdAt: Date;
  clinicianId: string | null;
  clinicianName: string | null;
  lastSessionDate: string | null;
  /** Days since the last session, null when none was ever logged. */
  daysSinceSession: number | null;
  sessions7d: number;
  sessions28d: number;
  /** Share of the last 28 days with a logged session, 0–100. */
  adherence: number;
  stageAssignedAt: Date | null;
  stageConfidence: "high" | "medium" | "low" | null;
  needsReview: boolean;
  safetyFlags: number;
  flags: PatientFlag[];
}

const DAY_MS = 86_400_000;
const daysSince = (d: Date, now: Date) => Math.max(0, Math.floor((now.getTime() - d.getTime()) / DAY_MS));

/** "Maria Nowak" → "M. Nowak"; a single name stays as it is. */
export function initialise(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return parts[0] ?? "";
  return `${parts[0][0]}. ${parts[parts.length - 1]}`;
}

/** Every patient in scope with their engagement, stage and follow-up flags. */
export async function listPatients(scope: Scope): Promise<BoPatient[]> {
  const clinician = alias(users, "clinician");
  const inScope =
    scope.kind === "all" ? undefined : eq(patientProfiles.assignedClinicianId, scope.clinicianId);

  const rows = await db
    .select({
      patientProfileId: patientProfiles.id,
      fullName: users.fullName,
      stage: patientProfiles.phase,
      createdAt: patientProfiles.createdAt,
      clinicianId: patientProfiles.assignedClinicianId,
      clinicianName: clinician.fullName,
    })
    .from(patientProfiles)
    .innerJoin(users, eq(users.id, patientProfiles.userId))
    .leftJoin(clinician, eq(clinician.id, patientProfiles.assignedClinicianId))
    .where(and(isNull(users.deletedAt), eq(users.role, "patient"), inScope))
    .orderBy(users.fullName);

  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.patientProfileId);

  const [sessionRows, stageRows, flagRows] = await Promise.all([
    db
      .select({
        patientProfileId: dailySessions.patientProfileId,
        last: sql<string | null>`max(${dailySessions.date})`,
        d7: sql<number>`count(*) filter (where ${dailySessions.date} > current_date - 7)`.mapWith(Number),
        d28: sql<number>`count(*) filter (where ${dailySessions.date} > current_date - 28)`.mapWith(Number),
      })
      .from(dailySessions)
      .where(inArray(dailySessions.patientProfileId, ids))
      .groupBy(dailySessions.patientProfileId),
    // Latest stage assignment per patient.
    db
      .selectDistinctOn([phaseAssignments.patientProfileId], {
        patientProfileId: phaseAssignments.patientProfileId,
        assignedAt: phaseAssignments.assignedAt,
        confidence: phaseAssignments.confidence,
        needsReview: phaseAssignments.needsReview,
        reviewedAt: phaseAssignments.reviewedAt,
      })
      .from(phaseAssignments)
      .where(inArray(phaseAssignments.patientProfileId, ids))
      .orderBy(phaseAssignments.patientProfileId, desc(phaseAssignments.assignedAt)),
    // Safety flags the patient chose to continue past at assessment.
    db
      .select({ patientProfileId: assessmentResponses.patientProfileId, n: count() })
      .from(safetyFlags)
      .innerJoin(assessmentResponses, eq(assessmentResponses.id, safetyFlags.assessmentResponseId))
      .where(and(inArray(assessmentResponses.patientProfileId, ids), sql`${safetyFlags.overriddenAt} is not null`))
      .groupBy(assessmentResponses.patientProfileId),
  ]);

  const sessionsById = new Map(sessionRows.map((s) => [s.patientProfileId, s]));
  const stageById = new Map(stageRows.map((s) => [s.patientProfileId, s]));
  const flagsById = new Map(flagRows.map((f) => [f.patientProfileId, Number(f.n)]));
  const now = new Date();

  return rows.map((r) => {
    const s = sessionsById.get(r.patientProfileId);
    const st = stageById.get(r.patientProfileId);
    const last = s?.last ?? null;
    const daysSinceSession = last ? daysSince(new Date(`${last}T00:00:00Z`), now) : null;
    const day = daysSince(r.createdAt, now);
    const needsReview = Boolean(st?.needsReview && !st.reviewedAt);
    const safety = flagsById.get(r.patientProfileId) ?? 0;
    // A patient who has never logged a session counts as inactive once their
    // first INACTIVE_DAYS have passed, the same as one who stopped.
    const inactive = daysSinceSession === null ? day > INACTIVE_DAYS : daysSinceSession > INACTIVE_DAYS;

    const flags: PatientFlag[] = [];
    if (needsReview) flags.push("review");
    if (safety > 0) flags.push("safety");
    if (inactive) flags.push("inactive");

    const d28 = s?.d28 ?? 0;
    return {
      patientProfileId: r.patientProfileId,
      fullName: r.fullName,
      initials: initialise(r.fullName),
      stage: r.stage,
      day,
      createdAt: r.createdAt,
      clinicianId: r.clinicianId,
      clinicianName: r.clinicianName,
      lastSessionDate: last,
      daysSinceSession,
      sessions7d: s?.d7 ?? 0,
      sessions28d: d28,
      adherence: Math.round((d28 / Math.min(28, Math.max(1, day + 1))) * 100),
      stageAssignedAt: st?.assignedAt ?? null,
      stageConfidence: st?.confidence ?? null,
      needsReview,
      safetyFlags: safety,
      flags,
    };
  });
}

export interface PatientSummary {
  total: number;
  byStage: { stage: number; n: number }[];
  unstaged: number;
  needsReview: number;
  inactive: number;
  safety: number;
  flagged: number;
  sessions7d: number;
  /** Patients who logged a session in the last 7 days / joined in the last 7 days. */
  active7d: number;
  new7d: number;
  /** Median days since the current stage was set, across all staged patients. */
  medianDaysInStage: number | null;
  /** Mean of per-patient 28-day adherence, 0–100 (null with no patients). */
  meanAdherence: number | null;
  /** New patients per calendar month, oldest first, last `months` months. */
  newByMonth: { month: string; n: number }[];
  /** Per stage: patients, mean 28-day adherence, median days since the stage was set. */
  stageEngagement: { stage: number; n: number; adherence: number | null; medianDays: number | null }[];
}

const mean = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null);
function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
}

export function summarise(patients: BoPatient[], months = 6): PatientSummary {
  const now = new Date();
  const monthKeys = Array.from({ length: months }, (_, i) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months - 1 - i), 1));
    return d.toISOString().slice(0, 7);
  });
  const newByMonth = monthKeys.map((month) => ({
    month,
    n: patients.filter((p) => p.createdAt.toISOString().slice(0, 7) === month).length,
  }));

  const stageEngagement = [1, 2, 3, 4, 5].map((stage) => {
    const inStage = patients.filter((p) => p.stage === stage);
    return {
      stage,
      n: inStage.length,
      adherence: mean(inStage.map((p) => p.adherence)),
      medianDays: median(inStage.filter((p) => p.stageAssignedAt).map((p) => daysSince(p.stageAssignedAt!, now))),
    };
  });

  return {
    total: patients.length,
    byStage: stageEngagement.map(({ stage, n }) => ({ stage, n })),
    unstaged: patients.filter((p) => p.stage === null).length,
    needsReview: patients.filter((p) => p.flags.includes("review")).length,
    inactive: patients.filter((p) => p.flags.includes("inactive")).length,
    safety: patients.filter((p) => p.flags.includes("safety")).length,
    flagged: patients.filter((p) => p.flags.length > 0).length,
    sessions7d: patients.reduce((sum, p) => sum + p.sessions7d, 0),
    active7d: patients.filter((p) => p.sessions7d > 0).length,
    new7d: patients.filter((p) => now.getTime() - p.createdAt.getTime() < 7 * DAY_MS).length,
    medianDaysInStage: median(patients.filter((p) => p.stageAssignedAt).map((p) => daysSince(p.stageAssignedAt!, now))),
    meanAdherence: mean(patients.map((p) => p.adherence)),
    newByMonth,
    stageEngagement,
  };
}

export interface BoClinician {
  id: string;
  fullName: string;
  email: string;
  status: "active" | "suspended" | "pending_verification";
  title: string | null;
  institution: string | null;
  registrationNumber: string | null;
  createdAt: Date;
}

/** Clinician accounts (not deleted), alphabetically. Admin only. */
export async function listClinicians(): Promise<BoClinician[]> {
  return db
    .select({
      id: users.id,
      fullName: users.fullName,
      email: users.email,
      status: users.status,
      title: staffProfiles.title,
      institution: staffProfiles.institution,
      registrationNumber: staffProfiles.registrationNumber,
      createdAt: users.createdAt,
    })
    .from(users)
    .leftJoin(staffProfiles, eq(staffProfiles.userId, users.id))
    .where(and(eq(users.role, "clinician"), isNull(users.deletedAt)))
    .orderBy(users.fullName);
}

/** Notes written this week, in scope (a clinician's own notes; everyone's for an admin). */
export async function notesThisWeek(scope: Scope): Promise<number> {
  const since = new Date(Date.now() - 7 * DAY_MS);
  const [row] = await db
    .select({ n: count() })
    .from(clinicianNotes)
    .where(
      and(
        gte(clinicianNotes.createdAt, since),
        scope.kind === "clinician" ? eq(clinicianNotes.authorId, scope.clinicianId) : undefined,
      ),
    );
  return Number(row?.n ?? 0);
}

/** Safety flags raised at assessment this calendar month, by flag id. Admin only. */
export async function safetyFlagsThisMonth(): Promise<
  { flagId: string; level: "urgent" | "wait" | "review" | "action"; title: string; n: number; continued: number }[]
> {
  const rows = await db
    .select({
      flagId: safetyFlags.flagId,
      level: safetyFlags.level,
      title: sql<string>`max(${safetyFlags.title})`,
      n: count(),
      continued: sql<number>`count(*) filter (where ${safetyFlags.overriddenAt} is not null)`.mapWith(Number),
    })
    .from(safetyFlags)
    .where(sql`${safetyFlags.createdAt} >= date_trunc('month', now())`)
    .groupBy(safetyFlags.flagId, safetyFlags.level)
    .orderBy(desc(count()));
  return rows.map((r) => ({ ...r, n: Number(r.n) }));
}

export interface AuditRow {
  id: string;
  createdAt: Date;
  code: string;
  actorName: string | null;
  targetType: string | null;
}

/** The most recent audit entries. Admin only (audit:read). */
export async function recentAudit(limit: number): Promise<AuditRow[]> {
  return db
    .select({
      id: activityLog.id,
      createdAt: activityLog.createdAt,
      code: actionTypes.code,
      actorName: users.fullName,
      targetType: activityLog.targetType,
    })
    .from(activityLog)
    .innerJoin(actionTypes, eq(actionTypes.id, activityLog.actionTypeId))
    .leftJoin(users, eq(users.id, activityLog.userId))
    .orderBy(desc(activityLog.createdAt))
    .limit(limit);
}

/** Subscription counts by Stripe status and price id. Admin only. */
export async function subscriptionCounts(): Promise<{ status: string; priceId: string; n: number }[]> {
  const rows = await db
    .select({ status: subscriptions.status, priceId: subscriptions.priceId, n: count() })
    .from(subscriptions)
    .groupBy(subscriptions.status, subscriptions.priceId);
  return rows.map((r) => ({ ...r, n: Number(r.n) }));
}

/** Active programme items (exercises, taping, routine) per stage. */
export async function programmeItemsByStage(): Promise<
  { stage: number; exercises: number; taping: number; routine: number }[]
> {
  const toMap = (rows: { stage: number; n: number }[]) => new Map(rows.map((r) => [r.stage, Number(r.n)]));
  const [ex, tp, rt] = await Promise.all([
    db
      .select({ stage: exerciseStages.stage, n: count() })
      .from(exerciseStages)
      .innerJoin(exercises, eq(exercises.id, exerciseStages.exerciseId))
      .where(eq(exercises.isActive, true))
      .groupBy(exerciseStages.stage)
      .then(toMap),
    db
      .select({ stage: tapingTechniqueStages.stage, n: count() })
      .from(tapingTechniqueStages)
      .innerJoin(tapingTechniques, eq(tapingTechniques.id, tapingTechniqueStages.tapingTechniqueId))
      .where(eq(tapingTechniques.isActive, true))
      .groupBy(tapingTechniqueStages.stage)
      .then(toMap),
    db
      .select({ stage: routineItemStages.stage, n: count() })
      .from(routineItemStages)
      .innerJoin(routineItems, eq(routineItems.id, routineItemStages.routineItemId))
      .where(eq(routineItems.isActive, true))
      .groupBy(routineItemStages.stage)
      .then(toMap),
  ]);
  return [1, 2, 3, 4, 5].map((stage) => ({
    stage,
    exercises: ex.get(stage) ?? 0,
    taping: tp.get(stage) ?? 0,
    routine: rt.get(stage) ?? 0,
  }));
}

/** Distinct active programme items (an item used in several stages counts once). */
export async function programmeItemTotal(): Promise<number> {
  const counts = await Promise.all(
    [exercises, tapingTechniques, routineItems].map((table) =>
      db.select({ n: count() }).from(table).where(eq(table.isActive, true)),
    ),
  );
  return counts.reduce((sum, [row]) => sum + Number(row?.n ?? 0), 0);
}

/** Audit entries in the last 30 days, and staff accounts with two-step sign-in. Admin only. */
export async function complianceCounts(): Promise<{ audit30d: number; staff: number; staffMfa: number }> {
  const since = new Date(Date.now() - 30 * DAY_MS);
  const [[audit], [staff]] = await Promise.all([
    db.select({ n: count() }).from(activityLog).where(gte(activityLog.createdAt, since)),
    db
      .select({
        n: count(),
        mfa: sql<number>`count(*) filter (where ${users.mfaEnabled})`.mapWith(Number),
      })
      .from(users)
      .where(and(inArray(users.role, ["clinician", "admin", "superuser"]), isNull(users.deletedAt))),
  ]);
  return { audit30d: Number(audit?.n ?? 0), staff: Number(staff?.n ?? 0), staffMfa: staff?.mfa ?? 0 };
}
