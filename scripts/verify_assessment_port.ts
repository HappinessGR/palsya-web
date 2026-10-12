// Regression check for the quiz.js -> assessment.ts port (Phase 1 M3): the
// legacy prototype's demo answers ("a Stage 3 presentation at ~6 weeks")
// must still resolve to Stage 3 / high confidence after the port. Run with
// `npx tsx scripts/verify_assessment_port.ts`. No test framework is added
// for this single check — tsx is already a devDependency.
import { assignPhase, demoAnswers, isBlocked } from "../src/lib/assessment";

const result = assignPhase(demoAnswers());

const checks: [string, boolean][] = [
  ["stage === 3", result.stage === 3],
  ["confidence === 'high'", result.confidence === "high"],
  ["needsReview === false", result.needsReview === false],
  ["not blocked", !isBlocked(result.flags)],
  ["no safety flags raised", result.flags.length === 0],
];

let failed = false;
for (const [label, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"} - ${label}`);
  if (!ok) failed = true;
}

if (failed) {
  console.error("\nAssessment port regression check FAILED", result);
  process.exit(1);
}
console.log("\nAssessment port regression check passed.", {
  stage: result.stage,
  confidence: result.confidence,
  days: result.days,
});
