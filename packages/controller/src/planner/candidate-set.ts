import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { ScenarioCase } from "./evaluate-corpus.js";
import { orchestratePlanner, type PlannerOrchestrationResult } from "./orchestrate.js";
import type { PlannerPromptIdentity, RawPlannerProvider } from "./provider.js";

export const CANDIDATE_SET_SCHEMA_VERSION = "planner-candidate-set.v1";
export const MIN_CANDIDATES = 2;
export const MAX_CANDIDATES = 5;

export interface GenerateCandidateSetInput {
  provider: RawPlannerProvider;
  scenario: ScenarioCase;
  prompt: string;
  identity: PlannerPromptIdentity;
  count: number;
  outputRoot: string;
  setId?: string;
  createdAt?: string;
  signal?: AbortSignal;
}

export interface CandidateManifestEntry {
  ordinal: number;
  candidateId: string;
  status: "succeeded" | "failed" | "cancelled";
  orchestrationId: string;
  provenancePath: string;
  provenanceSha256: string;
  planPath?: string;
  planSha256?: string;
  duplicateOf?: string;
  failureReason?: "invalid-output" | "provider-error" | "cancelled";
  provider?: string;
  model?: string;
}

export interface CandidateSetManifest {
  schemaVersion: typeof CANDIDATE_SET_SCHEMA_VERSION;
  setId: string;
  createdAt: string;
  status: "completed" | "partial" | "failed" | "cancelled";
  scenarioId: string;
  promptIdentity: PlannerPromptIdentity;
  requested: number;
  generated: number;
  succeeded: number;
  failed: number;
  cancelled: number;
  scenarioPath: "scenario.json";
  promptPath: "prompt.txt";
  candidates: CandidateManifestEntry[];
  artifactSha256: Record<string, string>;
}

export interface CandidateSetResult { setId: string; setDirectory: string; manifest: CandidateSetManifest; }

export async function generateCandidateSet(input: GenerateCandidateSetInput): Promise<CandidateSetResult> {
  assertCount(input.count);
  if (!input.prompt.trim()) throw new Error("Rendered prompt must not be empty");
  if (input.identity.scenarioId !== input.scenario.id) throw new Error("Prompt identity scenarioId must match the selected scenario");
  const createdAt = input.createdAt ?? new Date().toISOString();
  if (!Number.isFinite(Date.parse(createdAt))) throw new Error("createdAt must be an ISO-compatible timestamp");
  const setId = input.setId ?? `${createdAt.replace(/[-:]/g, "")}-${sha256(canonicalJson({ scenario: input.scenario, prompt: input.prompt, identity: input.identity })).slice(0, 12)}`;
  assertSafeId(setId, "setId");
  const root = resolve(input.outputRoot);
  mkdirSync(root, { recursive: true });
  const directory = resolve(root, setId);
  mkdirSync(directory, { recursive: false });
  mkdirSync(resolve(directory, "attempts"));
  mkdirSync(resolve(directory, "plans"));
  write(directory, "scenario.json", pretty(input.scenario));
  write(directory, "prompt.txt", input.prompt);

  const candidates: CandidateManifestEntry[] = [];
  const firstByPlanHash = new Map<string, string>();
  let generated = 0;
  for (let ordinal = 1; ordinal <= input.count; ordinal += 1) {
    const orchestrationId = `${setId}-candidate-${ordinal}`;
    let result: PlannerOrchestrationResult;
    if (input.signal?.aborted) {
      result = { ok: false, reason: "cancelled", message: "Candidate slot unattempted because caller cancellation was observed", attempts: [] };
    } else {
      generated += 1;
      result = await orchestratePlanner({ provider: input.provider, scenario: input.scenario, prompt: input.prompt, identity: input.identity, orchestrationRequestId: orchestrationId, signal: input.signal });
    }
    const identityContent = result.ok
      ? { planSha256: sha256(canonicalJson(result.plan)) }
      : safeFailureIdentity(result);
    const candidateId = `candidate-${ordinal}-${sha256(canonicalJson(identityContent)).slice(0, 12)}`;
    const provenancePath = `attempts/${candidateId}.json`;
    write(directory, provenancePath, pretty(result));
    const entry: CandidateManifestEntry = {
      ordinal, candidateId, status: result.ok ? "succeeded" : result.reason === "cancelled" ? "cancelled" : "failed",
      orchestrationId, provenancePath, provenanceSha256: sha256(readFileSync(resolve(directory, provenancePath)))
    };
    if (result.ok) {
      const canonical = canonicalJson(result.plan) + "\n";
      const planSha256 = sha256(canonical);
      const planPath = `plans/${candidateId}.json`;
      write(directory, planPath, canonical);
      entry.planPath = planPath;
      entry.planSha256 = planSha256;
      const first = firstByPlanHash.get(planSha256);
      if (first) entry.duplicateOf = first;
      else firstByPlanHash.set(planSha256, candidateId);
      const response = result.attempts.at(-1)?.response;
      if (response) { entry.provider = response.provider; entry.model = response.model; }
    } else entry.failureReason = result.reason;
    candidates.push(entry);
  }
  const succeeded = candidates.filter(value => value.status === "succeeded").length;
  const failed = candidates.filter(value => value.status === "failed").length;
  const cancelled = candidates.filter(value => value.status === "cancelled").length;
  const status = setStatus(succeeded, failed, cancelled, input.count);
  const artifactPaths = ["scenario.json", "prompt.txt", ...candidates.flatMap(value => [value.provenancePath, ...(value.planPath ? [value.planPath] : [])])];
  const artifactSha256 = Object.fromEntries(artifactPaths.map(path => [path, sha256(readFileSync(resolve(directory, path)))]));
  const manifest: CandidateSetManifest = {
    schemaVersion: CANDIDATE_SET_SCHEMA_VERSION, setId, createdAt, status, scenarioId: input.scenario.id,
    promptIdentity: { ...input.identity }, requested: input.count, generated, succeeded, failed, cancelled,
    scenarioPath: "scenario.json", promptPath: "prompt.txt", candidates, artifactSha256
  };
  write(directory, "manifest.json", pretty(manifest));
  return { setId, setDirectory: directory, manifest };
}

export function canonicalJson(value: unknown): string {
  if (value === null || typeof value === "boolean" || typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("Canonical JSON only supports finite numbers");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (typeof value === "object") {
    return `{${Object.keys(value as object).sort().filter(key => (value as Record<string, unknown>)[key] !== undefined)
      .map(key => `${JSON.stringify(key)}:${canonicalJson((value as Record<string, unknown>)[key])}`).join(",")}}`;
  }
  throw new Error(`Canonical JSON does not support ${typeof value}`);
}

export function contentSha256(value: unknown): string { return sha256(canonicalJson(value)); }

function safeFailureIdentity(result: Exclude<PlannerOrchestrationResult, { ok: true }>): unknown {
  return {
    reason: result.reason,
    attempts: result.attempts.map(attempt => ({
      attempt: attempt.attempt, kind: attempt.kind, identity: attempt.request.identity,
      extractionCode: attempt.extractionFailure?.code,
      evaluation: attempt.evaluation && { valid: attempt.evaluation.valid, checks: attempt.evaluation.checks.map(check => ({ id: check.id, passed: check.passed })) },
      response: attempt.response && { provider: attempt.response.provider, model: attempt.response.model }
    }))
  };
}
function setStatus(success: number, failed: number, cancelled: number, requested: number): CandidateSetManifest["status"] {
  if (cancelled === requested) return "cancelled";
  if (success === requested) return "completed";
  if (failed === requested) return "failed";
  return "partial";
}
function assertCount(value: number): void { if (!Number.isInteger(value) || value < MIN_CANDIDATES || value > MAX_CANDIDATES) throw new Error(`count must be an integer between ${MIN_CANDIDATES} and ${MAX_CANDIDATES}`); }
function assertSafeId(value: string, name: string): void { if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(value)) throw new Error(`${name} must be a path-safe 1-128 character identifier`); }
function write(directory: string, path: string, value: string): void { writeFileSync(resolve(directory, path), value); }
function pretty(value: unknown): string { return JSON.stringify(value, null, 2) + "\n"; }
function sha256(value: string | Buffer): string { return createHash("sha256").update(value).digest("hex"); }
