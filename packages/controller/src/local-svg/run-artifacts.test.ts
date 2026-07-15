import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import type { LocalSvgRigProfile } from "../types.js";
import type { RenderScriptRecord } from "../runtime/render-script.js";
import { buildLocalSvgRendererLog, createLocalSvgRun } from "./run-artifacts.js";

const fixture = (name: string) => readFileSync(resolve(process.cwd(), `../../${name}`), "utf8");
const planSource = fixture("examples/example-animation-plan.json");
const profileSource = fixture("examples/rig-profile.local-svg.json");
const reviewNotesTemplate = fixture("templates/review-notes.md");
const root = () => mkdtempSync(join(tmpdir(), "aime-run-"));
const fixed = { planSource, rigProfileSource: profileSource, reviewNotesTemplate, createdAt: "2026-07-14T12:34:56.789Z" };
const read = (dir: string, name: string) => readFileSync(join(dir, name), "utf8");
const manifest = (dir: string) => JSON.parse(read(dir, "manifest.json"));
const sha = (value: string) => createHash("sha256").update(value).digest("hex");

test("completed bundle is deterministic, exact, checksummed, and logs renderer evidence", () => {
  const a = createLocalSvgRun({ ...fixed, outputRoot: root(), runId: "fixed-a" });
  const b = createLocalSvgRun({ ...fixed, outputRoot: root(), runId: "fixed-b" });
  assert.equal(read(a.runDirectory, "plan.json"), planSource);
  assert.equal(read(a.runDirectory, "rig-profile.json"), profileSource);
  assert.equal(read(a.runDirectory, "review-notes.md"), reviewNotesTemplate);
  for (const name of ["validation-diagnostics.json", "render-script.jsonl", "renderer-log.jsonl", "player.html"]) assert.equal(read(a.runDirectory, name), read(b.runDirectory, name), name);
  const m = manifest(a.runDirectory);
  assert.equal(m.status, "finalized"); assert.equal(m.outcome, "completed");
  assert.equal(m.sourceSha256["plan.json"], sha(planSource)); assert.equal(m.resetEvidence, true); assert.equal(m.releaseEvidence, true);
  assert.deepEqual(m.recording, { path: null, sha256: null }); assert.match(m.identity, /Offline AI-delegate prototype/);
  for (const [name, checksum] of Object.entries(m.artifactSha256)) assert.equal(checksum, sha(read(a.runDirectory, name)));
  const logs = read(a.runDirectory, "renderer-log.jsonl").trim().split("\n").map(line => JSON.parse(line));
  for (const category of ["planned_event_edge", "resolved_frame", "playback_end", "final_reset", "release"]) assert.ok(logs.some(line => line.category === category), category);
  const frame = logs.find(line => line.category === "resolved_frame" && line.activeEventIds.length);
  assert.equal(typeof frame.atMs, "number"); assert.ok(frame.abstract.params); assert.ok(frame.rendererControls); assert.ok(frame.activeEventIds.every((id: unknown) => typeof id === "string"));
});

test("cancelled and explicit error attempts finalize matching reset players", () => {
  for (const outcome of ["cancelled", "error"] as const) {
    const result = createLocalSvgRun({ ...fixed, outputRoot: root(), runId: outcome, compile: { outcome, stopAtMs: 1234, reason: `${outcome} test` } });
    assert.equal(result.outcome, outcome); assert.equal(manifest(result.runDirectory).status, "finalized");
    const script = read(result.runDirectory, "render-script.jsonl");
    assert.match(script, new RegExp(`"record":"${outcome}"`)); assert.match(script, /"phase":"reset"/); assert.match(script, /"record":"release"/);
    assert.match(read(result.runDirectory, "player.html"), new RegExp(`"outcome":"${outcome}"`));
  }
});

test("default IDs are stable for injected inputs and existing folders are never overwritten", () => {
  const outputRoot = join(root(), "new-output-root");
  const first = createLocalSvgRun({ ...fixed, outputRoot });
  assert.match(first.runId, /^20260714T123456\.789Z-[a-f0-9]{12}$/);
  assert.throws(() => createLocalSvgRun({ ...fixed, outputRoot }), /EEXIST/);
  assert.equal(manifest(first.runDirectory).runId, first.runId);
});

test("malformed input retains sources, diagnostics, and a visibly failed player", () => {
  const bad = "{ definitely not json\n";
  const result = createLocalSvgRun({ ...fixed, planSource: bad, outputRoot: root(), runId: "malformed" });
  assert.equal(result.status, "failed"); assert.equal(read(result.runDirectory, "plan.json"), bad);
  assert.equal(manifest(result.runDirectory).outcome, "error"); assert.match(read(result.runDirectory, "player.html"), /failed run/); assert.match(read(result.runDirectory, "validation-diagnostics.json"), /Invalid JSON/);
  assert.throws(() => read(result.runDirectory, "render-script.jsonl"));
});

test("predictable adapter failures finalize failed evidence and retain a compiled script", () => {
  const profile = JSON.parse(profileSource);
  delete profile.poses.micro_nod;
  const result = createLocalSvgRun({ ...fixed, rigProfileSource: JSON.stringify(profile), outputRoot: root(), runId: "missing-mapping" });
  const m = manifest(result.runDirectory);
  assert.equal(result.status, "failed"); assert.equal(m.status, "failed");
  assert.match(read(result.runDirectory, "render-script.jsonl"), /"record":"header"/);
  assert.match(read(result.runDirectory, "renderer-log.jsonl"), /generation_error/);
  assert.match(read(result.runDirectory, "player.html"), /failed run/);
  for (const name of ["render-script.jsonl", "renderer-log.jsonl", "player.html"]) assert.equal(m.artifactSha256[name], sha(read(result.runDirectory, name)));
});

test("renderer decisions log coalescing once and identify overwritten parameter and pose owners", () => {
  const profile = JSON.parse(profileSource) as LocalSvgRigProfile;
  const records: RenderScriptRecord[] = [{
    record: "frame", tick: 1, atMs: 50, phase: "playback",
    params: { "head.angle.z": .2 },
    poses: [
      { name: "uncertain", weight: .4, sourceEventIds: ["state-a", "state-b"] },
      { name: "caveat_expression", weight: .5, sourceEventIds: ["gesture-a"] }
    ],
    activeEventIds: ["gesture-a", "state-a", "state-b"]
  }];
  const frame = buildLocalSvgRendererLog(records, profile).find((entry: any) => entry.category === "resolved_frame") as any;
  assert.equal(frame.suppressionDecisions.filter((entry: any) => entry.decision === "coalesced").length, 1);
  assert.ok(frame.suppressionDecisions.some((entry: any) => entry.decision === "later_pose_wins" && entry.rendererControlId === "avatar-head-z" && entry.suppressedKind === "parameter" && entry.winningPose === "uncertain"));
  assert.ok(frame.suppressionDecisions.some((entry: any) => entry.decision === "later_pose_wins" && entry.rendererControlId === "avatar-caveat" && entry.suppressedKind === "pose" && entry.winningPose === "caveat_expression"));
});

test("unexpected finalization failure retains an incomplete folder and error evidence", () => {
  const outputRoot = root();
  assert.throws(() => createLocalSvgRun({ ...fixed, outputRoot, runId: "incomplete", beforeFinalization: () => { throw new Error("injected finalization failure"); } }), /retained incomplete/);
  const directory = join(outputRoot, "incomplete");
  assert.equal(manifest(directory).status, "incomplete"); assert.match(read(directory, "generation-error.json"), /injected finalization failure/);
  assert.equal(read(directory, "plan.json"), planSource); assert.ok(read(directory, "render-script.jsonl").length > 0);
});
