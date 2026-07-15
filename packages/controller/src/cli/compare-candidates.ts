import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createLocalSvgComparison } from "../local-svg/comparison.js";

const [setArg, leftId, rightId, rigArg, outputArg] = process.argv.slice(2);
const root = process.env.INIT_CWD ?? process.cwd();
try {
  if (!setArg || !leftId || !rightId || !rigArg || !outputArg) throw new Error("Usage: planner:compare <candidate-set-dir> <left-id> <right-id> <rig-profile.json> <output-root>");
  const result = createLocalSvgComparison({ candidateSetDirectory: resolve(root, setArg), candidateIds: [leftId, rightId], rigProfileSource: readFileSync(resolve(root, rigArg)), outputRoot: resolve(root, outputArg) });
  process.stdout.write(JSON.stringify({ schemaVersion: "local-svg-comparison-summary.v1", comparisonId: result.comparisonId, comparisonDirectory: result.comparisonDirectory, status: result.manifest.status, comparisonPage: resolve(result.comparisonDirectory, "comparison.html"), reviewTemplate: resolve(result.comparisonDirectory, "review-record.json") }) + "\n");
} catch (error) { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; }
