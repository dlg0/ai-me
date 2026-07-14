import assert from "node:assert/strict";
import test from "node:test";
import type { AnimationPlan } from "../types.js";
import { flattenTimeline } from "./timeline.js";

test("events are ordered by time and deterministic type priority", () => {
  const plan: AnimationPlan = {
    schemaVersion: "animation-plan.v1",
    title: "ordering",
    durationMs: 1000,
    safetyMode: "offline_review_only",
    targetRig: "test",
    tracks: {
      states: [{ id: "s", type: "state", startMs: 0, durationMs: 1000, state: "idle" }],
      gestures: [{ id: "g", type: "gesture", startMs: 0, durationMs: 100, gesture: "blink" }],
      overlays: [{ id: "o", type: "overlay", startMs: 0, durationMs: 1000, text: "AI delegate" }],
      speech: [{ id: "p", type: "speech", startMs: 0, text: "hello", speechAct: "factual_answer" }]
    }
  };

  assert.deepEqual(flattenTimeline(plan).map((event) => event.id), ["o", "s", "g", "p"]);
});
