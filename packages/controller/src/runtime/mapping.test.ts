import assert from "node:assert/strict";
import test from "node:test";
import type { GestureEvent } from "../types.js";
import { mapEventToAbstractCommands } from "./mapping.js";

const gesture: GestureEvent = { id: "nod", type: "gesture", startMs: 0, durationMs: 1, gesture: "micro_nod", intensity: 0.25 };

test("abstract pose commands preserve bounded intensity without renderer fields", () => {
  const commands = mapEventToAbstractCommands(gesture);
  assert.deepEqual(commands, [{ kind: "pose", control: "micro_nod", intensity: 0.25 }]);
  assert.doesNotMatch(JSON.stringify(commands), /svg|vts|vtube|hotkey|selector|\"id\"/i);
});
