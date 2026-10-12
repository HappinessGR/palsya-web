import { articles, type Article } from "./content";

/**
 * Recovery-stage data backing the in-app "Today" dashboard, ported from the
 * legacy prototype's assets/js/content.js (STAGES_EN). Only the fields the
 * dashboard's empty state needs are kept — `window`/`body`/`focus`/`avoid`/
 * `tapeMode` belong to a future stage-guide feature, not this page.
 */
export type Stage = {
  n: 1 | 2 | 3 | 4 | 5;
  /** Design-token suffix: --p1..--p5 / .badge-p1..-p5 */
  colour: "p1" | "p2" | "p3" | "p4" | "p5";
  /** Exercise-portion minutes for this stage (matches legacy C.stage(n).minutes) */
  minutes: number;
  /** Ids of programme.stages.<n>.focus.* / .avoid.* entries, in display order. */
  focus: string[];
  avoid: string[];
};

// Text (name, short, window, body, focus, avoid, tapeMode) lives in
// locales/<locale>/programme.json under stages.<n>.
export const stages: Stage[] = [
  { n: 1, colour: "p1", minutes: 9, focus: ["f1", "f2", "f3", "f4"], avoid: ["a1", "a2", "a3", "a4"] },
  { n: 2, colour: "p2", minutes: 12, focus: ["f1", "f2", "f3", "f4"], avoid: ["a1", "a2", "a3"] },
  { n: 3, colour: "p3", minutes: 16, focus: ["f1", "f2", "f3", "f4"], avoid: ["a1", "a2", "a3"] },
  { n: 4, colour: "p4", minutes: 15, focus: ["f1", "f2", "f3", "f4"], avoid: ["a1", "a2"] },
  { n: 5, colour: "p5", minutes: 8, focus: ["f1", "f2", "f3", "f4"], avoid: ["a1"] },
];

export function stage(n: number): Stage {
  const clamped = Math.min(5, Math.max(1, n)) as Stage["n"];
  return stages[clamped - 1];
}

/**
 * Derived from legacy C.tapingForStage(n)[0].name — the first taping
 * technique (of TAPING_EN) whose `.stages` list includes stage `n`, falling
 * back to "Resting support" when none does (legacy's own fallback for
 * stage 5). Kept as a lookup rather than porting the full taping library,
 * since nothing else needs the per-technique detail yet.
 */
const TAPING_NAME_BY_STAGE: Record<number, string> = {
  1: "restingSupport",
  2: "restingSupport",
  3: "movementAssist",
  4: "directionalGuide",
  5: "restingSupport",
};

/** Message key under programme.taping.* for the stage's first taping technique. */
export function tapingKeyForStage(n: number): string {
  return TAPING_NAME_BY_STAGE[n] ?? TAPING_NAME_BY_STAGE[1];
}

/**
 * Derived from legacy C.exercisesForStage(n).length (EXERCISES_EN filtered
 * by `.stages.indexOf(n) >= 0`). Same rationale as above — a precomputed
 * count, not the exercise content itself.
 */
const EXERCISE_COUNT_BY_STAGE: Record<number, number> = {
  1: 1,
  2: 5,
  3: 8,
  4: 8,
  5: 6,
};

export function exerciseCountForStage(n: number): number {
  return EXERCISE_COUNT_BY_STAGE[n] ?? EXERCISE_COUNT_BY_STAGE[1];
}

/** Constants from legacy C.planFor() — taping/routine minutes don't vary by stage. */
export const TAPING_MINUTES = 4;
export const ROUTINE_MINUTES = 6;

const LIBRARY_ORDER_BY_STAGE: Record<number, string[]> = {
  1: ["daily-routine", "what-is-pfp", "facial-taping-guide"],
  2: ["facial-exercises-guide", "facial-taping-guide", "stages-of-recovery"],
  3: ["stages-of-recovery", "facial-exercises-guide", "research-evidence"],
  4: ["facial-exercises-guide", "research-evidence", "daily-routine"],
  5: ["research-evidence", "daily-routine", "faq"],
};

/** Ported from legacy libraryPicks(stage) in views-app.js. */
export function libraryPicks(n: number): Article[] {
  const order = LIBRARY_ORDER_BY_STAGE[n] ?? ["what-is-pfp"];
  return order
    .map((slug) => articles.find((a) => a.slug === slug))
    .filter((a): a is Article => a !== undefined);
}
