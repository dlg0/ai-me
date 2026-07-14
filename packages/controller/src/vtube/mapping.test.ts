import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import type { AnimationPlan, RigProfile, StateEvent } from "../types.js";
import { flattenTimeline } from "../runtime/timeline.js";
import { mapEventToVTubeCommands } from "./mapping.js";

const rig: RigProfile = {
  schemaVersion: "rig-profile.v1",
  rigId: "test-rig",
  renderer: "vtube_studio",
  parameters: {
    "head.angle.x": { vtsInputParameter: "FaceAngleX", min: -30, max: 30, neutral: 0 },
    "head.angle.y": { vtsInputParameter: "FaceAngleY", min: -30, max: 30, neutral: 0 },
    "head.angle.z": { vtsInputParameter: "FaceAngleZ", min: -30, max: 30, neutral: 0 }
  },
  hotkeys: { thinking: "Thinking Hotkey" }
};

const referencePlan = JSON.parse(
  readFileSync(resolve(process.cwd(), "../../examples/example-animation-plan.json"), "utf8")
) as AnimationPlan;
const referenceRig = JSON.parse(
  readFileSync(resolve(process.cwd(), "../../examples/rig-profile.example.json"), "utf8")
) as RigProfile;

test("thinking state resolves semantic controls through the rig profile", () => {
  const event: StateEvent = {
    id: "thinking",
    type: "state",
    startMs: 0,
    durationMs: 1000,
    state: "thinking",
    intensity: 0.5
  };

  const commands = mapEventToVTubeCommands(event, rig);
  const parameters = commands.find((command) => command.kind === "parameters");
  assert.ok(parameters && parameters.kind === "parameters");
  assert.deepEqual(parameters.values.map((value) => value.id), ["FaceAngleX", "FaceAngleY", "FaceAngleZ"]);
  assert.ok(commands.some((command) => command.kind === "hotkey" && command.hotkeySelector === "Thinking Hotkey"));
});

test("missing rig mappings become notes rather than hidden failures", () => {
  const event: StateEvent = {
    id: "agree",
    type: "state",
    startMs: 0,
    durationMs: 1000,
    state: "agreeing"
  };

  const commands = mapEventToVTubeCommands(event, rig);
  assert.ok(commands.some((command) => command.kind === "note" && /no hotkey mapping/.test(command.message)));
});

test("reference plan has a mapping for every state and gesture event", () => {
  assert.equal(referencePlan.targetRig, referenceRig.rigId);

  const missing = flattenTimeline(referencePlan)
    .filter((event) => event.type === "state" || event.type === "gesture")
    .flatMap((event) => mapEventToVTubeCommands(event, referenceRig)
      .filter((command) => command.kind === "note" && /has no (?:hotkey|parameter) mapping/.test(command.message))
      .map((command) => `${event.id}: ${command.kind === "note" ? command.message : ""}`));

  assert.deepEqual(missing, []);
});
