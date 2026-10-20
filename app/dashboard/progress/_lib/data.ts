import { cache } from "react";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "../../../../src/db";
import { daysBetween, today } from "../../../../src/lib/assessment";

/**
 * Everything the progress, report, milestones and session-log pages read.
 * All of it is the patient's own rows — daily_sessions and phase_assignments.
 * There is no scans table yet, so nothing here carries a symmetry score.
 */
export type DayState = "full" | "part" | "none";

export interface SessionRow {
  date: string;
  tapingDone: boolean;
  exercisesDone: boolean;
  routineDone: boolean;
  exerciseCount: number;
  minutes: number | null;
  comfort: "good" | "tired" | "rushed" | null;
  note: string | null;
  state: DayState;
}

export interface PhaseRow {
  stage: number;
  source: "assessment" | "clinician_override" | "progress_adjustment";
  reasons: unknown[];
  assignedAt: Date;
}

export interface ProgressData {
  name: string;
  stageNum: number;
  onsetDate: string | null;
  /** Oldest first. */
  sessions: SessionRow[];
  /** Oldest first. */
  phases: PhaseRow[];
}

export function dayState(r: { tapingDone: boolean; exercisesDone: boolean; routineDone: boolean }): DayState {
  if (r.tapingDone && r.exercisesDone && r.routineDone) return "full";
  if (r.tapingDone || r.exercisesDone || r.routineDone) return "part";
  return "none";
}

export const getProgressData = cache(async (): Promise<ProgressData> => {
  const user = await currentUser();
  const fallbackName = [user?.firstName, user?.lastName].filter(Boolean).join(" ");
  const empty: ProgressData = { name: fallbackName, stageNum: 1, onsetDate: null, sessions: [], phases: [] };
  if (!user) return empty;

  const row = await db.query.users.findFirst({ where: { clerkUserId: user.id }, with: { patientProfile: true } });
  const profile = row?.patientProfile;
  if (!profile) return { ...empty, name: row?.fullName || fallbackName };

  const [sessionRows, phaseRows] = await Promise.all([
    db.query.dailySessions.findMany({ where: { patientProfileId: profile.id }, orderBy: { date: "asc" } }),
    db.query.phaseAssignments.findMany({ where: { patientProfileId: profile.id }, orderBy: { assignedAt: "asc" } }),
  ]);

  return {
    name: row?.fullName || fallbackName,
    stageNum: profile.phase ?? 1,
    onsetDate: profile.onsetDate ?? null,
    sessions: sessionRows.map((r) => ({
      date: r.date,
      tapingDone: r.tapingDone,
      exercisesDone: r.exercisesDone,
      routineDone: r.routineDone,
      exerciseCount: Array.isArray(r.completedExerciseIds) ? r.completedExerciseIds.length : 0,
      minutes: r.minutesSpent ?? null,
      comfort: r.comfortRating ?? null,
      note: r.observationNote?.trim() || null,
      state: dayState(r),
    })),
    phases: phaseRows.map((p) => ({
      stage: Math.min(5, Math.max(1, p.stage)),
      source: p.source,
      reasons: Array.isArray(p.reasons) ? (p.reasons as unknown[]) : [],
      assignedAt: p.assignedAt,
    })),
  };
});

export function isoDaysAgo(n: number): string {
  return new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);
}

/** The last `days` days, oldest first, each with its session state (legacy P.store.recentPattern). */
export function recentPattern(sessions: SessionRow[], days: number): { date: string; state: DayState }[] {
  const byDate = new Map(sessions.map((s) => [s.date, s.state]));
  const out: { date: string; state: DayState }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = isoDaysAgo(i);
    out.push({ date, state: byDate.get(date) ?? "none" });
  }
  return out;
}

export function daysSince(iso: string | null): number | null {
  return iso ? daysBetween(iso, today()) : null;
}

export function daysInStage(phases: PhaseRow[]): number {
  const last = phases.at(-1);
  return last ? Math.max(0, Math.round((Date.now() - last.assignedAt.getTime()) / 86_400_000)) : 0;
}

/** Sessions that carry a written observation — "things you noticed". Newest first. */
export function observations(sessions: SessionRow[]): { date: string; text: string }[] {
  return sessions
    .filter((s): s is SessionRow & { note: string } => s.note != null)
    .map((s) => ({ date: s.date, text: s.note }))
    .reverse();
}

/** UTC calendar date → Date at midnight UTC, for formatting with timeZone: "UTC". */
export function utcDate(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`);
}
