import type { AnimationPlan } from "../types.js";
import { validateAnimationPlan } from "../planner/validatePlan.js";
import { flattenTimeline } from "../runtime/timeline.js";
import { fail, printWarnings, readJsonFile } from "./io.js";

const planPath = process.argv[2];
if (!planPath) fail("Usage: npm run dry-run -- <path-to-animation-plan.json>", 2);

try {
  const { value } = readJsonFile(planPath);
  const result = validateAnimationPlan(value);
  if (!result.valid) {
    console.error("Animation plan is invalid:");
    for (const error of result.errors) console.error(`- ${error}`);
    process.exit(1);
  }

  printWarnings(result.warnings);
  const plan = value as AnimationPlan;
  console.log(`Dry run: ${plan.title}`);
  console.log(`Duration: ${plan.durationMs} ms`);
  console.log(`Rig: ${plan.targetRig}`);
  console.log(`Safety mode: ${plan.safetyMode}`);
  console.log("");

  for (const event of flattenTimeline(plan)) {
    const duration = event.durationMs !== undefined ? `${event.durationMs}ms` : "unspecified";
    const end = event.durationMs !== undefined ? `${event.startMs + event.durationMs}ms` : "—";
    const label = event.type === "state"
      ? event.state
      : event.type === "gesture"
        ? event.gesture
        : event.type === "speech"
          ? `${event.speechAct}: ${event.text}`
          : event.text;

    console.log(
      `${event.startMs.toString().padStart(6)}ms  ` +
      `${end.padStart(7)}  ` +
      `${event.type.padEnd(8)}  ` +
      `${duration.padEnd(11)}  ` +
      label
    );
  }
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}
