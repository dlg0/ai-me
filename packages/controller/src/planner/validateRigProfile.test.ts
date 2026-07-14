import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import type { LocalSvgRigProfile, VTubeRigProfile } from "../types.js";
import { validateRigProfile } from "./validateRigProfile.js";

const example = JSON.parse(
  readFileSync(resolve(process.cwd(), "../../examples/rig-profile.example.json"), "utf8")
) as VTubeRigProfile;
const localExample = JSON.parse(
  readFileSync(resolve(process.cwd(), "../../examples/rig-profile.local-svg.json"), "utf8")
) as LocalSvgRigProfile;

test("reference rig profile validates", () => {
  const result = validateRigProfile(example);
  assert.equal(result.valid, true, result.errors.join("\n"));
  assert.ok(result.warnings.some((warning) => /not bound/.test(warning)));
});

test("committed local SVG and VTube fixtures both validate", () => {
  assert.equal(validateRigProfile(example).valid, true);
  assert.equal(validateRigProfile(localExample).valid, true);
});

test("mixed renderer shapes reject in both directions", () => {
  assert.equal(validateRigProfile({ ...structuredClone(example), controls: localExample.controls }).valid, false);
  assert.equal(validateRigProfile({ ...structuredClone(localExample), hotkeys: example.hotkeys }).valid, false);
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

test("local invalid ranges and references are rejected", () => {
  const cases: Array<[string, (profile: LocalSvgRigProfile) => void, RegExp]> = [
    ["min >= max", (p) => { p.controls.headX.min = p.controls.headX.max; }, /min must be lower/],
    ["neutral outside range", (p) => { p.controls.headX.neutral = 100; }, /neutral must lie/],
    ["undeclared parameter target", (p) => { p.parameters["head.angle.x"] = "missing"; }, /undeclared control/],
    ["undeclared pose target", (p) => { p.poses.micro_nod[0].control = "missing"; }, /undeclared control/],
    ["out-of-range pose", (p) => { p.poses.micro_nod[0].value = 100; }, /within the control range/],
    ["duplicate SVG ID", (p) => { p.controls.headY.svgControlId = p.controls.headX.svgControlId; }, /duplicates SVG control ID/],
    ["duplicate pose target", (p) => { p.poses.micro_nod.push({ ...p.poses.micro_nod[0] }); }, /more than once/]
  ];
  for (const [name, mutate, expected] of cases) {
    const profile = structuredClone(localExample);
    mutate(profile);
    const result = validateRigProfile(profile);
    assert.equal(result.valid, false, name);
    assert.match(result.errors.join("\n"), expected, name);
  }
});

test("VTube range behavior remains enforced", () => {
  const invalidRange = structuredClone(example);
  invalidRange.parameters["head.angle.x"].min = invalidRange.parameters["head.angle.x"].max;
  assert.equal(validateRigProfile(invalidRange).valid, false);
  const validRange = structuredClone(example);
  validRange.parameters["head.angle.x"] = { vtsInputParameter: "FaceAngleX", min: -10, max: 20, neutral: 5 };
  assert.equal(validateRigProfile(validRange).valid, true);
});
