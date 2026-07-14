import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import type { AnimationPlan, GestureEvent, LocalSvgRigProfile } from "../types.js";
import { mapEventToAbstractCommands } from "../runtime/mapping.js";
import { flattenTimeline } from "../runtime/timeline.js";
import { resolveLocalSvgCommands } from "./mapping.js";

const profile = JSON.parse(readFileSync(resolve(process.cwd(), "../../examples/rig-profile.local-svg.json"), "utf8")) as LocalSvgRigProfile;
const plan = JSON.parse(readFileSync(resolve(process.cwd(), "../../examples/example-animation-plan.json"), "utf8")) as AnimationPlan;

test("local pose intensity scales around neutral and IDs come from the profile", () => {
  const event: GestureEvent = { id: "nod", type: "gesture", startMs: 0, durationMs: 1, gesture: "micro_nod", intensity: 0.25 };
  const commands = resolveLocalSvgCommands(mapEventToAbstractCommands(event), profile);
  assert.deepEqual(commands, [{ kind: "controls", values: [{ id: "avatar-head-y", value: 1.5 }], sourceControls: ["micro_nod"] }]);
  const declaredIds = new Set(Object.values(profile.controls).map((control) => control.svgControlId));
  for (const command of commands) if (command.kind === "controls") for (const value of command.values) assert.ok(declaredIds.has(value.id));
});

test("neutral reset resolves exact neutral values", () => {
  const event: GestureEvent = { id: "reset", type: "gesture", startMs: 0, durationMs: 1, gesture: "reset_neutral", intensity: 0.1 };
  const controls = resolveLocalSvgCommands(mapEventToAbstractCommands(event), profile)[0];
  assert.ok(controls.kind === "controls");
  assert.ok(controls.values.every(({ id, value }) => Object.values(profile.controls).find((control) => control.svgControlId === id)?.neutral === value));
});

test("reference local profile matches the plan with no missing state or gesture mappings", () => {
  assert.equal(plan.targetRig, profile.rigId);
  const missing = flattenTimeline(plan).filter((event) => event.type === "state" || event.type === "gesture")
    .flatMap((event) => resolveLocalSvgCommands(mapEventToAbstractCommands(event), profile)
      .filter((command) => command.kind === "note" && /has no (?:pose|parameter) mapping/.test(command.message)));
  assert.deepEqual(missing, []);
});
