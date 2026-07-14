import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import type { RigProfile } from "../types.js";
import { validateRigProfile } from "./validateRigProfile.js";

const example = JSON.parse(
  readFileSync(resolve(process.cwd(), "../../examples/rig-profile.example.json"), "utf8")
) as RigProfile;

test("reference rig profile validates", () => {
  const result = validateRigProfile(example);
  assert.equal(result.valid, true, result.errors.join("\n"));
  assert.ok(result.warnings.some((warning) => /not bound/.test(warning)));
});

test("neutral outside parameter range is rejected", () => {
  const profile = structuredClone(example);
  profile.parameters["head.angle.x"].neutral = 50;
  const result = validateRigProfile(profile);
  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /neutral must lie/);
});

test("a declared model binding must identify the expected model", () => {
  const profile = structuredClone(example) as unknown as Record<string, unknown>;
  profile.model = { assetVersion: "0.1.0" };
  const result = validateRigProfile(profile);
  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /model/);
});
