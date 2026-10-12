import { db } from "../../src/db";
import { today } from "../../src/lib/assessment";

/**
 * Returns the signed-in patient's recovery stage (1-5), defaulting to 1 —
 * matching the legacy prototype's own fallback (`state.phase ? state.phase.stage
 * : 1`). No Clerk-to-DB sync webhook exists yet (see users.ts), so today this
 * will resolve to the default for everyone; it picks up the real value
 * automatically once that webhook and onboarding exist.
 */
export async function getPatientStage(clerkUserId: string): Promise<number> {
  const user = await db.query.users.findFirst({
    where: { clerkUserId },
    with: { patientProfile: true },
  });
  return user?.patientProfile?.phase ?? 1;
}

export interface DashboardData {
  patientProfileId: string;
  stageNum: number;
  daysInStage: number;
  todaySession: {
    tapingDone: boolean;
    exercisesDone: boolean;
    routineDone: boolean;
  } | null;
  recentPattern: ("full" | "part" | "none")[];
}

const PATTERN_DAYS = 21;

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Everything the dashboard home screen needs, in one round trip per table. */
export async function getDashboardData(clerkUserId: string): Promise<DashboardData> {
  const user = await db.query.users.findFirst({ where: { clerkUserId }, with: { patientProfile: true } });
  const patientProfileId = user?.patientProfile?.id;
  const stageNum = user?.patientProfile?.phase ?? 1;

  if (!patientProfileId) {
    return { patientProfileId: "", stageNum, daysInStage: 0, todaySession: null, recentPattern: Array(PATTERN_DAYS).fill("none") };
  }

  const [latestPhase, todayRow, recentRows] = await Promise.all([
    db.query.phaseAssignments.findFirst({ where: { patientProfileId }, orderBy: { assignedAt: "desc" } }),
    db.query.dailySessions.findFirst({ where: { patientProfileId, date: today() } }),
    db.query.dailySessions.findMany({
      where: { patientProfileId, date: { gte: isoDate(new Date(Date.now() - (PATTERN_DAYS - 1) * 86_400_000)) } },
    }),
  ]);

  const daysInStage = latestPhase ? Math.max(0, Math.round((Date.now() - new Date(latestPhase.assignedAt).getTime()) / 86_400_000)) : 0;

  const byDate = new Map(recentRows.map((r) => [r.date, r]));
  const recentPattern: DashboardData["recentPattern"] = [];
  for (let i = PATTERN_DAYS - 1; i >= 0; i--) {
    const d = isoDate(new Date(Date.now() - i * 86_400_000));
    const row = byDate.get(d);
    if (!row) recentPattern.push("none");
    else if (row.tapingDone && row.exercisesDone && row.routineDone) recentPattern.push("full");
    else if (row.tapingDone || row.exercisesDone || row.routineDone) recentPattern.push("part");
    else recentPattern.push("none");
  }

  return {
    patientProfileId,
    stageNum,
    daysInStage,
    todaySession: todayRow ? { tapingDone: todayRow.tapingDone, exercisesDone: todayRow.exercisesDone, routineDone: todayRow.routineDone } : null,
    recentPattern,
  };
}

export interface TodaySessionRow {
  tapingDone: boolean;
  exercisesDone: boolean;
  routineDone: boolean;
  completedExerciseIds: string[];
  observationNote: string | null;
}

/** Full detail of today's daily_sessions row, for the session runner page. */
export async function getTodaySessionRow(patientProfileId: string): Promise<TodaySessionRow | null> {
  const row = await db.query.dailySessions.findFirst({ where: { patientProfileId, date: today() } });
  if (!row) return null;
  return {
    tapingDone: row.tapingDone,
    exercisesDone: row.exercisesDone,
    routineDone: row.routineDone,
    completedExerciseIds: Array.isArray(row.completedExerciseIds) ? (row.completedExerciseIds as string[]) : [],
    observationNote: row.observationNote,
  };
}

export interface SessionLogEntry {
  date: string;
  tapingDone: boolean;
  exercisesDone: boolean;
  routineDone: boolean;
  observationNote: string | null;
}

/** Most-recent-first session history for the basic progress page (spec 7.1). */
export async function getSessionHistory(patientProfileId: string, limit = 60): Promise<SessionLogEntry[]> {
  const rows = await db.query.dailySessions.findMany({
    where: { patientProfileId },
    orderBy: { date: "desc" },
    limit,
  });
  return rows.map((r) => ({
    date: r.date,
    tapingDone: r.tapingDone,
    exercisesDone: r.exercisesDone,
    routineDone: r.routineDone,
    observationNote: r.observationNote,
  }));
}

export interface PhaseHistoryEntry {
  stage: number;
  confidence: string;
  needsReview: boolean;
  /** Message keys (or { key, values }) under assessment.reasons, or legacy English sentences. */
  reasons: unknown[];
  assignedAt: Date;
}

/** Most-recent-first phase assignment history (spec 5.3/7.1). */
export async function getPhaseHistory(patientProfileId: string): Promise<PhaseHistoryEntry[]> {
  const rows = await db.query.phaseAssignments.findMany({
    where: { patientProfileId },
    orderBy: { assignedAt: "desc" },
  });
  return rows.map((r) => ({
    stage: r.stage,
    confidence: r.confidence,
    needsReview: r.needsReview,
    reasons: Array.isArray(r.reasons) ? (r.reasons as unknown[]) : [],
    assignedAt: r.assignedAt,
  }));
}

export interface StageContent {
  taping: { id: string; slug: string; name: string; instructions: string; details: unknown }[];
  exercises: { id: string; slug: string; name: string; instructions: string; details: unknown }[];
  routine: { id: string; slug: string; name: string; instructions: string; details: unknown }[];
}

/** Content library rows tagged for the given stage (spec 6.1), sorted for display. */
export async function getContentForStage(stage: number): Promise<StageContent> {
  const [tapingRows, exerciseRows, routineRows] = await Promise.all([
    db.query.tapingTechniqueStages.findMany({ where: { stage }, with: { tapingTechnique: true } }),
    db.query.exerciseStages.findMany({ where: { stage }, with: { exercise: true } }),
    db.query.routineItemStages.findMany({ where: { stage }, with: { routineItem: true } }),
  ]);

  const byOrder = <T extends { sortOrder: number }>(a: T, b: T) => a.sortOrder - b.sortOrder;
  const defined = <T,>(v: T | null | undefined): v is T => v != null;

  return {
    taping: tapingRows.map((r) => r.tapingTechnique).filter(defined).sort(byOrder),
    exercises: exerciseRows.map((r) => r.exercise).filter(defined).sort(byOrder),
    routine: routineRows.map((r) => r.routineItem).filter(defined).sort(byOrder),
  };
}
