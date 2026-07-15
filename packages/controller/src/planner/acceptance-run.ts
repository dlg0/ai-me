import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";
import { canonicalJson } from "./candidate-set.js";
import { assertScenarioCorpus, evaluateCorpus, type CorpusEvaluation, type ScenarioCorpus } from "./evaluate-corpus.js";
import { DEFAULT_MAX_ATTEMPTS, MAX_ATTEMPTS, orchestratePlanner, type PlannerOrchestrationResult } from "./orchestrate.js";
import { renderScenarioPrompt } from "./prompt.js";
import type { RawPlannerProvider } from "./provider.js";

export const ACCEPTANCE_RUN_SCHEMA_VERSION = "planner-acceptance-run.v1";
export const ACCEPTANCE_TARGET = 8;

export interface AcceptanceProviderConfig {
  provider: string;
  model: string;
  maxAttempts?: number;
  timeoutMs?: number;
  endpoint?: string;
}
export interface AcceptanceArtifact { path: string; sha256: string; }
export interface AcceptanceCase {
  ordinal: number;
  scenarioId: string;
  status: "succeeded" | "invalid-output" | "provider-error" | "cancelled" | "unattempted";
  orchestrationRequestId: string;
  prompt: AcceptanceArtifact;
  provenance: AcceptanceArtifact;
  plan?: AcceptanceArtifact;
}
export interface AcceptanceRunManifest {
  schemaVersion: typeof ACCEPTANCE_RUN_SCHEMA_VERSION;
  runId: string;
  createdAt: string;
  state: "finalized" | "cancelled" | "incomplete";
  corpusCount: number;
  target: number;
  targetMet: boolean;
  counts: { attempted: number; succeeded: number; invalid: number; providerFailed: number; cancelled: number; unattempted: number };
  providerConfig: AcceptanceProviderConfig;
  promptIdentity: { templateId: string; templateVersion: string };
  corpus: AcceptanceArtifact;
  promptTemplate: AcceptanceArtifact;
  candidateInput: AcceptanceArtifact;
  evaluation: AcceptanceArtifact;
  cases: AcceptanceCase[];
  artifacts: AcceptanceArtifact[];
  error?: string;
}
export interface CreateAcceptanceRunInput {
  provider: RawPlannerProvider;
  corpusBytes: string | Buffer;
  promptTemplateBytes: string | Buffer;
  providerConfig: AcceptanceProviderConfig;
  outputRoot: string;
  runId?: string;
  createdAt?: string;
  signal?: AbortSignal;
}
export interface AcceptanceRunResult { runId: string; runDirectory: string; manifest: AcceptanceRunManifest; }

export async function createPlannerAcceptanceRun(input: CreateAcceptanceRunInput): Promise<AcceptanceRunResult> {
  const corpusBytes = Buffer.isBuffer(input.corpusBytes) ? input.corpusBytes : Buffer.from(input.corpusBytes);
  let corpusValue: unknown;
  try { corpusValue = JSON.parse(corpusBytes.toString("utf8")); } catch (error) { throw new Error(`Invalid scenario corpus JSON: ${safeMessage(error)}`); }
  assertScenarioCorpus(corpusValue);
  const corpus: ScenarioCorpus = corpusValue;
  const providerConfig = normalizeProviderConfig(input.providerConfig);
  const maxAttempts = providerConfig.maxAttempts;
  const createdAt = input.createdAt ?? new Date().toISOString();
  if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(createdAt) || !Number.isFinite(Date.parse(createdAt))) throw new Error("createdAt must be a canonical ISO timestamp");
  const template = Buffer.isBuffer(input.promptTemplateBytes) ? input.promptTemplateBytes : Buffer.from(input.promptTemplateBytes);
  const runId = input.runId ?? `${createdAt.replace(/[-:]/g, "")}-${sha256(Buffer.concat([corpusBytes, template, Buffer.from(canonicalJson(providerConfig))])).slice(0, 12)}`;
  assertSafeId(runId);
  const root = resolve(input.outputRoot); mkdirSync(root, { recursive: true });
  const directory = resolve(root, runId); mkdirSync(directory, { recursive: false });
  mkdirSync(resolve(directory, "prompts")); mkdirSync(resolve(directory, "provenance")); mkdirSync(resolve(directory, "plans"));
  const cases: AcceptanceCase[] = [];
  const artifacts: AcceptanceArtifact[] = [];
  let promptIdentity = { templateId: "animation-planner", templateVersion: "" };
  const add = (path: string, bytes: string | Buffer): AcceptanceArtifact => {
    const destination = resolve(directory, path); const within = relative(directory, destination);
    if (!within || within.startsWith("..") || isAbsolute(within)) throw new Error(`Artifact path must be a strict descendant of the run directory: ${JSON.stringify(path)}`);
    writeFileSync(destination, bytes); const artifact = { path, sha256: sha256(bytes) }; artifacts.push(artifact); return artifact;
  };
  let corpusArtifact!: AcceptanceArtifact, templateArtifact!: AcceptanceArtifact, candidateArtifact!: AcceptanceArtifact, evaluationArtifact!: AcceptanceArtifact;
  try {
    corpusArtifact = add("corpus.json", corpusBytes);
    templateArtifact = add("prompt-template.md", template);
    const candidates: Record<string, unknown> = {};
    for (let index = 0; index < corpus.scenarios.length; index += 1) {
      const scenario = corpus.scenarios[index];
      const rendered = renderScenarioPrompt(template.toString("utf8"), scenario);
      promptIdentity = { templateId: rendered.templateId, templateVersion: rendered.templateVersion };
      const slug = scenarioSlug(index, scenario.id);
      const prompt = add(`prompts/${slug}.md`, rendered.text);
      const orchestrationRequestId = `${runId}-scenario-${String(index + 1).padStart(2, "0")}-${scenario.id}`;
      let result: PlannerOrchestrationResult;
      const unattempted = input.signal?.aborted;
      if (unattempted) result = { ok: false, reason: "cancelled", message: "Scenario unattempted because caller cancellation was observed", attempts: [] };
      else result = await orchestratePlanner({ provider: input.provider, scenario, prompt: rendered.text, identity: { scenarioId: scenario.id, promptTemplateId: rendered.templateId, promptTemplateVersion: rendered.templateVersion }, maxAttempts, signal: input.signal, orchestrationRequestId });
      const provenance = add(`provenance/${slug}.json`, pretty(result));
      assertProviderProvenance(result, providerConfig);
      const entry: AcceptanceCase = { ordinal: index + 1, scenarioId: scenario.id, status: result.ok ? "succeeded" : unattempted ? "unattempted" : result.reason, orchestrationRequestId, prompt, provenance };
      if (result.ok) { entry.plan = add(`plans/${slug}.json`, canonicalJson(result.plan) + "\n"); candidates[scenario.id] = result.plan; }
      else candidates[scenario.id] = null;
      cases.push(entry);
    }
    const candidateInput = { schemaVersion: "planner-acceptance-candidates.v1", candidates: Object.fromEntries(corpus.scenarios.map(s => [s.id, cases.find(c => c.scenarioId === s.id)?.plan?.path ?? null])) };
    candidateArtifact = add("animation-plan-candidates.json", pretty(candidateInput));
    const evaluation: CorpusEvaluation = evaluateCorpus(corpus, candidates);
    evaluationArtifact = add("animation-plan-evaluation.json", pretty(evaluation));
    const manifest = buildManifest(corpus, providerConfig, runId, createdAt, cases, artifacts, corpusArtifact, templateArtifact, candidateArtifact, evaluationArtifact, promptIdentity);
    writeFileSync(resolve(directory, "manifest.json"), pretty(manifest));
    return { runId, runDirectory: directory, manifest };
  } catch (error) {
    const incomplete = buildManifest(corpus, providerConfig, runId, createdAt, cases, artifacts, corpusArtifact, templateArtifact, candidateArtifact, evaluationArtifact, promptIdentity, safeMessage(error));
    try { writeFileSync(resolve(directory, "manifest.json"), pretty(incomplete)); } catch { /* retain all evidence that was writable */ }
    throw error;
  }
}

function buildManifest(corpusValue: ScenarioCorpus, providerConfig: AcceptanceProviderConfig & { maxAttempts: number }, runId: string, createdAt: string, cases: AcceptanceCase[], artifacts: AcceptanceArtifact[], corpus: AcceptanceArtifact, template: AcceptanceArtifact, candidate: AcceptanceArtifact, evaluation: AcceptanceArtifact, promptIdentity: AcceptanceRunManifest["promptIdentity"], error?: string): AcceptanceRunManifest {
  const count = (status: AcceptanceCase["status"]) => cases.filter(value => value.status === status).length;
  const succeeded = count("succeeded"), cancelled = count("cancelled"), unattempted = count("unattempted");
  return { schemaVersion: ACCEPTANCE_RUN_SCHEMA_VERSION, runId, createdAt, state: error ? "incomplete" : cancelled + unattempted ? "cancelled" : "finalized", corpusCount: corpusValue.scenarios.length, target: ACCEPTANCE_TARGET, targetMet: succeeded >= ACCEPTANCE_TARGET,
    counts: { attempted: cases.length - unattempted, succeeded, invalid: count("invalid-output"), providerFailed: count("provider-error"), cancelled, unattempted }, providerConfig, promptIdentity, corpus, promptTemplate: template, candidateInput: candidate, evaluation, cases, artifacts: [...artifacts], ...(error ? { error } : {}) };
}
function normalizeProviderConfig(value: AcceptanceProviderConfig): AcceptanceProviderConfig & { maxAttempts: number } {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("providerConfig must be an object");
  const allowed = new Set(["provider", "model", "maxAttempts", "timeoutMs", "endpoint"]);
  for (const key of Object.keys(value)) if (!allowed.has(key)) throw new Error(`providerConfig contains unknown field ${JSON.stringify(key)}`);
  if (typeof value.provider !== "string" || typeof value.model !== "string" || !value.provider.trim() || !value.model.trim()) throw new Error("providerConfig provider and model are required");
  const maxAttempts = value.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > MAX_ATTEMPTS) throw new Error(`maxAttempts must be an integer between 1 and ${MAX_ATTEMPTS}`);
  if (value.timeoutMs !== undefined && (!Number.isInteger(value.timeoutMs) || value.timeoutMs <= 0)) throw new Error("providerConfig timeoutMs must be a positive integer");
  let endpoint: string | undefined;
  if (value.endpoint !== undefined) {
    if (typeof value.endpoint !== "string") throw new Error("providerConfig endpoint must be a string");
    let url: URL; try { url = new URL(value.endpoint); } catch { throw new Error("providerConfig endpoint must be a valid HTTP(S) URL"); }
    if (!/^https?:$/.test(url.protocol) || url.username || url.password || url.search || url.hash) throw new Error("providerConfig endpoint must be an HTTP(S) URL without credentials, query, or fragment");
    endpoint = url.toString();
  }
  return { provider: value.provider.trim(), model: value.model.trim(), maxAttempts, ...(value.timeoutMs === undefined ? {} : { timeoutMs: value.timeoutMs }), ...(endpoint === undefined ? {} : { endpoint }) };
}
function assertProviderProvenance(result: PlannerOrchestrationResult, config: AcceptanceProviderConfig): void {
  for (const attempt of result.attempts) {
    const response = attempt.response; if (!response) continue;
    if (response.provider !== config.provider || response.model !== config.model ||
      response.request.scenarioId !== attempt.request.identity.scenarioId || response.request.promptTemplateId !== attempt.request.identity.promptTemplateId || response.request.promptTemplateVersion !== attempt.request.identity.promptTemplateVersion ||
      (attempt.request.clientRequestId !== undefined && response.clientRequestId !== attempt.request.clientRequestId))
      throw new Error(`Provider provenance mismatch on attempt ${attempt.attempt}`);
  }
}
function scenarioSlug(index: number, id: string): string {
  const readable = id.normalize("NFKD").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase().slice(0, 40) || "scenario";
  return `${String(index + 1).padStart(2, "0")}-${readable}-${sha256(id).slice(0, 10)}`;
}
function assertSafeId(value: string): void { if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(value)) throw new Error("runId must be a path-safe 1-128 character identifier"); }
function pretty(value: unknown): string { return JSON.stringify(value, null, 2) + "\n"; }
function sha256(value: string | Buffer): string { return createHash("sha256").update(value).digest("hex"); }
function safeMessage(error: unknown): string { return (error instanceof Error ? error.message : String(error)).replace(/[\r\n\x00-\x1f]+/g, " ").slice(0, 500); }
