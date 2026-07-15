import type { AnimationPlan } from "../types.js";
import { createHash } from "node:crypto";
import { evaluateScenario, type ScenarioCase, type ScenarioEvaluation } from "./evaluate-corpus.js";
import type { PlannerPromptIdentity, RawPlannerProvider, RawPlannerResponse } from "./provider.js";

export const REPAIR_TEMPLATE_ID = "animation-planner-repair";
export const REPAIR_TEMPLATE_VERSION = "1";
export const DEFAULT_MAX_ATTEMPTS = 2;
export const MAX_ATTEMPTS = 3;

export interface PlannerOrchestrationInput {
  provider: RawPlannerProvider;
  scenario: ScenarioCase;
  prompt: string;
  identity: PlannerPromptIdentity;
  maxAttempts?: number;
  signal?: AbortSignal;
  orchestrationRequestId?: string;
}

export interface ExtractionFailure { code: "invalid-json" | "not-object"; message: string; }
export interface ProviderFailure { message: string; }
export interface PlannerAttempt {
  attempt: number;
  kind: "initial" | "repair";
  request: {
    prompt: string;
    identity: PlannerPromptIdentity;
    orchestrationRequestId?: string;
    clientRequestId?: string;
  };
  response?: RawPlannerResponse;
  extractionFailure?: ExtractionFailure;
  evaluation?: ScenarioEvaluation;
  providerError?: ProviderFailure;
}
export interface PlannerSuccess {
  ok: true;
  plan: AnimationPlan;
  attempts: PlannerAttempt[];
}
export interface PlannerFailure {
  ok: false;
  reason: "invalid-output" | "provider-error" | "cancelled";
  message: string;
  attempts: PlannerAttempt[];
}
export type PlannerOrchestrationResult = PlannerSuccess | PlannerFailure;

/** Parse one complete JSON object. This deliberately performs no substring recovery or value normalization. */
export function extractPlannerObject(text: string): { ok: true; value: Record<string, unknown> } | { ok: false; error: ExtractionFailure } {
  const source = text.trim();
  let value: unknown;
  try { value = JSON.parse(source); }
  catch (error) {
    return { ok: false, error: { code: "invalid-json", message: bounded(`Output is not exactly one complete JSON value: ${message(error)}`) } };
  }
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    const kind = Array.isArray(value) ? "array" : value === null ? "null" : typeof value;
    return { ok: false, error: { code: "not-object", message: `Output must be exactly one non-array JSON object; received ${kind}` } };
  }
  return { ok: true, value: value as Record<string, unknown> };
}

export async function orchestratePlanner(input: PlannerOrchestrationInput): Promise<PlannerOrchestrationResult> {
  const maxAttempts = input.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > MAX_ATTEMPTS)
    throw new Error(`maxAttempts must be an integer between 1 and ${MAX_ATTEMPTS}`);
  if (!input.prompt.trim()) throw new Error("Initial planner prompt must not be empty");
  if (input.identity.scenarioId !== input.scenario.id) throw new Error("Prompt identity scenarioId must match the selected scenario");

  const attempts: PlannerAttempt[] = [];
  let prompt = input.prompt;
  let identity = input.identity;
  for (let number = 1; number <= maxAttempts; number += 1) {
    if (input.signal?.aborted) return cancelled(attempts);
    const clientRequestId = input.orchestrationRequestId === undefined
      ? undefined
      : attemptClientRequestId(input.orchestrationRequestId, number);
    const attempt: PlannerAttempt = {
      attempt: number, kind: number === 1 ? "initial" : "repair",
      request: {
        prompt,
        identity: { ...identity },
        orchestrationRequestId: input.orchestrationRequestId,
        clientRequestId
      }
    };
    attempts.push(attempt);
    try {
      attempt.response = await input.provider.generate({ prompt, identity, signal: input.signal, clientRequestId });
    } catch (error) {
      const errorMessage = bounded(message(error));
      attempt.providerError = { message: errorMessage };
      if (input.signal?.aborted) return { ok: false, reason: "cancelled", message: "Planner generation cancelled by caller", attempts };
      return { ok: false, reason: "provider-error", message: errorMessage, attempts };
    }
    if (input.signal?.aborted) return cancelled(attempts);
    const extraction = extractPlannerObject(attempt.response.text);
    if (!extraction.ok) attempt.extractionFailure = extraction.error;
    else {
      attempt.evaluation = evaluateScenario(input.scenario, extraction.value);
      if (attempt.evaluation.valid) return { ok: true, plan: extraction.value as unknown as AnimationPlan, attempts };
    }
    if (input.signal?.aborted) return cancelled(attempts);
    if (number === maxAttempts)
      return { ok: false, reason: "invalid-output", message: `Planner output remained invalid after ${number} attempt${number === 1 ? "" : "s"}`, attempts };
    prompt = renderRepairPrompt(input.scenario, attempt);
    identity = { scenarioId: input.scenario.id, promptTemplateId: REPAIR_TEMPLATE_ID, promptTemplateVersion: REPAIR_TEMPLATE_VERSION };
  }
  throw new Error("Unreachable planner orchestration state");
}

export function renderRepairPrompt(scenario: ScenarioCase, attempt: PlannerAttempt): string {
  const failed = attempt.evaluation
    ? [
        ...selectPolicyFailures(attempt.evaluation.checks
          .filter(value => !value.passed && !value.id.startsWith("diagnostic-warning:"))),
        ...attempt.evaluation.diagnostics.slice(0, 24)
          .map(value => ({ type: `diagnostic:${value.severity}`, path: value.path, message: bounded(value.message, 300) }))
      ]
    : [{ type: "extraction", message: attempt.extractionFailure?.message ?? "Unknown extraction failure" }];
  const context = {
    template: { id: REPAIR_TEMPLATE_ID, version: REPAIR_TEMPLATE_VERSION },
    scenario: {
      id: scenario.id, targetRig: scenario.targetRig, durationMs: scenario.durationMs,
      expectations: scenario.expectations
    },
    failed,
    previousRawOutput: bounded(attempt.response?.text ?? "", 8_000)
  };
  return [
    "Repair the prior animation plan using the bounded context below.",
    "Return exactly one corrected JSON object only. Do not use Markdown fences, commentary, prefixes, suffixes, or multiple values.",
    JSON.stringify(context)
  ].join("\n");
}

function selectPolicyFailures(checks: ScenarioEvaluation["checks"]): Array<{ type: string; id: string; message: string }> {
  const critical = /^(target-rig|state-required:|full-duration-disclosure|terminal-neutral-reset)/;
  return [...checks]
    .sort((left, right) => Number(!critical.test(left.id)) - Number(!critical.test(right.id)))
    .slice(0, 24)
    .map(value => ({ type: "scenario-check", id: value.id, message: bounded(value.message, 300) }));
}

function attemptClientRequestId(orchestrationRequestId: string, attempt: number): string {
  const digest = createHash("sha256").update(orchestrationRequestId).digest("hex");
  return `aime-${digest}-attempt-${attempt}`;
}

function cancelled(attempts: PlannerAttempt[]): PlannerFailure {
  return { ok: false, reason: "cancelled", message: "Planner generation cancelled by caller", attempts };
}
function bounded(value: string, limit = 500): string { return value.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, " ").slice(0, limit); }
function message(error: unknown): string { return error instanceof Error ? error.message : String(error); }
