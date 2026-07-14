import type { AnimationPlan } from "../types.js";
import { compileRenderScript, serializeRenderScript } from "../runtime/render-script.js";
import { fail, readJsonFile } from "./io.js";

const path = process.argv[2];
if (!path) fail("Usage: compile-render-script <animation-plan.json>");
try {
  const { value } = readJsonFile(path);
  process.stdout.write(serializeRenderScript(compileRenderScript(value as AnimationPlan)));
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}
