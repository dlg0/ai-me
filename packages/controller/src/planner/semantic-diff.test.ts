import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import type { AnimationPlan } from "../types.js";
import { diffSemanticPlans, loadCandidatePlan, serializeSemanticDiff } from "./semantic-diff.js";

const source = JSON.parse(readFileSync(resolve(process.cwd(), "../../examples/example-animation-plan.json"), "utf8")) as AnimationPlan;
const clone = (): AnimationPlan => JSON.parse(JSON.stringify(source));

test("semantic diff reports deterministic state, gesture, speech, and overlay changes", () => {
  const right = clone();
  right.tracks.states[0].attention = "camera";
  right.tracks.states[0].affect!.warmth = .9;
  right.tracks.gestures[0].intensity = .8;
  right.tracks.gestures.push({ ...right.tracks.gestures[0], id: "added", startMs: 26000, gesture: "half_smile" });
  right.tracks.speech![0].text = "Changed semantic speech";
  right.tracks.overlays = [];
  const diff = diffSemanticPlans(source, right);
  const paths = diff.changes.map(value => value.path);
  for (const fragment of ["/tracks/states/0/attention", "/tracks/states/0/affect/warmth", "/tracks/gestures/0/intensity", "/tracks/gestures/6", "/tracks/speech/0/text", "/tracks/overlays/0"])
    assert.ok(paths.includes(fragment), fragment);
  const first = serializeSemanticDiff(diff);
  assert.deepEqual(first, serializeSemanticDiff(diffSemanticPlans(source, right)));
  assert.doesNotMatch(first.json + first.markdown, /rendererControl|svgControl|frame|tick/);
});

test("event IDs, reasons, and planner notes are ignored", () => {
  const right = clone();
  right.plannerNotes = "different noise";
  for (const events of Object.values(right.tracks)) for (const event of events ?? []) { event.id = `changed-${event.id}`; event.reason = "different reason"; }
  assert.equal(diffSemanticPlans(source, right).changes.length, 0);
});

test("event insertions and removals align without index-shift cascades", () => {
  for (const index of [0, 2]) {
    const inserted = clone();
    inserted.tracks.gestures.splice(index, 0, { id: `inserted-${index}`, type: "gesture", startMs: index ? 6000 : 0, durationMs: 200, gesture: "brow_furrow" });
    const additions = diffSemanticPlans(source, inserted).changes;
    assert.equal(additions.length, 1);
    assert.deepEqual(additions[0], { kind: "added", path: `/tracks/gestures/${index}`, after: { type: "gesture", startMs: index ? 6000 : 0, durationMs: 200, gesture: "brow_furrow" } });

    const removed = clone();
    removed.tracks.gestures.splice(index, 1);
    const removals = diffSemanticPlans(source, removed).changes;
    assert.equal(removals.length, 1);
    assert.equal(removals[0].kind, "removed");
    assert.equal(removals[0].path, `/tracks/gestures/${index}`);
  }
});

function candidateSetFixture(): { directory: string; manifest: any; planPath: string } {
  const directory = mkdtempSync(join(tmpdir(), "aime-diff-"));
  const planPath = "plans/candidate.json";
  const bytes = Buffer.from(JSON.stringify(source));
  mkdirSync(resolve(directory, "plans"));
  writeFileSync(resolve(directory, planPath), bytes, { flag: "wx" });
  const digest = createHash("sha256").update(bytes).digest("hex");
  const manifest = { candidates: [{ candidateId: "candidate-1", planPath, planSha256: digest }], artifactSha256: { [planPath]: digest } };
  writeFileSync(resolve(directory, "manifest.json"), JSON.stringify(manifest));
  return { directory, manifest, planPath };
}

test("candidate IDs load only checksum-verified plan bytes", () => {
  const fixture = candidateSetFixture();
  assert.equal(loadCandidatePlan(fixture.directory, "candidate-1").plan.title, source.title);
  writeFileSync(resolve(fixture.directory, fixture.planPath), JSON.stringify({ ...source, title: "tampered" }));
  assert.throws(() => loadCandidatePlan(fixture.directory, "candidate-1"), /checksum mismatch/);
});

test("candidate ID loading requires both checksums and safe relative paths", () => {
  for (const missing of ["candidate", "artifact"] as const) {
    const fixture = candidateSetFixture();
    if (missing === "candidate") delete fixture.manifest.candidates[0].planSha256;
    else delete fixture.manifest.artifactSha256[fixture.planPath];
    writeFileSync(resolve(fixture.directory, "manifest.json"), JSON.stringify(fixture.manifest));
    assert.throws(() => loadCandidatePlan(fixture.directory, "candidate-1"), /checksums are required/);
  }
  const fixture = candidateSetFixture();
  fixture.manifest.candidates[0].planPath = "../outside.json";
  writeFileSync(resolve(fixture.directory, "manifest.json"), JSON.stringify(fixture.manifest));
  assert.throws(() => loadCandidatePlan(fixture.directory, "candidate-1"), /escapes candidate-set/);
});

test("candidate plan loading rejects symlink escapes", (context) => {
  const fixture = candidateSetFixture();
  const outside = resolve(fixture.directory, "../outside-plan.json");
  writeFileSync(outside, JSON.stringify(source));
  try { symlinkSync(outside, resolve(fixture.directory, "plans/link.json")); }
  catch (error: any) { if (["EPERM", "EACCES", "ENOTSUP"].includes(error?.code)) return context.skip("platform denied symlink creation"); throw error; }
  fixture.manifest.candidates[0].planPath = "plans/link.json";
  fixture.manifest.artifactSha256["plans/link.json"] = fixture.manifest.candidates[0].planSha256;
  writeFileSync(resolve(fixture.directory, "manifest.json"), JSON.stringify(fixture.manifest));
  assert.throws(() => loadCandidatePlan(fixture.directory, "candidate-1"), /escapes candidate-set/);
});
