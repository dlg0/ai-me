import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { diffSemanticPlans, loadCandidatePlan, serializeSemanticDiff } from "../planner/semantic-diff.js";

const [setDirectory, leftArg, rightArg, outputPrefix] = process.argv.slice(2);
const invocationRoot = process.env.INIT_CWD ?? process.cwd();
try {
  if (!setDirectory || !leftArg || !rightArg || !outputPrefix) throw new Error("Usage: planner:diff <candidate-set-directory> <left-candidate-id-or-plan-path> <right-candidate-id-or-plan-path> <output-prefix>");
  const left = loadCandidatePlan(resolve(invocationRoot, setDirectory), leftArg);
  const right = loadCandidatePlan(resolve(invocationRoot, setDirectory), rightArg);
  const serialized = serializeSemanticDiff(diffSemanticPlans(left.plan, right.plan, { left: left.label, right: right.label }));
  const prefix = resolve(invocationRoot, outputPrefix);
  writeFileSync(`${prefix}.json`, serialized.json);
  writeFileSync(`${prefix}.md`, serialized.markdown);
  process.stdout.write(JSON.stringify({ json: `${prefix}.json`, markdown: `${prefix}.md` }) + "\n");
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
