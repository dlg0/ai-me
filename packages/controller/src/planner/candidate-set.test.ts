import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import type { RawPlannerProvider, RawPlannerResponse } from "./provider.js";
import type { ScenarioCase } from "./evaluate-corpus.js";
import { canonicalJson, contentSha256, generateCandidateSet } from "./candidate-set.js";

const plan = JSON.parse(readFileSync(resolve(process.cwd(), "../../examples/example-animation-plan.json"), "utf8"));
const scenario: ScenarioCase = { id: "test", title: "Test", brief: "Test", targetRig: plan.targetRig, durationMs: { min: plan.durationMs, max: plan.durationMs }, expectations: {} };
const identity = { scenarioId: scenario.id, promptTemplateId: "test", promptTemplateVersion: "1" };
const root = () => mkdtempSync(join(tmpdir(), "aime-candidates-"));
const response = (text: string, index: number): RawPlannerResponse => ({ provider: "fake", model: "fixed", responseId: `r-${index}`, text, request: identity, rawResponse: { exact: index } });
class Scripted implements RawPlannerProvider {
  calls = 0;
  constructor(readonly script: Array<string | Error>, readonly after?: (calls: number) => void) {}
  async generate(): Promise<RawPlannerResponse> { const item = this.script[this.calls++]; this.after?.(this.calls); if (item instanceof Error) throw item; return response(item, this.calls); }
}
const generate = (provider: RawPlannerProvider, outputRoot = root(), extra = {}) => generateCandidateSet({ provider, scenario, prompt: "exact prompt", identity, count: 2, outputRoot, setId: "fixed", createdAt: "2026-07-15T00:00:00.000Z", ...extra });

test("canonical JSON and successful candidate identities ignore object key order", async () => {
  assert.equal(canonicalJson({ z: 1, a: { y: 2, x: 3 } }), canonicalJson({ a: { x: 3, y: 2 }, z: 1 }));
  assert.equal(contentSha256({ b: 2, a: 1 }), contentSha256({ a: 1, b: 2 }));
  const reordered = JSON.stringify(Object.fromEntries(Object.entries(plan).reverse()));
  const result = await generate(new Scripted([JSON.stringify(plan), reordered]));
  assert.equal(result.manifest.status, "completed");
  assert.equal(result.manifest.candidates[1].duplicateOf, result.manifest.candidates[0].candidateId);
  assert.match(result.manifest.candidates[0].candidateId, /^candidate-1-/);
  assert.match(result.manifest.candidates[1].candidateId, /^candidate-2-/);
  assert.equal(result.manifest.candidates[0].planSha256, result.manifest.candidates[1].planSha256);
});

test("partial failures retain exact provenance, checksums, safe manifest, and ordered slots", async () => {
  const failure = "harmless-provider-failure-marker";
  const provider = new Scripted([JSON.stringify(plan), new Error(failure), new Error(failure)]);
  const result = await generate(provider);
  assert.equal(result.manifest.status, "partial");
  assert.deepEqual(result.manifest.candidates.map(value => value.status), ["succeeded", "failed"]);
  const failed = result.manifest.candidates[1];
  const provenance = readFileSync(join(result.setDirectory, failed.provenancePath), "utf8");
  assert.match(provenance, new RegExp(failure));
  assert.doesNotMatch(JSON.stringify(result.manifest), new RegExp(failure));
  assert.doesNotMatch(failed.candidateId, new RegExp(failure));
  assert.equal(failed.provenanceSha256, createHash("sha256").update(provenance).digest("hex"));
  for (const [path, digest] of Object.entries(result.manifest.artifactSha256)) assert.equal(digest, createHash("sha256").update(readFileSync(join(result.setDirectory, path))).digest("hex"));
});

test("invalid output is distinct and cancellation creates deterministic unattempted slots", async () => {
  const invalid = await generate(new Scripted(["no", "still no", JSON.stringify(plan)]));
  assert.deepEqual(invalid.manifest.candidates.map(value => value.status), ["failed", "succeeded"]);
  assert.equal(invalid.manifest.candidates[0].failureReason, "invalid-output");
  const controller = new AbortController();
  const provider = new Scripted([JSON.stringify(plan)], () => controller.abort());
  const cancelled = await generate(provider, root(), { signal: controller.signal });
  assert.equal(provider.calls, 1);
  assert.deepEqual(cancelled.manifest.candidates.map(value => value.status), ["cancelled", "cancelled"]);
  assert.equal(cancelled.manifest.generated, 1);
});

test("count, path IDs, and non-overwrite are bounded", async () => {
  await assert.rejects(() => generateCandidateSet({ provider: new Scripted([]), scenario, prompt: "x", identity, count: 1, outputRoot: root() }), /between 2 and 5/);
  await assert.rejects(() => generateCandidateSet({ provider: new Scripted([]), scenario, prompt: "x", identity, count: 6, outputRoot: root() }), /between 2 and 5/);
  await assert.rejects(() => generate(new Scripted([]), root(), { setId: "../escape" }), /path-safe/);
  const output = root(); await generate(new Scripted([JSON.stringify(plan), JSON.stringify(plan)]), output);
  await assert.rejects(() => generate(new Scripted([JSON.stringify(plan), JSON.stringify(plan)]), output), /EEXIST/);
});
