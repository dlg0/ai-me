import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import type { AnimationPlan, GestureEvent, StateEvent } from "../types.js";
import { compileRenderScript, serializeRenderScript } from "./render-script.js";
import type { RenderScriptFrameRecord, RenderScriptInterruptionRecord } from "./render-script.js";

const example = JSON.parse(readFileSync(resolve(process.cwd(), "../../examples/example-animation-plan.json"), "utf8"));

function plan(states: StateEvent[], gestures: GestureEvent[] = [], durationMs = 1000): AnimationPlan {
  return { schemaVersion: "animation-plan.v1", title: "test", durationMs, safetyMode: "local_operator_approved", targetRig: "abstract-test", tracks: { states, gestures } };
}
function frames(records: ReturnType<typeof compileRenderScript>): RenderScriptFrameRecord[] { return records.filter((r): r is RenderScriptFrameRecord => r.record === "frame"); }

test("example compilation is byte deterministic and renderer independent", () => {
  const first = serializeRenderScript(compileRenderScript(example));
  assert.equal(first, serializeRenderScript(compileRenderScript(example)));
  assert.equal(first.endsWith("\n"), true);
  for (const forbidden of ["svgControlId", "vtsInputParameter", "FaceAngleX", "avatar-head", "hotkey"]) assert.equal(first.includes(forbidden), false);
});

test("small render script is an exact JSONL golden including trailing newline", () => {
  const value = plan([{ id: "s", type: "state", startMs: 0, durationMs: 1000, state: "listening", intensity: 1 }]);
  const actual = serializeRenderScript(compileRenderScript(value, { tickMs: 500, transitionMs: 500 }));
  const expected = [
    '{"record":"header","schemaVersion":"render-script.v1","title":"test","targetRig":"abstract-test","safetyMode":"local_operator_approved","durationMs":1000,"effectiveStopMs":1000,"tickMs":500,"transitionMs":500,"easing":"smoothstep:t*t*(3-2*t)","valueDecimals":4,"posePolicy":"unique abstract pose names; coalesce same-name contributions by maximum weight with sorted sourceEventIds; state before gesture, then startMs and event ID; after rig resolution later listed poses win renderer-control collisions"}',
    '{"record":"event","edge":"start","atMs":0,"eventId":"s","eventType":"state","name":"listening"}',
    '{"record":"frame","tick":0,"atMs":0,"phase":"playback","params":{"eye.gaze.x":0,"eye.gaze.y":0,"head.angle.x":0,"head.angle.y":0,"head.angle.z":0},"poses":[],"activeEventIds":["s"]}',
    '{"record":"frame","tick":1,"atMs":500,"phase":"playback","params":{"eye.gaze.x":0,"eye.gaze.y":0,"head.angle.x":0,"head.angle.y":0.104,"head.angle.z":0},"poses":[],"activeEventIds":["s"]}',
    '{"record":"event","edge":"end","atMs":1000,"eventId":"s","eventType":"state","name":"listening"}',
    '{"record":"frame","tick":2,"atMs":1000,"phase":"playback","params":{"eye.gaze.x":0,"eye.gaze.y":0,"head.angle.x":0,"head.angle.y":0.104,"head.angle.z":0},"poses":[],"activeEventIds":[]}',
    '{"record":"end","atMs":1000,"outcome":"completed"}',
    '{"record":"reset","atMs":1000,"params":{"eye.gaze.x":0,"eye.gaze.y":0,"head.angle.x":0,"head.angle.y":0,"head.angle.z":0},"poses":[]}',
    '{"record":"release","atMs":1000}'
  ].join("\n") + "\n";
  assert.equal(actual, expected);
});

test("smoothstep midpoint, state restoration, and gap neutral hold", () => {
  const value = plan([
    { id: "thinking", type: "state", startMs: 0, durationMs: 200, state: "thinking", intensity: 1 },
    { id: "agree", type: "state", startMs: 700, durationMs: 300, state: "agreeing", intensity: 1 }
  ]);
  const result = frames(compileRenderScript(value, { tickMs: 50, transitionMs: 100 }));
  assert.equal(result.find((f) => f.atMs === 50)?.params["head.angle.x"], -0.0975);
  assert.equal(result.find((f) => f.atMs === 250)?.params["head.angle.x"], -0.0975);
  assert.equal(result.find((f) => f.atMs === 300)?.params["head.angle.x"], 0);
  assert.deepEqual(result.find((f) => f.atMs === 300)?.params, result.find((f) => f.atMs === 650)?.params);
  assert.equal(result.find((f) => f.atMs === 800)?.params["head.angle.x"], 0);
});

test("same-time markers order ends, starts, then frame", () => {
  const records = compileRenderScript(plan([
    { id: "a", type: "state", startMs: 0, durationMs: 500, state: "idle" },
    { id: "b", type: "state", startMs: 500, durationMs: 500, state: "idle" }
  ]), { tickMs: 500, transitionMs: 500 });
  assert.deepEqual(records.filter((r) => r.record !== "header" && r.atMs === 500).map((r) => [r.record, r.record === "event" ? r.edge : undefined]), [["event", "end"], ["event", "start"], ["frame", undefined]]);
});

test("same-pose gesture overlap is rejected but adjacency is accepted", () => {
  const state: StateEvent = { id: "s", type: "state", startMs: 0, durationMs: 1000, state: "idle" };
  const a: GestureEvent = { id: "a", type: "gesture", startMs: 100, durationMs: 200, gesture: "blink" };
  assert.throws(() => compileRenderScript(plan([state], [a, { ...a, id: "b", startMs: 200 }])), /Overlapping gesture pose 'blink'.*a.*b/);
  assert.doesNotThrow(() => compileRenderScript(plan([state], [a, { ...a, id: "b", startMs: 300 }])));
});

test("poses remain state-first across a spanning gesture and coalesce same names", () => {
  const records = frames(compileRenderScript(plan(
    [{ id: "later-state", type: "state", startMs: 200, durationMs: 800, state: "deferring" }],
    [{ id: "early-gesture", type: "gesture", startMs: 0, durationMs: 800, gesture: "brow_raise" }, { id: "same", type: "gesture", startMs: 100, durationMs: 700, gesture: "defer_to_human", intensity: 0.5 }]
  ), { tickMs: 100, transitionMs: 200 }));
  const poses = records.find((frame) => frame.atMs === 400)!.poses;
  assert.deepEqual(poses.map((pose) => pose.name), ["defer_to_human", "brow_raise"]);
  assert.deepEqual(poses[0], { name: "defer_to_human", weight: 0.65, sourceEventIds: ["later-state", "same"] });
});

test("playback frames stay on the fixed grid while terminal records preserve duration", () => {
  const records = compileRenderScript(plan([{ id: "s", type: "state", startMs: 0, durationMs: 1050, state: "idle" }], [], 1050), { tickMs: 100, transitionMs: 200 });
  assert.deepEqual(frames(records).map((frame) => frame.atMs), [0, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000]);
  assert.deepEqual(records.slice(-3).map((record) => record.record === "header" ? undefined : record.atMs), [1050, 1050, 1050]);
});

test("compiler options enforce interruption and reset-grid contracts", () => {
  const value = plan([{ id: "s", type: "state", startMs: 0, durationMs: 1000, state: "idle" }]);
  assert.throws(() => compileRenderScript(value, { tickMs: 100, transitionMs: 250 }), /multiple of tickMs/);
  assert.throws(() => compileRenderScript(value, { reason: "not interrupted" }), /reason is only valid/);
  assert.throws(() => compileRenderScript(value, { outcome: "cancelled", stopAtMs: 12.5 }), /safe integer/);
  assert.throws(() => compileRenderScript(value, { outcome: "error", stopAtMs: 500, reason: "   " }), /non-empty/);
});

test("gesture attacks, peaks, releases and restores rest", () => {
  const result = frames(compileRenderScript(plan([{ id: "s", type: "state", startMs: 0, durationMs: 1000, state: "idle" }], [{ id: "g", type: "gesture", startMs: 200, durationMs: 400, gesture: "blink", intensity: 0.5 }]), { tickMs: 100, transitionMs: 200 }));
  assert.deepEqual([200, 400, 500, 600].map((at) => result.find((f) => f.atMs === at)?.poses[0]?.weight ?? 0), [0, 0.5, 0.25, 0]);
});

for (const outcome of ["cancelled", "error"] as const) test(`${outcome} truncates and deterministically resets`, () => {
  const value = plan([{ id: "s", type: "state", startMs: 0, durationMs: 1000, state: "thinking" }], [{ id: "g", type: "gesture", startMs: 100, durationMs: 600, gesture: "blink" }]);
  const records = compileRenderScript(value, { outcome, stopAtMs: 375, reason: "test", tickMs: 100, transitionMs: 200 });
  const interruption = records.find((r): r is RenderScriptInterruptionRecord => r.record === "cancelled" || r.record === "error");
  assert.equal(interruption?.effectiveStopMs, 300);
  assert.equal(records.some((r) => r.record === "event" && r.atMs > 300), false);
  assert.deepEqual(records.slice(-3).map((r) => r.record), ["end", "reset", "release"]);
  const reset = records.at(-2);
  assert.deepEqual(reset?.record === "reset" ? reset.poses : undefined, []);
  assert.ok(frames(records).filter((f) => f.phase === "reset").every((f, i, all) => i === 0 || (f.poses[0]?.weight ?? 0) <= (all[i - 1]!.poses[0]?.weight ?? 0)));
});

test("completed terminal contract is exact neutral reset and release", () => {
  const records = compileRenderScript(example);
  assert.deepEqual(records.slice(-3).map((r) => r.record), ["end", "reset", "release"]);
  const reset = records.at(-2);
  assert.ok(reset?.record === "reset" && Object.values(reset.params).every((v) => v === 0));
  assert.deepEqual(reset?.record === "reset" ? reset.poses : undefined, []);
});
