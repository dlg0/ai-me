import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import type { AnimationPlan } from "../types.js";
import { validateAnimationPlan } from "./validatePlan.js";

const example = JSON.parse(
  readFileSync(resolve(process.cwd(), "../../examples/example-animation-plan.json"), "utf8")
) as AnimationPlan;

test("reference animation plan passes schema and semantic validation", () => {
  const result = validateAnimationPlan(example);
  assert.equal(result.valid, true, result.errors.join("\n"));
  assert.deepEqual(result.errors, []);
});

test("wrong schema version is rejected", () => {
  const plan = structuredClone(example) as unknown as Record<string, unknown>;
  plan.schemaVersion = "animation-plan.v999";
  const result = validateAnimationPlan(plan);
  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /schemaVersion/);
});

test("unknown emphasis gesture is rejected by the schema", () => {
  const plan = structuredClone(example);
  plan.tracks.speech![0].emphasis![0].gesture = "raw_eyebrow_curve" as never;
  const result = validateAnimationPlan(plan);
  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /emphasis/);
});

test("duplicate event IDs are rejected", () => {
  const plan = structuredClone(example);
  plan.tracks.gestures[0].id = plan.tracks.states[0].id;
  const result = validateAnimationPlan(plan);
  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /duplicate event id/);
});

test("duplicate IDs within one track report the later event path", () => {
  const plan = structuredClone(example);
  plan.tracks.gestures[1].id = plan.tracks.gestures[0].id;
  const result = validateAnimationPlan(plan);
  assert.equal(result.valid, false);
  assert.ok(result.diagnostics.some((diagnostic) =>
    diagnostic.path === "/tracks/gestures/1" && /duplicate event id/.test(diagnostic.message)
  ));
});

test("events extending beyond the plan are rejected", () => {
  const plan = structuredClone(example);
  plan.tracks.gestures[0].startMs = plan.durationMs - 100;
  plan.tracks.gestures[0].durationMs = 500;
  const result = validateAnimationPlan(plan);
  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /beyond plan duration/);
});

test("overlapping high-level states are rejected", () => {
  const plan = structuredClone(example);
  plan.tracks.states[1].startMs = 4000;
  const result = validateAnimationPlan(plan);
  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /state overlaps/);
});
