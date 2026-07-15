import { createHash } from "node:crypto";
import type { ScenarioCase } from "./evaluate-corpus.js";

const required = ["RIG_ID", "DURATION_MS", "SCENE_BRIEF"] as const;

export interface RenderedPlannerPrompt {
  text: string;
  templateId: "animation-planner";
  templateVersion: string;
  durationMs: number;
}

export function renderScenarioPrompt(template: string, scenario: ScenarioCase, durationMs = scenario.durationMs.max): RenderedPlannerPrompt {
  if (!Number.isInteger(durationMs) || durationMs < scenario.durationMs.min || durationMs > scenario.durationMs.max)
    throw new Error(`Prompt duration must be an integer between ${scenario.durationMs.min} and ${scenario.durationMs.max}`);
  const values: Record<(typeof required)[number], string> = {
    RIG_ID: scenario.targetRig,
    DURATION_MS: String(durationMs),
    SCENE_BRIEF: scenario.brief
  };
  let text = template;
  for (const name of required) {
    const token = `{{${name}}}`;
    const count = text.split(token).length - 1;
    if (count !== 1) throw new Error(`Prompt template must contain ${token} exactly once; found ${count}`);
    text = text.replace(token, values[name]);
  }
  const unresolved = text.match(/{{[^{}]+}}/g);
  if (unresolved) throw new Error(`Prompt template contains unresolved placeholder ${unresolved[0]}`);
  return {
    text,
    templateId: "animation-planner",
    templateVersion: `sha256:${createHash("sha256").update(template, "utf8").digest("hex")}`,
    durationMs
  };
}
