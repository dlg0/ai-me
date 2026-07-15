import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createLocalSvgRun } from "../local-svg/run-artifacts.js";
import { fail } from "./io.js";

const [planPath, profilePath, outputRoot = "../../runs"] = process.argv.slice(2);
if (!planPath || !profilePath) fail("Usage: create-local-svg-run <plan.json> <rig-profile.json> [runs-directory]");
try {
  const result = createLocalSvgRun({
    outputRoot,
    planSource: readFileSync(resolve(planPath), "utf8"),
    rigProfileSource: readFileSync(resolve(profilePath), "utf8"),
    reviewNotesTemplate: readFileSync(resolve("../../templates/review-notes.md"), "utf8")
  });
  console.log(`Local SVG ${result.outcome} run written to ${result.runDirectory}`);
} catch (error) { fail(error instanceof Error ? error.message : String(error)); }
