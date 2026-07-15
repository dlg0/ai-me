import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import { createPlannerAcceptanceRun } from "./acceptance-run.js";
import { assertScenarioCorpus, type ScenarioCorpus } from "./evaluate-corpus.js";
import type { RawPlannerProvider, RawPlannerRequest, RawPlannerResponse } from "./provider.js";

const examples = resolve(process.cwd(), "../../examples");
const corpusBytes = readFileSync(resolve(examples, "scenario-corpus.v1.json"));
const corpusValue: unknown = JSON.parse(corpusBytes.toString("utf8")); assertScenarioCorpus(corpusValue); const corpus: ScenarioCorpus = corpusValue;
const template = readFileSync(resolve(process.cwd(), "../../prompts/animation-planner.md"));
const candidateManifest = JSON.parse(readFileSync(resolve(examples, "evaluation-candidates/good/manifest.json"), "utf8")) as { candidates: Record<string, string> };
const plans = Object.fromEntries(Object.entries(candidateManifest.candidates).map(([id, path]) => [id, readFileSync(resolve(examples, "evaluation-candidates/good", path), "utf8")])) as Record<string, string>;
const root = () => mkdtempSync(join(tmpdir(), "aime-acceptance-"));

class Fake implements RawPlannerProvider {
  calls: RawPlannerRequest[] = [];
  constructor(readonly handler: (request: RawPlannerRequest, call: number) => string | Error, readonly after?: (call: number) => void) {}
  async generate(request: RawPlannerRequest): Promise<RawPlannerResponse> {
    this.calls.push(request); const call = this.calls.length; const value = this.handler(request, call); this.after?.(call); if (value instanceof Error) throw value;
    return { provider: "fake", model: "fixture-v1", responseId: `response-${call}`, clientRequestId: request.clientRequestId, text: value, request: request.identity, rawResponse: { call } };
  }
}
const run = (provider: RawPlannerProvider, outputRoot = root(), extra = {}) => createPlannerAcceptanceRun({ provider, corpusBytes, promptTemplateBytes: template, providerConfig: { provider: "fake", model: "fixture-v1", maxAttempts: 2 }, outputRoot, runId: "baseline", createdAt: "2026-07-15T00:00:00.000Z", ...extra });

test("finalizes ten successful cases with exact bytes, bindings, metadata, and deterministic injected identity", async () => {
  const provider = new Fake(request => plans[request.identity.scenarioId]);
  const result = await run(provider);
  assert.equal(result.manifest.state, "finalized"); assert.equal(result.manifest.corpusCount, 10); assert.equal(result.manifest.counts.succeeded, 10); assert.equal(result.manifest.targetMet, true);
  assert.deepEqual(readFileSync(join(result.runDirectory, "corpus.json")), corpusBytes); assert.deepEqual(readFileSync(join(result.runDirectory, "prompt-template.md")), template);
  for (const artifact of result.manifest.artifacts) assert.equal(artifact.sha256, createHash("sha256").update(readFileSync(join(result.runDirectory, artifact.path))).digest("hex"));
  assert.deepEqual(result.manifest.providerConfig, { provider: "fake", model: "fixture-v1", maxAttempts: 2 });
  assert.match(result.manifest.promptIdentity.templateVersion, /^sha256:/); assert.equal(result.manifest.runId, "baseline"); assert.equal(result.manifest.createdAt, "2026-07-15T00:00:00.000Z");
  assert.match(provider.calls[0].clientRequestId ?? "", /^aime-[a-f0-9]{64}-attempt-1$/);
  const rerun = await run(new Fake(request => plans[request.identity.scenarioId]));
  assert.deepEqual(rerun.manifest, result.manifest);
  for (const artifact of result.manifest.artifacts) assert.deepEqual(readFileSync(join(rerun.runDirectory, artifact.path)), readFileSync(join(result.runDirectory, artifact.path)));
});

test("continues invalid and provider failures, counts both invalid, and preserves repair provenance", async () => {
  const provider = new Fake((request, call) => request.identity.scenarioId === corpus.scenarios[0].id ? "not json" : call === 3 ? new Error("provider unavailable") : plans[request.identity.scenarioId]);
  const result = await run(provider);
  assert.equal(result.manifest.counts.invalid, 1); assert.equal(result.manifest.counts.providerFailed, 1); assert.equal(result.manifest.counts.succeeded, 8); assert.equal(result.manifest.targetMet, true);
  const provenance = JSON.parse(readFileSync(join(result.runDirectory, result.manifest.cases[0].provenance.path), "utf8"));
  assert.equal(provenance.attempts.length, 2); assert.equal(provenance.attempts[1].kind, "repair");
  const evaluation = JSON.parse(readFileSync(join(result.runDirectory, result.manifest.evaluation.path), "utf8")); assert.equal(evaluation.validCount, 8);
  assert.equal(result.manifest.cases.filter(value => value.plan).length, 8);
});

test("cancellation stops calls and creates deterministic unattempted slots", async () => {
  const controller = new AbortController(); const provider = new Fake(request => plans[request.identity.scenarioId], () => controller.abort());
  const result = await run(provider, root(), { signal: controller.signal });
  assert.equal(provider.calls.length, 1); assert.equal(result.manifest.state, "cancelled"); assert.equal(result.manifest.counts.unattempted, 9); assert.equal(result.manifest.cases[0].status, "cancelled");
});

test("rejects unsafe IDs, never overwrites, and does not persist an external secret", async () => {
  await assert.rejects(() => run(new Fake(() => ""), root(), { runId: "../escape" }), /path-safe/);
  await assert.rejects(() => run(new Fake(() => ""), root(), { providerConfig: { provider: "fake", model: "x", apiKey: "super-secret-api-key" } }), /unknown field/);
  const output = root(); await run(new Fake(request => plans[request.identity.scenarioId]), output);
  await assert.rejects(() => run(new Fake(request => plans[request.identity.scenarioId]), output), /EEXIST/);
  const result = await run(new Fake(request => plans[request.identity.scenarioId]), root());
  const all = result.manifest.artifacts.map(a => readFileSync(join(result.runDirectory, a.path), "utf8")).join("") + JSON.stringify(result.manifest);
  assert.doesNotMatch(all, /super-secret-api-key/);
});

test("uses safe unique artifact names for hostile scenario IDs", async () => {
  const ids = ["../same", "..\\same", "/absolute-looking/same", "same/same", "same\\same"];
  const hostile: ScenarioCorpus = { ...corpus, scenarios: ids.map((id, index) => ({ ...corpus.scenarios[0], id, title: `Hostile ${index}` })) };
  const bytes = Buffer.from(JSON.stringify(hostile)); const output = root();
  const result = await run(new Fake(() => plans[corpus.scenarios[0].id]), output, { corpusBytes: bytes });
  assert.equal(new Set(result.manifest.cases.map(value => value.prompt.path)).size, ids.length);
  for (const artifact of result.manifest.artifacts) {
    const destination = resolve(result.runDirectory, artifact.path);
    assert.ok(destination.startsWith(result.runDirectory + "/")); assert.ok(existsSync(destination));
  }
  assert.deepEqual(readdirSync(output), ["baseline"]);
  assert.deepEqual(result.manifest.cases.map(value => value.scenarioId), ids);
});

test("rejects provider provenance mismatches as incomplete before publishing a plan", async () => {
  const mutations: Array<(response: RawPlannerResponse) => void> = [
    response => { response.provider = "other"; },
    response => { response.model = "other"; },
    response => { response.request = { ...response.request, scenarioId: "other" }; },
    response => { response.clientRequestId = "other"; }
  ];
  for (const mutate of mutations) {
    const output = root(); const base = new Fake(request => plans[request.identity.scenarioId]);
    const provider: RawPlannerProvider = { generate: async request => { const response = await base.generate(request); mutate(response); return response; } };
    await assert.rejects(() => run(provider, output), /provenance mismatch/);
    const directory = join(output, "baseline"); const manifest = JSON.parse(readFileSync(join(directory, "manifest.json"), "utf8"));
    assert.equal(manifest.state, "incomplete"); assert.equal(readdirSync(join(directory, "plans")).length, 0);
    assert.equal(manifest.artifacts.some((artifact: { path: string }) => artifact.path.startsWith("plans/")), false);
  }
});

test("preflight rejects closed config defects without calls or directories", async () => {
  const defects = [
    { provider: "fake", model: "fixture-v1", unknown: true },
    { provider: "fake", model: "fixture-v1", maxAttempts: 0 },
    { provider: "fake", model: "fixture-v1", maxAttempts: 4 },
    { provider: "fake", model: "fixture-v1", endpoint: "https://user:pass@example.test/responses" },
    { provider: "fake", model: "fixture-v1", endpoint: "https://example.test/responses?token=secret" }
  ];
  for (const providerConfig of defects) {
    const parent = root(); const output = join(parent, "not-created"); const provider = new Fake(() => "");
    await assert.rejects(() => run(provider, output, { providerConfig }));
    assert.equal(provider.calls.length, 0); assert.equal(existsSync(output), false);
  }
});
