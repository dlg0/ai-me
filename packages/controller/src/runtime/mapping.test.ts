import assert from "node:assert/strict";
import test from "node:test";
import type { GestureEvent, StateEvent } from "../types.js";
import { mapEventToAbstractCommands } from "./mapping.js";

const gesture: GestureEvent = { id: "nod", type: "gesture", startMs: 0, durationMs: 1, gesture: "micro_nod", intensity: 0.25 };

test("abstract pose commands preserve bounded intensity without renderer fields", () => {
  const commands = mapEventToAbstractCommands(gesture);
  assert.deepEqual(commands, [{ kind: "pose", control: "micro_nod", intensity: 0.25 }]);
  assert.doesNotMatch(JSON.stringify(commands), /svg|vts|vtube|hotkey|selector|\"id\"/i);
});

test("attention maps to bounded renderer-neutral gaze controls", () => {
  const expected = { camera: [0, 0], current_speaker: [0, .1], none: [0, 0], down_left: [-.18, .24], down_right: [.18, .24], aside_left: [-.24, 0], aside_right: [.24, 0] } as const;
  for (const [attention, values] of Object.entries(expected)) {
    const event: StateEvent = { id: attention, type: "state", startMs: 0, durationMs: 1, state: "agreeing", attention: attention as StateEvent["attention"] };
    const gaze = mapEventToAbstractCommands(event).filter(command => command.kind === "parameter");
    assert.deepEqual(gaze, [{ kind: "parameter", control: "eye.gaze.x", normalizedValue: values[0] }, { kind: "parameter", control: "eye.gaze.y", normalizedValue: values[1] }]);
    assert.ok(gaze.every(command => Math.abs(command.normalizedValue) <= .24));
    assert.doesNotMatch(JSON.stringify(gaze), /avatar-|svg|vts|hotkey/i);
  }
});
