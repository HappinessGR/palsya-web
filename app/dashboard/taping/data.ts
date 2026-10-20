import { db } from "../../../src/db";

/**
 * Content-library rows for the three reference screens (taping, exercises,
 * routine). Unlike getContentForStage(), these list every active item with
 * the stages it belongs to — the prototype shows techniques and exercises
 * from other stages too, dimmed, so the patient can see where this goes.
 * The `details` jsonb was seeded from the prototype's content.js.
 */

export interface TapingStrip {
  where: string;
  from: string;
  to: string;
  note: string;
}

export interface TapingTechnique {
  slug: string;
  name: string;
  stages: number[];
  goal: string;
  wear: string;
  tension: string;
  strips: TapingStrip[];
}

export interface ExerciseItem {
  slug: string;
  name: string;
  stages: number[];
  region: string;
  reps: number;
  hold: number;
  rest: number;
  why: string;
  /** Trusted seed content; may contain <b> markup, as in the prototype. */
  steps: string[];
  watch: string;
}

export interface RoutineItem {
  slug: string;
  name: string;
  stages: number[];
  icon: string;
  when: string;
  body: string;
  items: string[];
}

type Details = Record<string, unknown>;

const str = (d: Details, k: string): string => (typeof d[k] === "string" ? (d[k] as string) : "");
const num = (d: Details, k: string): number => (typeof d[k] === "number" ? (d[k] as number) : 0);
const arr = <T,>(d: Details, k: string): T[] => (Array.isArray(d[k]) ? (d[k] as T[]) : []);
const stagesOf = (rows: { stage: number }[]) => rows.map((r) => r.stage).sort((a, b) => a - b);

export async function getAllTaping(): Promise<TapingTechnique[]> {
  const rows = await db.query.tapingTechniques.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    with: { stages: true },
  });
  return rows.map((r) => {
    const d = (r.details ?? {}) as Details;
    return {
      slug: r.slug,
      name: r.name,
      stages: stagesOf(r.stages),
      goal: str(d, "goal") || r.instructions,
      wear: str(d, "wear"),
      tension: str(d, "tension"),
      strips: arr<TapingStrip>(d, "strips"),
    };
  });
}

export async function getAllExercises(): Promise<ExerciseItem[]> {
  const rows = await db.query.exercises.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    with: { stages: true },
  });
  return rows.map((r) => {
    const d = (r.details ?? {}) as Details;
    return {
      slug: r.slug,
      name: r.name,
      stages: stagesOf(r.stages),
      region: str(d, "region"),
      reps: num(d, "reps"),
      hold: num(d, "hold"),
      rest: num(d, "rest"),
      why: str(d, "why"),
      steps: arr<string>(d, "steps"),
      watch: str(d, "watch"),
    };
  });
}

export async function getAllRoutine(): Promise<RoutineItem[]> {
  const rows = await db.query.routineItems.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    with: { stages: true },
  });
  return rows.map((r) => {
    const d = (r.details ?? {}) as Details;
    return {
      slug: r.slug,
      name: r.name,
      stages: stagesOf(r.stages),
      icon: str(d, "icon") || "info",
      when: str(d, "when"),
      body: str(d, "body") || r.instructions,
      items: arr<string>(d, "items"),
    };
  });
}
