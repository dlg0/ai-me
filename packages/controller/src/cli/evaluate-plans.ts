import { dirname, isAbsolute, relative, resolve } from "node:path";
import { realpathSync } from "node:fs";
import { assertScenarioCorpus, evaluateCorpus, serializeCorpusEvaluation } from "../planner/evaluate-corpus.js";
import { fail, readJsonFile } from "./io.js";

const corpusPath = process.argv[2];
const manifestPath = process.argv[3];
if (!corpusPath || !manifestPath) fail("Usage: evaluate-plans <corpus.json> <candidate-manifest.json>");

try {
  const corpus = readJsonFile(corpusPath).value;
  const manifestFile = readJsonFile(manifestPath);
  assertScenarioCorpus(corpus);
  const manifest = manifestFile.value as { schemaVersion?: unknown; candidates?: unknown };
  if (manifest.schemaVersion !== "animation-plan-candidates.v1" || !manifest.candidates || typeof manifest.candidates !== "object" || Array.isArray(manifest.candidates))
    throw new Error("Candidate manifest must be animation-plan-candidates.v1 with a candidates object");
  const manifestKeys = Object.keys(manifest as object).sort();
  if (manifestKeys.length !== 2 || manifestKeys[0] !== "candidates" || manifestKeys[1] !== "schemaVersion")
    throw new Error(`Candidate manifest must contain exactly schemaVersion and candidates; found: ${JSON.stringify(manifestKeys)}`);
  const candidatePaths = manifest.candidates as Record<string, unknown>;
  const expectedKeys = corpus.scenarios.map(scenario => scenario.id);
  const actualKeys = Object.keys(candidatePaths);
  const missing = expectedKeys.filter(key => !Object.hasOwn(candidatePaths, key));
  const unknown = actualKeys.filter(key => !expectedKeys.includes(key)).sort();
  if (missing.length || unknown.length)
    throw new Error(`Candidate manifest keys must exactly match corpus scenarios; missing: ${JSON.stringify(missing)}; unknown: ${JSON.stringify(unknown)}`);
  const candidates: Record<string, unknown> = {};
  const manifestDirectory = realpathSync(dirname(manifestFile.absolutePath));
  for (const scenario of corpus.scenarios) {
    const relativePath = candidatePaths[scenario.id];
    if (typeof relativePath !== "string" || relativePath.length === 0 || isAbsolute(relativePath))
      throw new Error(`Candidate manifest path for ${JSON.stringify(scenario.id)} must be a non-empty relative path`);
    const absolutePath = resolve(manifestDirectory, relativePath);
    const fromManifest = relative(manifestDirectory, absolutePath);
    if (fromManifest === ".." || fromManifest.startsWith(`..${process.platform === "win32" ? "\\" : "/"}`) || isAbsolute(fromManifest))
      throw new Error(`Candidate manifest path for ${JSON.stringify(scenario.id)} escapes the manifest directory: ${JSON.stringify(relativePath)}`);
    const realCandidatePath = realpathSync(absolutePath);
    const realFromManifest = relative(manifestDirectory, realCandidatePath);
    if (realFromManifest === ".." || realFromManifest.startsWith(`..${process.platform === "win32" ? "\\" : "/"}`) || isAbsolute(realFromManifest))
      throw new Error(`Candidate manifest path for ${JSON.stringify(scenario.id)} resolves outside the manifest directory: ${JSON.stringify(relativePath)}`);
    candidates[scenario.id] = readJsonFile(realCandidatePath).value;
  }
  process.stdout.write(serializeCorpusEvaluation(evaluateCorpus(corpus, candidates)));
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}
