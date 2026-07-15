import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { AUTHORITATIVE_ANIMATION_PLAN_SCHEMA_JSON, renderScenarioPrompt } from "./prompt.js";
import type { ScenarioCase } from "./evaluate-corpus.js";

const scenario = { id: "s", title: "S", brief: "A brief", targetRig: "rig", durationMs: { min: 10, max: 20 }, expectations: { requiredStates: ["thinking"] } } satisfies ScenarioCase;
const template = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), "../../../../prompts/animation-planner.md"), "utf8");

test("renders every scenario placeholder and produces a stable template version", () => {
  const first = renderScenarioPrompt(template, scenario, 15);
  const second = renderScenarioPrompt(template, { ...scenario, brief: "Different" }, 15);
  assert.equal(first.templateVersion, second.templateVersion);
  assert.match(first.templateVersion, /^sha256:[a-f0-9]{64}$/);
  assert.match(first.text, /`rig`/);
  assert.match(first.text, /`15` ms/);
  assert.match(first.text, /`A brief`/);
  assert.ok(first.text.includes(JSON.stringify(scenario.expectations)));
  assert.ok(first.text.includes(AUTHORITATIVE_ANIMATION_PLAN_SCHEMA_JSON));
  assert.match(first.text, /"required":\["schemaVersion","title","durationMs","safetyMode","targetRig","tracks"\]/);
  assert.doesNotMatch(first.text, /{{/);
  assert.equal(first.text, renderScenarioPrompt(template, scenario, 15).text);
  assert.notEqual(first.templateVersion, renderScenarioPrompt(`${template}\n`, scenario, 15).templateVersion);
});

test("rejects missing, duplicate, unknown placeholders and out-of-range durations", () => {
  assert.throws(() => renderScenarioPrompt(template.replace("{{RIG_ID}}", "rig"), scenario), /RIG_ID.*found 0/);
  assert.throws(() => renderScenarioPrompt(`${template}\n{{RIG_ID}}`, scenario), /RIG_ID.*found 2/);
  assert.throws(() => renderScenarioPrompt(template.replace("{{SCENARIO_EXPECTATIONS_JSON}}", "none"), scenario), /SCENARIO_EXPECTATIONS_JSON.*found 0/);
  assert.throws(() => renderScenarioPrompt(`${template}\n{{AUTHORITATIVE_SCHEMA_JSON}}`, scenario), /AUTHORITATIVE_SCHEMA_JSON.*found 2/);
  assert.throws(() => renderScenarioPrompt(`${template}\n{{UNKNOWN}}`, scenario), /unresolved/);
  assert.throws(() => renderScenarioPrompt(template, scenario, 21), /between 10 and 20/);
});
