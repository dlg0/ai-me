import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import type { AnimationPlan } from "../types.js";
import { assertScenarioCorpus, evaluateCorpus, evaluateScenario, serializeCorpusEvaluation, type ScenarioCorpus } from "./evaluate-corpus.js";

const examples = resolve(process.cwd(), "../../examples");
const corpus = json("scenario-corpus.v1.json") as ScenarioCorpus;
const qualified = corpus.scenarios[0];
const authority = json("evaluation-candidates/good/authority.json") as AnimationPlan;

test("the versioned corpus preserves all ten briefs in stable order", () => {
  assert.doesNotThrow(() => assertScenarioCorpus(corpus));
  assert.equal(corpus.scenarios.length, 10);
  assert.deepEqual(corpus.scenarios.map(value => value.id), [
    "qualified-answer", "simple-factual-answer", "insufficient-context", "boundary-refusal", "summary",
    "polite-disagreement", "silent-listener", "correction", "action-request", "unknown-answer"
  ]);
});

test("corpus validation rejects nested schema and semantic defects with paths", () => {
  const malformed = structuredClone(corpus) as unknown as Record<string, unknown>;
  ((malformed.scenarios as ScenarioCorpus["scenarios"])[0].durationMs as { min: number }).min = 0;
  assert.throws(() => assertScenarioCorpus(malformed), /\/scenarios\/0\/durationMs\/min must be >= 1/);

  const duplicate = structuredClone(corpus);
  duplicate.scenarios[1].id = duplicate.scenarios[0].id;
  assert.throws(() => assertScenarioCorpus(duplicate), /\/scenarios\/1\/id duplicates/);

  const duplicateExpectation = structuredClone(corpus);
  duplicateExpectation.scenarios[0].expectations.requiredStates = ["listening", "listening"];
  assert.throws(() => assertScenarioCorpus(duplicateExpectation), /\/scenarios\/0\/expectations\/requiredStates contains duplicate/);

  const reversed = structuredClone(corpus);
  reversed.scenarios[0].durationMs = { min: 2, max: 1 };
  assert.throws(() => assertScenarioCorpus(reversed), /\/scenarios\/0\/durationMs min must be <= max/);
});

test("good fixtures satisfy all scenario policies", () => {
  const manifest = json("evaluation-candidates/good/manifest.json") as { candidates: Record<string, string> };
  const candidates = Object.fromEntries(Object.entries(manifest.candidates).map(([id, path]) => [id, json(`evaluation-candidates/good/${path}`)]));
  const report = evaluateCorpus(corpus, candidates);
  assert.equal(report.validCount, 10);
  assert.equal(report.validRate, 1);
  assert.deepEqual(report.results.map(result => result.scenarioId), corpus.scenarios.map(value => value.id));
});

test("schema and semantic failures preserve diagnostics and skip policy checks", () => {
  const schema = evaluateScenario(qualified, json("evaluation-candidates/failing/schema-error.json"));
  assert.equal(schema.planValid, false);
  assert.deepEqual(schema.checks, []);
  assert.match(schema.diagnostics[0].message, /schemaVersion|required/);

  const semantic = evaluateScenario(corpus.scenarios[1], json("evaluation-candidates/failing/semantic-error.json"));
  assert.equal(semantic.planValid, false);
  assert.ok(semantic.checks.every(check => check.id.startsWith("diagnostic-warning:") && !check.passed));
  assert.ok(semantic.diagnostics.some(value => /duplicate event id/.test(value.message)));
});

test("policy checks give precise disclosure, reset, authority, and density reasons", () => {
  const plan = structuredClone(authority);
  plan.tracks.overlays = [];
  plan.tracks.states = plan.tracks.states.filter(state => state.state !== "deferring" && state.state !== "reset_neutral");
  plan.tracks.states[plan.tracks.states.length - 1].durationMs = 8000;
  plan.tracks.gestures = Array.from({ length: 7 }, (_, index) => ({
    id: `g${index}`, type: "gesture" as const, startMs: index * 2000, durationMs: 100, gesture: "micro_nod" as const
  }));
  const result = evaluateScenario(qualified, plan);
  assert.equal(result.planValid, true);
  assert.equal(result.scenarioValid, false);
  for (const id of ["state-required:deferring", "gesture-density", "full-duration-disclosure", "terminal-neutral-reset"])
    assert.equal(result.checks.find(check => check.id === id)?.passed, false, id);
});

test("token-duration states and out-of-context authority speech fail", () => {
  const tokenState = structuredClone(authority);
  const deferring = tokenState.tracks.states.find(state => state.state === "deferring")!;
  deferring.durationMs = 1;
  const durationResult = evaluateScenario(qualified, tokenState);
  assert.equal(durationResult.checks.find(check => check.id === "state-required:deferring")?.passed, false);

  const wrongContext = structuredClone(authority);
  wrongContext.tracks.speech!.find(speech => speech.speechAct === "deferral")!.startMs = 6000;
  const contextResult = evaluateScenario(qualified, wrongContext);
  assert.equal(contextResult.checks.find(check => check.id === "speech-act-state:deferral:deferring")?.passed, false);
  assert.ok(contextResult.checks.some(check => check.id.startsWith("diagnostic-warning:") && !check.passed));
});

test("a reset gesture cannot mask a non-neutral final state", () => {
  const plan = structuredClone(authority);
  plan.tracks.states.at(-1)!.state = "speaking";
  plan.tracks.gestures.push({ id: "reset", type: "gesture", startMs: 19000, durationMs: 1000, gesture: "reset_neutral" });
  const result = evaluateScenario(qualified, plan);
  assert.equal(result.planValid, true);
  assert.equal(result.checks.find(check => check.id === "terminal-neutral-reset")?.passed, false);
});

test("failed reports have exact compact serialization", () => {
  const report = {
    schemaVersion: "animation-plan-evaluation.v1" as const,
    scenarioCount: 1,
    validCount: 0,
    validRate: 0,
    results: [{
      scenarioId: "case-a", planValid: true, scenarioValid: false, valid: false,
      diagnostics: [{ severity: "warning" as const, path: "/tracks/speech/0", message: "speech mismatch" }],
      checks: [{ id: "state-required:deferring", passed: false, message: "required state must be present" }]
    }]
  };
  assert.equal(serializeCorpusEvaluation(report), `{
  "schemaVersion": "animation-plan-evaluation.v1",
  "scenarioCount": 1,
  "validCount": 0,
  "validRate": 0,
  "results": [
    {
      "scenarioId": "case-a",
      "planValid": true,
      "scenarioValid": false,
      "valid": false,
      "diagnostics": [
        {
          "severity": "warning",
          "path": "/tracks/speech/0",
          "message": "speech mismatch"
        }
      ],
      "checks": [
        {
          "id": "state-required:deferring",
          "passed": false,
          "message": "required state must be present"
        }
      ]
    }
  ]
}
`);
});

test("CLI output is stable and manifest object key order is irrelevant", () => {
  const args = ["src/cli/evaluate-plans.ts", "../../examples/scenario-corpus.v1.json", "../../examples/evaluation-candidates/good/manifest.json"];
  const first = spawnSync("npx", ["tsx", ...args], { cwd: process.cwd(), encoding: "utf8" });
  const directory = mkdtempSync(resolve(tmpdir(), "aime-evaluation-"));
  const originalManifest = json("evaluation-candidates/good/manifest.json") as { schemaVersion: string; candidates: Record<string, string> };
  const reversed = Object.fromEntries(Object.entries(originalManifest.candidates).reverse().map(([id, path]) => [id, resolve(examples, "evaluation-candidates/good", path)]));
  const reorderedPath = resolve(directory, "manifest.json");
  writeFileSync(reorderedPath, JSON.stringify({ candidates: reversed, schemaVersion: originalManifest.schemaVersion }));
  // Absolute paths are deliberately rejected, so use a local copy manifest for the ordering assertion.
  for (const [id, path] of Object.entries(originalManifest.candidates)) {
    writeFileSync(resolve(directory, `${id}.json`), readFileSync(resolve(examples, "evaluation-candidates/good", path)));
    reversed[id] = `${id}.json`;
  }
  writeFileSync(reorderedPath, JSON.stringify({ candidates: reversed, schemaVersion: originalManifest.schemaVersion }));
  const second = runCli(resolve(examples, "scenario-corpus.v1.json"), reorderedPath);
  assert.equal(first.status, 0, first.stderr);
  assert.equal(first.stderr, "");
  assert.equal(first.stdout, second.stdout);
  assert.equal(JSON.parse(first.stdout).validCount, 10);
});

test("CLI rejects unknown manifest keys and escaping paths as configuration errors", () => {
  const directory = mkdtempSync(resolve(tmpdir(), "aime-evaluation-config-"));
  const oneCorpus = { ...corpus, scenarios: [corpus.scenarios[0]] };
  const corpusPath = resolve(directory, "corpus.json");
  writeFileSync(corpusPath, JSON.stringify(oneCorpus));

  const manifestPath = resolve(directory, "manifest.json");
  writeFileSync(manifestPath, JSON.stringify({ schemaVersion: "animation-plan-candidates.v1", candidates: {} }));
  writeFileSync(corpusPath, JSON.stringify({ ...oneCorpus, scenarios: [{ ...oneCorpus.scenarios[0], durationMs: { min: 0, max: 1 } }] }));
  let result = runCli(corpusPath, manifestPath);
  assert.notEqual(result.status, 0);
  assert.equal(result.stdout, "");
  assert.match(result.stderr, /Invalid scenario corpus: \/scenarios\/0\/durationMs\/min must be >= 1/);

  writeFileSync(corpusPath, JSON.stringify(oneCorpus));
  writeFileSync(manifestPath, JSON.stringify({ schemaVersion: "animation-plan-candidates.v1", candidates: { "qualified-answer": "candidate.json", extra: "candidate.json" } }));
  result = runCli(corpusPath, manifestPath);
  assert.notEqual(result.status, 0);
  assert.equal(result.stdout, "");
  assert.match(result.stderr, /unknown: \["extra"\]/);

  writeFileSync(manifestPath, JSON.stringify({ schemaVersion: "animation-plan-candidates.v1", candidates: { "qualified-answer": "../candidate.json" } }));
  result = runCli(corpusPath, manifestPath);
  assert.notEqual(result.status, 0);
  assert.equal(result.stdout, "");
  assert.match(result.stderr, /escapes the manifest directory/);
});

function json(path: string): unknown {
  return JSON.parse(readFileSync(resolve(examples, path), "utf8"));
}

function runCli(corpusPath: string, manifestPath: string) {
  return spawnSync("npx", ["tsx", "src/cli/evaluate-plans.ts", corpusPath, manifestPath], { cwd: process.cwd(), encoding: "utf8" });
}
