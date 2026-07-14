import assert from "node:assert/strict";
import test from "node:test";
import type { VTubeRigProfile, StateEvent } from "../types.js";
import { mapEventToVTubeCommands } from "./mapping.js";

const rig: VTubeRigProfile = {
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
