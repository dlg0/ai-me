import type { AnimationPlan, AnimationState, Diagnostic, Gesture, SpeechAct } from "../types.js";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { compileSchemaFile, formatSchemaErrors } from "../validation/schema.js";
import { validateAnimationPlan } from "./validatePlan.js";

const schemaPath = resolve(dirname(fileURLToPath(import.meta.url)), "../../../../schemas/scenario-corpus.schema.json");
const validateCorpusSchema = compileSchemaFile(schemaPath);

export interface ScenarioExpectations {
  requiredStates?: AnimationState[];
  forbiddenStates?: AnimationState[];
  requiredSpeechActs?: SpeechAct[];
  forbiddenSpeechActs?: SpeechAct[];
  minimumRequiredStateDurationMs?: number;
  requiredStateOrder?: AnimationState[];
  requiredSpeechActStates?: Array<{ speechAct: SpeechAct; state: AnimationState }>;
  maxNonBlinkGestures?: number;
  fullDurationDisclosure?: boolean;
  terminalNeutralReset?: boolean;
}

export interface ScenarioCase {
  id: string;
  title: string;
  brief: string;
  targetRig: string;
  durationMs: { min: number; max: number };
  expectations: ScenarioExpectations;
}

export interface ScenarioCorpus {
  schemaVersion: "animation-plan-corpus.v1";
  scenarios: ScenarioCase[];
}

export interface ScenarioCheck { id: string; passed: boolean; message: string; }
export interface ScenarioEvaluation {
  scenarioId: string;
  planValid: boolean;
  scenarioValid: boolean;
  valid: boolean;
  diagnostics: Diagnostic[];
  checks: ScenarioCheck[];
}
export interface CorpusEvaluation {
  schemaVersion: "animation-plan-evaluation.v1";
  scenarioCount: number;
  validCount: number;
  validRate: number;
  results: ScenarioEvaluation[];
}

const automaticGestures = new Set<Gesture>(["blink", "slow_blink", "reset_neutral"]);

export function assertScenarioCorpus(value: unknown): asserts value is ScenarioCorpus {
  if (!validateCorpusSchema(value))
    throw new Error(`Invalid scenario corpus: ${formatSchemaErrors(validateCorpusSchema.errors).join("; ")}`);
  const corpus = value as ScenarioCorpus;
  const seen = new Set<string>();
  for (let index = 0; index < corpus.scenarios.length; index += 1) {
    const scenario = corpus.scenarios[index];
    const path = `/scenarios/${index}`;
    if (seen.has(scenario.id)) throw new Error(`Invalid scenario corpus: ${path}/id duplicates ${JSON.stringify(scenario.id)}`);
    seen.add(scenario.id);
    if (scenario.durationMs.min > scenario.durationMs.max)
      throw new Error(`Invalid scenario corpus: ${path}/durationMs min must be <= max`);
    for (const key of ["requiredStates", "forbiddenStates", "requiredSpeechActs", "forbiddenSpeechActs", "requiredStateOrder"] as const)
      assertUnique(scenario.expectations[key], `${path}/expectations/${key}`);
    const relationships = scenario.expectations.requiredSpeechActStates ?? [];
    const relationshipKeys = relationships.map(value => `${value.speechAct}\0${value.state}`);
    assertUnique(relationshipKeys, `${path}/expectations/requiredSpeechActStates`);
  }
}

export function evaluateScenario(scenario: ScenarioCase, candidate: unknown): ScenarioEvaluation {
  const validation = validateAnimationPlan(candidate);
  const checks: ScenarioCheck[] = [];
  if (validation.valid) applyExpectations(scenario, candidate as AnimationPlan, checks);
  for (const diagnostic of validation.diagnostics.filter(value => value.severity === "warning"))
    check(checks, `diagnostic-warning:${diagnostic.path}`, false, `${diagnostic.path} ${diagnostic.message}`);
  const scenarioValid = validation.valid && checks.every(check => check.passed);
  return {
    scenarioId: scenario.id,
    planValid: validation.valid,
    scenarioValid,
    valid: validation.valid && scenarioValid,
    diagnostics: validation.diagnostics,
    checks
  };
}

export function evaluateCorpus(corpus: ScenarioCorpus, candidates: Readonly<Record<string, unknown>>): CorpusEvaluation {
  const results = corpus.scenarios.map(scenario => evaluateScenario(scenario, candidates[scenario.id]));
  const validCount = results.filter(result => result.valid).length;
  return {
    schemaVersion: "animation-plan-evaluation.v1",
    scenarioCount: results.length,
    validCount,
    validRate: results.length === 0 ? 0 : validCount / results.length,
    results
  };
}

export function serializeCorpusEvaluation(report: CorpusEvaluation): string {
  return JSON.stringify(report, null, 2) + "\n";
}

function applyExpectations(scenario: ScenarioCase, plan: AnimationPlan, checks: ScenarioCheck[]): void {
  check(checks, "target-rig", plan.targetRig === scenario.targetRig, `targetRig must be ${JSON.stringify(scenario.targetRig)}`);
  check(checks, "duration", plan.durationMs >= scenario.durationMs.min && plan.durationMs <= scenario.durationMs.max,
    `durationMs must be between ${scenario.durationMs.min} and ${scenario.durationMs.max}`);
  const states = new Set(plan.tracks.states.map(event => event.state));
  const speechActs = new Set((plan.tracks.speech ?? []).map(event => event.speechAct));
  for (const state of scenario.expectations.requiredStates ?? [])
    check(checks, `state-required:${state}`, plan.tracks.states.some(event => event.state === state && event.durationMs >= (scenario.expectations.minimumRequiredStateDurationMs ?? 1)),
      `required state ${JSON.stringify(state)} must be present for at least ${scenario.expectations.minimumRequiredStateDurationMs ?? 1} ms`);
  for (const state of scenario.expectations.forbiddenStates ?? [])
    check(checks, `state-forbidden:${state}`, !states.has(state), `forbidden state ${JSON.stringify(state)} must be absent`);
  for (const act of scenario.expectations.requiredSpeechActs ?? [])
    check(checks, `speech-act-required:${act}`, speechActs.has(act), `required speech act ${JSON.stringify(act)} must be present`);
  for (const act of scenario.expectations.forbiddenSpeechActs ?? [])
    check(checks, `speech-act-forbidden:${act}`, !speechActs.has(act), `forbidden speech act ${JSON.stringify(act)} must be absent`);
  if (scenario.expectations.requiredStateOrder) {
    let cursor = -1;
    const ordered = scenario.expectations.requiredStateOrder.every(state => {
      cursor = plan.tracks.states.findIndex((event, index) => index > cursor && event.state === state);
      return cursor >= 0;
    });
    check(checks, "required-state-order", ordered, `states must occur in order: ${scenario.expectations.requiredStateOrder.join(" -> ")}`);
  }
  for (const relationship of scenario.expectations.requiredSpeechActStates ?? []) {
    const present = (plan.tracks.speech ?? []).some(speech => speech.speechAct === relationship.speechAct &&
      plan.tracks.states.some(state => state.state === relationship.state && state.startMs <= speech.startMs && speech.startMs < state.startMs + state.durationMs));
    check(checks, `speech-act-state:${relationship.speechAct}:${relationship.state}`, present,
      `speech act ${JSON.stringify(relationship.speechAct)} must start during state ${JSON.stringify(relationship.state)}`);
  }
  if (scenario.expectations.maxNonBlinkGestures !== undefined) {
    const count = plan.tracks.gestures.filter(event => !automaticGestures.has(event.gesture)).length;
    check(checks, "gesture-density", count <= scenario.expectations.maxNonBlinkGestures,
      `non-blink gesture count ${count} must not exceed ${scenario.expectations.maxNonBlinkGestures}`);
  }
  if (scenario.expectations.fullDurationDisclosure) {
    const present = (plan.tracks.overlays ?? []).some(event => event.startMs === 0 && event.durationMs >= plan.durationMs && /\b(ai|delegate)\b/i.test(event.text));
    check(checks, "full-duration-disclosure", present, "an AI/delegate disclosure overlay must cover the full plan duration");
  }
  if (scenario.expectations.terminalNeutralReset) {
    const states = [...plan.tracks.states].sort((a, b) => a.startMs - b.startMs);
    const contiguous = states.length > 0 && states[0].startMs === 0 && states.every((state, index) =>
      index === 0 || state.startMs === states[index - 1].startMs + states[index - 1].durationMs);
    const final = states.at(-1);
    const present = contiguous && final?.state === "reset_neutral" && final.startMs + final.durationMs === plan.durationMs;
    check(checks, "terminal-neutral-reset", present,
      "the contiguous state track must end with reset_neutral exactly at plan duration");
  }
}

function check(checks: ScenarioCheck[], id: string, passed: boolean, message: string): void {
  checks.push({ id, passed, message });
}

function assertUnique(values: readonly string[] | undefined, path: string): void {
  if (!values) return;
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) throw new Error(`Invalid scenario corpus: ${path} contains duplicate ${JSON.stringify(value)}`);
    seen.add(value);
  }
}
