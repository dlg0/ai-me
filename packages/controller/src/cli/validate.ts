import { validateAnimationPlan } from "../planner/validatePlan.js";
import { fail, printWarnings, readJsonFile } from "./io.js";

const planPath = process.argv[2];
if (!planPath) fail("Usage: npm run validate -- <path-to-animation-plan.json>", 2);

try {
  const { absolutePath, value } = readJsonFile(planPath);
  const result = validateAnimationPlan(value);

  if (!result.valid) {
    console.error("Animation plan is invalid:");
    for (const error of result.errors) console.error(`- ${error}`);
    process.exit(1);
  }

  printWarnings(result.warnings);
  console.log(`OK: ${absolutePath}`);
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}
