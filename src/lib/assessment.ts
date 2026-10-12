/**
 * Assessment quiz + phase-assignment algorithm (spec 5.2 / 5.3), ported
 * almost verbatim from the legacy prototype's assets/js/quiz.js. Same
 * question ids, section names, flag ids, and algorithm steps, so behavior
 * doesn't drift from the already-validated design. This module is
 * framework-agnostic (no Next.js/DB imports) so it can be unit tested and
 * called from a server action.
 *
 * Structure only: every user-facing string lives in
 * locales/<locale>/assessment.json, keyed by the ids below —
 *   sections.<sectionId>
 *   questions.<qid>.{q,help}          (help only when `help: true`)
 *   questions.<qid>.options.<v>.{t,d} (d only when `d: true`)
 *   optionSets.<optionSet>.<v>.{t,d}  (questions with `optionSet`)
 *   flags.<flagId>.{title,body}       (ICU values in `flag.values`)
 *   reasons.<reasonId>                (ICU values in `reason.values`)
 *   reviewWhy.<reviewWhyId>
 * Use the *Key() helpers below to build those paths.
 */

export type QuestionType = "date" | "single" | "multi";

export type SectionId = "about" | "medical" | "eye" | "moves" | "linked" | "other" | "daily";

export interface QuestionOption {
  v: string;
  /** Has a description line at <option key>.d */
  d?: boolean;
  urgent?: boolean;
  exclusive?: boolean;
}

export interface Question {
  id: string;
  type: QuestionType;
  section: SectionId;
  /** Has help text at questions.<id>.help */
  help?: boolean;
  /** Options text comes from optionSets.<optionSet> instead of questions.<id>.options */
  optionSet?: "move";
  required?: boolean;
  options?: QuestionOption[];
  showIf?: (answers: Answers) => boolean;
}

export type AnswerValue = string | string[] | undefined;
export type Answers = Record<string, AnswerValue>;

const MOVE: QuestionOption[] = [
  { v: "none", d: true },
  { v: "flicker", d: true },
  { v: "partial", d: true },
  { v: "near", d: true },
];

export const QUESTIONS: Question[] = [
  {
    id: "onsetDate",
    type: "date",
    section: "about",
    help: true,
    required: true,
  },
  {
    id: "diagnosis",
    type: "single",
    section: "about",
    help: true,
    options: [
      { v: "bells", d: true },
      { v: "ramsay", d: true },
      { v: "surgical", d: true },
      { v: "trauma", d: true },
      { v: "lyme" },
      { v: "other", d: true },
      { v: "none" },
    ],
    required: true,
  },
  {
    id: "side",
    type: "single",
    section: "about",
    options: [
      { v: "left" },
      { v: "right" },
      { v: "both" },
    ],
    required: true,
  },
  {
    id: "progression",
    type: "single",
    section: "about",
    help: true,
    options: [
      { v: "sudden", d: true },
      { v: "days", d: true },
      { v: "gradual", d: true },
      { v: "recurring", d: true },
    ],
    required: true,
  },
  {
    id: "medical",
    type: "single",
    section: "medical",
    options: [
      { v: "steroids" },
      { v: "noSteroids" },
      { v: "waiting" },
      { v: "no" },
    ],
    required: true,
  },
  {
    id: "eyeClosure",
    type: "single",
    section: "eye",
    help: true,
    options: [
      { v: "full" },
      { v: "almost" },
      { v: "partial" },
      { v: "none" },
    ],
    required: true,
  },
  {
    id: "eyeSymptoms",
    type: "multi",
    section: "eye",
    help: true,
    options: [
      { v: "pain", urgent: true },
      { v: "redness", urgent: true },
      { v: "vision", urgent: true },
      { v: "dryness" },
      { v: "watering" },
      { v: "none", exclusive: true },
    ],
    required: true,
  },
  {
    id: "eyeCare",
    type: "multi",
    section: "eye",
    showIf: (a) => !!a.eyeClosure && a.eyeClosure !== "full",
    options: [
      { v: "drops" },
      { v: "ointment" },
      { v: "tape" },
      { v: "chamber" },
      { v: "glasses" },
      { v: "nothing", exclusive: true },
    ],
  },
  {
    id: "moveBrow",
    type: "single",
    section: "moves",
    help: true,
    optionSet: "move",
    options: MOVE,
    required: true,
  },
  {
    id: "moveEye",
    type: "single",
    section: "moves",
    optionSet: "move",
    options: MOVE,
    required: true,
  },
  {
    id: "moveMouth",
    type: "single",
    section: "moves",
    optionSet: "move",
    options: MOVE,
    required: true,
  },
  {
    id: "synkinesis",
    type: "single",
    section: "linked",
    help: true,
    options: [
      { v: "none" },
      { v: "occasional" },
      { v: "frequent" },
      { v: "always" },
      { v: "unsure" },
    ],
    required: true,
  },
  {
    id: "tightness",
    type: "single",
    section: "linked",
    options: [
      { v: "none" },
      { v: "mild" },
      { v: "moderate" },
      { v: "severe" },
    ],
    required: true,
  },
  {
    id: "otherSymptoms",
    type: "multi",
    section: "other",
    options: [
      { v: "rash", urgent: true },
      { v: "hearing" },
      { v: "earPain" },
      { v: "taste" },
      { v: "tinnitus" },
      { v: "limb", urgent: true },
      { v: "none", exclusive: true },
    ],
    required: true,
  },
  {
    id: "impact",
    type: "multi",
    section: "daily",
    help: true,
    options: [
      { v: "drinking" },
      { v: "eating" },
      { v: "speaking" },
      { v: "eye" },
      { v: "sleep" },
      { v: "social" },
      { v: "none", exclusive: true },
    ],
  },
  {
    id: "treatment",
    type: "multi",
    section: "daily",
    options: [
      { v: "physio" },
      { v: "exercises" },
      { v: "taping" },
      { v: "estim" },
      { v: "gum" },
      { v: "none", exclusive: true },
    ],
  },
  {
    id: "perDay",
    type: "single",
    section: "daily",
    help: true,
    options: [
      { v: "1", d: true },
      { v: "2", d: true },
    ],
    required: true,
  },
];

/** Message key (in the "assessment" namespace) of an option's text; append ".t" / ".d". */
export function optionKey(q: Question, v: string): string {
  return q.optionSet ? "optionSets." + q.optionSet + "." + v : "questions." + q.id + ".options." + v;
}

export function visibleQuestions(answers: Answers): Question[] {
  return QUESTIONS.filter((q) => !q.showIf || q.showIf(answers));
}

export interface Section {
  /** Message key: sections.<id> */
  id: SectionId;
  qs: Question[];
}

export function sections(answers: Answers): Section[] {
  const out: Section[] = [];
  const seen: Record<string, Section> = {};
  for (const q of visibleQuestions(answers)) {
    if (!seen[q.section]) {
      seen[q.section] = { id: q.section, qs: [] };
      out.push(seen[q.section]);
    }
    seen[q.section].qs.push(q);
  }
  return out;
}

export function isAnswered(q: Question, answers: Answers): boolean {
  const v = answers[q.id];
  if (q.type === "multi") return Array.isArray(v) && v.length > 0;
  return v !== undefined && v !== null && v !== "";
}

// --- date helpers (plain "YYYY-MM-DD" strings, matching the legacy P.today()/P.daysBetween) ---

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function daysBetween(from: string, to: string): number {
  const a = new Date(`${from}T00:00:00Z`).getTime();
  const b = new Date(`${to}T00:00:00Z`).getTime();
  return Math.round((b - a) / 86_400_000);
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

// --- safety flags (spec 5.2, Q.flags) ---

export type SafetyFlagLevel = "urgent" | "wait" | "review" | "action";

export type SafetyFlagId =
  | "limb"
  | "eye"
  | "rash"
  | "undiagnosed"
  | "progressive"
  | "bilateral"
  | "tooEarly"
  | "late"
  | "noEyeCare"
  | "estim"
  | "gum";

export interface SafetyFlag {
  level: SafetyFlagLevel;
  /** Text at flags.<id>.{title,body} */
  id: SafetyFlagId;
  /** ICU values for flags.<id>.body */
  values?: Record<string, number>;
}

export function computeSafetyFlags(a: Answers): SafetyFlag[] {
  const f: SafetyFlag[] = [];
  const eye = (a.eyeSymptoms as string[] | undefined) ?? [];
  const other = (a.otherSymptoms as string[] | undefined) ?? [];
  const eyeCare = (a.eyeCare as string[] | undefined) ?? [];
  const treatment = (a.treatment as string[] | undefined) ?? [];
  const onsetDate = a.onsetDate as string | undefined;
  const days = onsetDate ? daysBetween(onsetDate, today()) : null;

  if (other.includes("limb")) {
    f.push({ level: "urgent", id: "limb" });
  }
  if (eye.includes("pain") || eye.includes("redness") || eye.includes("vision")) {
    f.push({ level: "urgent", id: "eye" });
  }
  if (other.includes("rash") && a.diagnosis !== "ramsay") {
    f.push({ level: "urgent", id: "rash" });
  }
  if (a.diagnosis === "none" || a.medical === "no") {
    f.push({ level: "urgent", id: "undiagnosed" });
  }
  if (a.progression === "gradual") {
    f.push({ level: "urgent", id: "progressive" });
  }
  if (a.side === "both") {
    f.push({ level: "urgent", id: "bilateral" });
  }
  if (days !== null && days < 5) {
    f.push({ level: "wait", id: "tooEarly", values: { days } });
  }
  if (days !== null && days > 90) {
    f.push({ level: "review", id: "late", values: { days } });
  }
  if (a.eyeClosure && a.eyeClosure !== "full" && eyeCare.includes("nothing")) {
    f.push({ level: "action", id: "noEyeCare" });
  }
  if (treatment.includes("estim")) {
    f.push({ level: "action", id: "estim" });
  }
  if (treatment.includes("gum")) {
    f.push({ level: "action", id: "gum" });
  }
  return f;
}

export function isBlocked(flags: SafetyFlag[]): boolean {
  return flags.some((f) => f.level === "urgent" || f.level === "wait");
}

/** Message key (in "assessment") of a flag's text; append ".title" / ".body" (body takes `flag.values`). */
export function flagKey(flag: Pick<SafetyFlag, "id">): string {
  return "flags." + flag.id;
}

// --- phase assignment (spec 5.3, Q.assign) ---

const RANK: Record<string, number> = { none: 0, flicker: 1, partial: 2, near: 3 };

export type ReasonId =
  | "noMovement"
  | "minimalMovement"
  | "notIsolated"
  | "nearNormal"
  | "synkinesisRaised"
  | "synkinesisHeldBack"
  | "severeTightness"
  | "eyeProtection"
  | "maintenance"
  | "slowRecovery"
  | "timeHoldBack"
  | "timeEarliest";

/**
 * A placement reason, stored as-is in phase_assignments.reasons: either a
 * bare key (text at reasons.<key>) or { key, values } for ICU values.
 */
export type Reason = ReasonId | { key: ReasonId; values: Record<string, string | number> };

/** Clause at reviewWhy.<id>, joined into onboarding.phase.reviewNotice. */
export type ReviewWhyId = "lowConfidence" | "lateOnset" | "surgeryOrInjury" | "otherDiagnosis";

/** Message key (in "assessment") of a reason; render with `reasonValues(reason)`. */
export function reasonKey(reason: Reason): string {
  return "reasons." + (typeof reason === "string" ? reason : reason.key);
}

export function reasonValues(reason: Reason): Record<string, string | number> | undefined {
  return typeof reason === "string" ? undefined : reason.values;
}

/** Message key (in "assessment") of a review clause. */
export function reviewWhyKey(id: ReviewWhyId): string {
  return "reviewWhy." + id;
}

export interface PhaseAssignment {
  stage: 1 | 2 | 3 | 4 | 5;
  confidence: "high" | "medium" | "low";
  needsReview: boolean;
  reasons: Reason[];
  reviewWhy: ReviewWhyId[];
  flags: SafetyFlag[];
  days: number;
  conflicts: number;
  assignedAt: string;
}

export function assignPhase(a: Answers): PhaseAssignment {
  const reasons: Reason[] = [];
  const onsetDate = a.onsetDate as string | undefined;
  const days = onsetDate ? daysBetween(onsetDate, today()) : 30;

  // Step 1 — time filter: an outer bound, never the decider
  const timeMax = days < 7 ? 1 : days < 14 ? 2 : days < 42 ? 3 : days < 120 ? 4 : 5;
  const timeMin = days > 270 ? 3 : days > 120 ? 2 : 1;

  // Step 2 — functional placement
  const mv = [RANK[(a.moveBrow as string) ?? ""] ?? 0, RANK[(a.moveEye as string) ?? ""] ?? 0, RANK[(a.moveMouth as string) ?? ""] ?? 0];
  const best = Math.max(...mv);
  const worst = Math.min(...mv);
  const avg = (mv[0] + mv[1] + mv[2]) / 3;

  let stage: number;
  if (best === 0) {
    stage = 1;
    reasons.push("noMovement");
  } else if (best === 1 || avg < 1.2) {
    stage = 2;
    reasons.push("minimalMovement");
  } else if (avg < 2.4) {
    stage = 3;
    reasons.push("notIsolated");
  } else {
    stage = 4;
    reasons.push("nearNormal");
  }

  // Step 3 — modifiers
  const syn = a.synkinesis as string | undefined;
  if (syn === "frequent" || syn === "always") {
    if (stage < 3) {
      stage = 3;
      reasons.push("synkinesisRaised");
    } else if (stage > 3) {
      stage = 3;
      reasons.push("synkinesisHeldBack");
    }
  }
  if (a.tightness === "severe" && stage < 3) {
    stage = 3;
    reasons.push("severeTightness");
  }
  if (a.eyeClosure === "none" && stage > 2) {
    reasons.push("eyeProtection");
  }
  if (days > 270 && avg >= 2.6 && (syn === "none" || syn === "occasional") && a.tightness !== "severe") {
    stage = 5;
    reasons.push("maintenance");
  }
  if (a.diagnosis === "ramsay" || a.diagnosis === "surgical" || a.diagnosis === "trauma") {
    reasons.push({ key: "slowRecovery", values: { cause: a.diagnosis as string } });
  }

  // Time bounds applied last
  const beforeBound = stage;
  stage = clamp(stage, timeMin, timeMax);
  if (stage !== beforeBound) {
    reasons.push(
      stage < beforeBound
        ? { key: "timeHoldBack", values: { suggested: beforeBound, days } }
        : { key: "timeEarliest", values: { stage, days } },
    );
  }

  // Step 4 — confidence
  let conflicts = 0;
  if (syn === "unsure") conflicts++;
  if (best - worst >= 3) conflicts++; // very uneven regions
  if (best >= 2 && days < 14) conflicts++; // faster than typical
  if (best === 0 && days > 90) conflicts++; // slower than typical
  if ((syn === "frequent" || syn === "always") && best <= 1) conflicts++;
  if (a.progression === "recurring") conflicts++;
  if (a.diagnosis === "other" || a.diagnosis === "lyme") conflicts++;

  const confidence = conflicts === 0 ? "high" : conflicts === 1 ? "medium" : "low";

  // Step 5 — clinician review
  const flags = computeSafetyFlags(a);
  const needsReview =
    confidence === "low" ||
    flags.some((f) => f.level === "review") ||
    days > 90 ||
    a.diagnosis === "surgical" ||
    a.diagnosis === "trauma" ||
    a.diagnosis === "other";

  const reviewWhy: ReviewWhyId[] = [];
  if (confidence === "low") reviewWhy.push("lowConfidence");
  if (days > 90) reviewWhy.push("lateOnset");
  if (a.diagnosis === "surgical" || a.diagnosis === "trauma") reviewWhy.push("surgeryOrInjury");
  if (a.diagnosis === "other") reviewWhy.push("otherDiagnosis");

  return {
    stage: stage as PhaseAssignment["stage"],
    confidence,
    needsReview,
    reasons,
    reviewWhy,
    flags,
    days,
    conflicts,
    assignedAt: today(),
  };
}

/** A Stage 3 presentation at ~6 weeks — used as a regression fixture in tests. */
export function demoAnswers(): Answers {
  const onset = new Date();
  onset.setUTCDate(onset.getUTCDate() - 46);
  return {
    onsetDate: onset.toISOString().slice(0, 10),
    diagnosis: "bells",
    side: "left",
    progression: "sudden",
    medical: "steroids",
    eyeClosure: "almost",
    eyeSymptoms: ["dryness"],
    eyeCare: ["drops", "ointment", "glasses"],
    moveBrow: "flicker",
    moveEye: "partial",
    moveMouth: "partial",
    synkinesis: "occasional",
    tightness: "mild",
    otherSymptoms: ["taste"],
    impact: ["drinking", "social"],
    treatment: ["exercises"],
    perDay: "2",
  };
}
