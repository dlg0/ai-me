import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import type { ScenarioCase } from "../planner/evaluate-corpus.js";
import type { RawPlannerProvider } from "../planner/provider.js";
import { generateCandidateSet } from "../planner/candidate-set.js";
import { assertCompletedComparisonReview, createLocalSvgComparison } from "./comparison.js";

const fixture = (name: string) => readFileSync(resolve(process.cwd(), `../../examples/${name}`), "utf8");
const base = JSON.parse(fixture("example-animation-plan.json"));
const second = structuredClone(base); second.title = "Distinct restrained candidate"; second.tracks.states[1].reason = "Alternative semantic reason"; second.tracks.states[1].intensity = 0.4; second.tracks.gestures[0].startMs = 1600; second.tracks.speech[0].durationMs = 8000;
const scenario: ScenarioCase = { id: "compare", title: "Compare", brief: "Compare", targetRig: base.targetRig, durationMs: { min: base.durationMs, max: base.durationMs }, expectations: {} };
class Fake implements RawPlannerProvider {
  index = 0;
  constructor(readonly plans: unknown[] = [base, second], readonly provider = "offline-fake", readonly model = "fixed-model") {}
  async generate() { const plan = this.plans[this.index]!; this.index++; return { provider: this.provider, model: this.model, responseId: `response-${this.index}`, text: JSON.stringify(plan), request: { scenarioId: "compare", promptTemplateId: "fixed", promptTemplateVersion: "1" }, rawResponse: { index: this.index } }; }
}
const sha = (bytes: Buffer | string) => createHash("sha256").update(bytes).digest("hex");
async function bundle() {
  const root = mkdtempSync(join(tmpdir(), "aime-comparison-"));
  const set = await generateCandidateSet({ provider: new Fake(), scenario, prompt: "fixed prompt", identity: { scenarioId: "compare", promptTemplateId: "fixed", promptTemplateVersion: "1" }, count: 2, outputRoot: join(root, "sets"), setId: "fixed-set", createdAt: "2026-07-15T00:00:00.000Z" });
  const ids = set.manifest.candidates.map(c => c.candidateId) as [string, string];
  const result = createLocalSvgComparison({ candidateSetDirectory: set.setDirectory, candidateIds: ids, rigProfileSource: fixture("rig-profile.local-svg.json"), outputRoot: join(root, "comparisons"), comparisonId: "fixed-comparison", createdAt: "2026-07-15T01:00:00.000Z" });
  return { root, set, ids, result };
}

test("real offline candidates produce finalized nested runs and complete checksum bindings", async () => {
  const { result, set } = await bundle(); const m: any = result.manifest;
  assert.equal(m.status, "finalized"); assert.deepEqual(m.resetEvidence, { left: true, right: true }); assert.deepEqual(m.releaseEvidence, { left: true, right: true });
  for (const [index, side] of ["left", "right"].entries()) { const run = JSON.parse(readFileSync(join(result.comparisonDirectory, m.nestedRuns[side]), "utf8")); assert.equal(run.status, "finalized"); assert.equal(run.outcome, "completed"); assert.equal(run.resetEvidence, true); assert.equal(run.releaseEvidence, true); assert.equal(run.sourceSha256["plan.json"], set.manifest.candidates[index]!.planSha256); assert.equal(run.sourceSha256["rig-profile.json"], m.bindings.rigProfile.sha256); }
  for (const name of ["semantic-diff.json", "semantic-diff.md", "comparison.html", "review-record.json"]) assert.ok(readFileSync(join(result.comparisonDirectory, name)).length > 0);
  const review = JSON.parse(readFileSync(join(result.comparisonDirectory, "review-record.json"), "utf8")); assert.equal(review.reviewStatus, "pending"); assert.equal(review.preference, null);
  assert.match(readFileSync(join(result.comparisonDirectory, "comparison.html"), "utf8"), /sandbox="allow-scripts"[^>]+srcdoc=/);
  const verify = (value: any) => { if (value && typeof value.path === "string") assert.equal(value.sha256, sha(readFileSync(join(result.comparisonDirectory, value.path)))); else if (value && typeof value === "object") for (const nested of Object.values(value)) verify(nested); };
  verify(m.bindings);
  for (const [bindingName, sourcePath] of [["candidateSetManifest", "manifest.json"], ["prompt", "prompt.txt"], ["scenario", "scenario.json"]] as const)
    assert.deepEqual(readFileSync(join(result.comparisonDirectory, m.bindings[bindingName].path)), readFileSync(join(set.setDirectory, sourcePath)));
  for (const side of ["left", "right"] as const) {
    const entry = set.manifest.candidates[side === "left" ? 0 : 1]!;
    assert.deepEqual(readFileSync(join(result.comparisonDirectory, m.bindings[side].candidatePlan.path)), readFileSync(join(set.setDirectory, entry.planPath!)));
    assert.deepEqual(readFileSync(join(result.comparisonDirectory, m.bindings[side].attemptProvenance.path)), readFileSync(join(set.setDirectory, entry.provenancePath)));
  }
});

test("comparison IDs are deterministic and output is never overwritten", async () => {
  const { set, ids, root } = await bundle(); const input = { candidateSetDirectory: set.setDirectory, candidateIds: ids, rigProfileSource: fixture("rig-profile.local-svg.json"), outputRoot: join(root, "other"), comparisonId: "same", createdAt: "2026-07-15T01:00:00.000Z" } as const;
  const first = createLocalSvgComparison(input); const html = readFileSync(join(first.comparisonDirectory, "comparison.html"));
  assert.throws(() => createLocalSvgComparison(input), /EEXIST/); assert.deepEqual(readFileSync(join(first.comparisonDirectory, "comparison.html")), html);
});

test("rejects same and unknown candidate IDs", async () => {
  const { set, ids, root } = await bundle(); const common = { candidateSetDirectory: set.setDirectory, rigProfileSource: fixture("rig-profile.local-svg.json"), outputRoot: join(root, "reject"), createdAt: "2026-07-15T01:00:00.000Z" };
  assert.throws(() => createLocalSvgComparison({ ...common, candidateIds: [ids[0], ids[0]] }), /distinct/);
  assert.throws(() => createLocalSvgComparison({ ...common, candidateIds: [ids[0], "unknown"] }), /Unknown/);
});

test("completed review validator accepts all preferences and rejects malformed evidence and review shapes", async () => {
  const { result, ids } = await bundle(); const pending: any = JSON.parse(readFileSync(join(result.comparisonDirectory, "review-record.json"), "utf8"));
  const complete = structuredClone(pending); complete.reviewStatus = "completed"; complete.reviewer = "Reviewer"; complete.reviewedAt = "2026-07-15T02:00:00.000Z"; complete.rationale = "Evidence-based rationale";
  for (const side of ["left", "right"]) for (const item of Object.values(complete.rubric[side]) as any[]) item.score = 3;
  for (const item of Object.values(complete.requiredChecks) as any[]) item.value = true;
  for (const preference of ["left", "right", "tie", "no-preference"]) { complete.preference = preference; assert.doesNotThrow(() => assertCompletedComparisonReview(complete, { comparisonId: "fixed-comparison", leftCandidateId: ids[0], rightCandidateId: ids[1], evidence: pending.evidence })); }
  for (const bad of [null, [], {}, { ...complete, evidence: [] }, { ...complete, evidence: { ...complete.evidence, extra: sha("x") } }, { ...complete, observations: new Array(6).fill({}) }]) assert.throws(() => assertCompletedComparisonReview(bad));
  const badHash = structuredClone(complete); badHash.evidence.prompt = "ABC"; assert.throws(() => assertCompletedComparisonReview(badHash), /SHA-256/);
  const badScore = structuredClone(complete); badScore.rubric.left.restraint.score = 0; assert.throws(() => assertCompletedComparisonReview(badScore), /1-5/);
  const incomplete = structuredClone(complete); incomplete.requiredChecks.endsNeutral.value = null; assert.throws(() => assertCompletedComparisonReview(incomplete), /incomplete/);
});

test("completed review validator defensively rejects exact-key, notes, observation, and expected-evidence defects", async () => {
  const { result, ids } = await bundle(); const pending: any = JSON.parse(readFileSync(join(result.comparisonDirectory, "review-record.json"), "utf8"));
  const valid = structuredClone(pending); valid.reviewStatus = "completed"; valid.reviewer = "R"; valid.reviewedAt = "2026-07-15T02:00:00Z"; valid.preference = "tie"; valid.rationale = "Rationale";
  for (const side of ["left", "right"]) for (const item of Object.values(valid.rubric[side]) as any[]) item.score = 3;
  for (const item of Object.values(valid.requiredChecks) as any[]) item.value = false;
  assert.doesNotThrow(() => assertCompletedComparisonReview(valid));
  const mutations = [
    (v: any) => { v.rubric.left.extra = { score: 3, notes: null }; }, (v: any) => { delete v.rubric.right.restraint; },
    (v: any) => { v.requiredChecks.extra = { value: true, notes: null }; }, (v: any) => { delete v.requiredChecks.endsNeutral; },
    (v: any) => { v.rubric.left.restraint.notes = 4; }, (v: any) => { v.requiredChecks.endsNeutral.notes = []; },
    (v: any) => { v.observations = [{ timestamp: "1s", observation: "x", layer: "network", proposedChange: "y", evidence: "z" }]; },
    (v: any) => { v.observations = [{ timestamp: "1s", observation: "", layer: "rig", proposedChange: "y", evidence: "z" }]; }
  ];
  for (const mutate of mutations) { const bad = structuredClone(valid); mutate(bad); assert.throws(() => assertCompletedComparisonReview(bad)); }
  assert.throws(() => assertCompletedComparisonReview(valid, { comparisonId: "fixed-comparison", leftCandidateId: ids[0], rightCandidateId: ids[1], evidence: { ...pending.evidence, prompt: sha("wrong") } }), /expected bindings/);
});

test("mismatched rig retains a uniquely identified incomplete comparison manifest", async () => {
  const { set, ids, root } = await bundle(); const rig = JSON.parse(fixture("rig-profile.local-svg.json")); rig.rigId = "wrong-rig";
  assert.throws(() => createLocalSvgComparison({ candidateSetDirectory: set.setDirectory, candidateIds: ids, rigProfileSource: JSON.stringify(rig), outputRoot: join(root, "bad-rig"), comparisonId: "mismatched-rig-comparison", createdAt: "2026-07-15T03:00:00Z" }), /retained incomplete/);
  const manifest = JSON.parse(readFileSync(join(root, "bad-rig", "mismatched-rig-comparison", "manifest.json"), "utf8")); assert.equal(manifest.status, "incomplete"); assert.match(manifest.failure, /does not match plan targetRig/);
});

test("failed candidates and tampered attempt provenance cannot reach rendering", async () => {
  const root = mkdtempSync(join(tmpdir(), "aime-comparison-reject-"));
  const failedSet = await generateCandidateSet({ provider: new Fake(["invalid", "still invalid", base]), scenario, prompt: "fixed prompt", identity: { scenarioId: "compare", promptTemplateId: "fixed", promptTemplateVersion: "1" }, count: 2, outputRoot: join(root, "failed-set"), setId: "failed-set", createdAt: "2026-07-15T00:00:00Z" });
  const failedIds = failedSet.manifest.candidates.map(value => value.candidateId) as [string, string];
  assert.equal(failedSet.manifest.candidates[0]!.status, "failed");
  assert.throws(() => createLocalSvgComparison({ candidateSetDirectory: failedSet.setDirectory, candidateIds: failedIds, rigProfileSource: fixture("rig-profile.local-svg.json"), outputRoot: join(root, "failed-comparison") }), /was not successful/);

  const { set, ids } = await bundle();
  const provenance = join(set.setDirectory, set.manifest.candidates[0]!.provenancePath);
  writeFileSync(provenance, readFileSync(provenance, "utf8") + "tampered\n");
  assert.throws(() => createLocalSvgComparison({ candidateSetDirectory: set.setDirectory, candidateIds: ids, rigProfileSource: fixture("rig-profile.local-svg.json"), outputRoot: join(root, "tampered-comparison") }), /checksum mismatch/);
});

test("comparison HTML is offline, load-gated, responsive, review-complete, and injection-safe", async () => {
  const hostileLeft = structuredClone(base), hostileRight = structuredClone(second);
  const hostile = `AI delegate </script><img src=x onerror="globalThis.HOSTILE=1">`;
  hostileLeft.title = hostile; hostileRight.title = `${hostile} right`;
  hostileLeft.tracks.overlays[0].text = hostile; hostileRight.tracks.overlays[0].text = hostile;
  const root = mkdtempSync(join(tmpdir(), "aime-comparison-hostile-"));
  const set = await generateCandidateSet({ provider: new Fake([hostileLeft, hostileRight], `provider </p><script>globalThis.HOSTILE=2</script>`, `model <img onerror=globalThis.HOSTILE=3>`), scenario, prompt: "fixed prompt", identity: { scenarioId: "compare", promptTemplateId: "fixed", promptTemplateVersion: "1" }, count: 2, outputRoot: join(root, "sets"), setId: "hostile-set", createdAt: "2026-07-15T00:00:00Z" });
  const ids = set.manifest.candidates.map(value => value.candidateId) as [string, string];
  const result = createLocalSvgComparison({ candidateSetDirectory: set.setDirectory, candidateIds: ids, rigProfileSource: fixture("rig-profile.local-svg.json"), outputRoot: join(root, "comparisons"), comparisonId: "hostile-comparison", createdAt: "2026-07-15T01:00:00Z" });
  const html = readFileSync(join(result.comparisonDirectory, "comparison.html"), "utf8");
  assert.match(html, /default-src 'none'.*frame-src 'self'.*connect-src 'none'/);
  assert.equal((html.match(/sandbox="allow-scripts"/g) ?? []).length, 2);
  assert.doesNotMatch(html, /allow-same-origin|https?:|<script[^>]+src=|<link\b|\b(?:fetch|XMLHttpRequest|WebSocket|import)\s*\(/i);
  assert.doesNotMatch(html, /<img src=x onerror|<script>globalThis\.HOSTILE/);
  assert.match(html, /&lt;img src=x onerror=/);
  assert.match(html, /class="sync-control" id="start" disabled/);
  assert.match(html, /window\.addEventListener\('load'.*button\.disabled=false/);
  assert.match(html, /startAtEpochMs=Date\.now\(\)\+3000/);
  assert.match(html, /grid-template-columns:repeat\(2,minmax\(320px,1fr\)\)/);
  assert.match(html, /@media\(max-width:680px\).*candidate-grid\{grid-template-columns:1fr\}/);
  for (const marker of ["rubric-notes", "check-notes", "data-observation-row", "review-error", "invalidLayer", "reviewStatus='pending'"]) assert.ok(html.includes(marker), marker);
  assert.match(html, /"preference":null/);
});

test("comparison explains silent review, semantic differences, anchored rubric, readable checks, and explicit score copying", async () => {
  const { result } = await bundle();
  const html = readFileSync(join(result.comparisonDirectory, "comparison.html"), "utf8");
  assert.match(html, /No audio is expected in this milestone/);
  assert.match(html, /Speech events only time the speaking and mouth posture/);
  assert.match(html, /Equal scores plus <strong>no preference<\/strong> are valid/);
  assert.match(html, /State vocabulary is the same and state order is the same/);
  assert.match(html, /Gesture vocabulary is the same and gesture sequence is the same/);
  assert.match(html, /Differences are primarily timing and intensity/);
  assert.match(html, /thinking 4\.5s–9\.7s \(5\.2s, intensity 0\.4\)/);
  assert.match(html, /micro_nod at 1\.6s/);
  assert.match(html, /qualified_answer at 15\.5s for 8s/);
  for (const label of ["State legibility", "Restraint", "Temporal coherence", "Epistemic legibility", "Rig stability and reset", "Small-tile readability", "Disclosed prototype identity", "Repeatability"]) assert.ok(html.includes(label), label);
  for (const anchor of ["1 — ", "3 — ", "5 — "]) assert.ok(html.includes(anchor), anchor);
  for (const label of ["Listening is distinct from idle", "Any agreement is restrained; no inappropriate agreement appears if absent", "Playback ends neutral", "Disclosure remains readable"]) assert.ok(html.includes(label), label);
  assert.match(html, /pair-level stop, safety, and lifecycle checks/);
  assert.match(html, /type="button" id="copy-scores">Copy left scores to right/);
  assert.match(html, /rubric-score\[data-side="left"\].*right\.value=left\.value/);
  const review = JSON.parse(readFileSync(join(result.comparisonDirectory, "review-record.json"), "utf8"));
  assert.deepEqual(Object.keys(review.rubric.left), ["stateLegibility", "restraint", "temporalCoherence", "epistemicLegibility", "rigStability", "smallTileReadability", "prototypeIdentity", "repeatability"]);
  assert.ok(Object.values(review.rubric).flatMap((side: any) => Object.values(side)).every((item: any) => item.score === null && item.notes === null));
  assert.equal(review.preference, null); assert.equal(review.rationale, null); assert.ok(Object.values(review.requiredChecks).every((item: any) => item.value === null));
});
