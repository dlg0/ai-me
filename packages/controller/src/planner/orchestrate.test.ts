import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import type { RawPlannerProvider, RawPlannerRequest, RawPlannerResponse } from "./provider.js";
import { extractPlannerObject, MAX_ATTEMPTS, orchestratePlanner, REPAIR_TEMPLATE_VERSION, renderRepairPrompt, type PlannerAttempt } from "./orchestrate.js";
import type { ScenarioCorpus } from "./evaluate-corpus.js";

const examples = resolve(process.cwd(), "../../examples");
const corpus = JSON.parse(readFileSync(resolve(examples, "scenario-corpus.v1.json"), "utf8")) as ScenarioCorpus;
const scenario = corpus.scenarios[0];
const validPlan = JSON.parse(readFileSync(resolve(examples, "evaluation-candidates/good/authority.json"), "utf8"));
const validText = JSON.stringify(validPlan);
const identity = { scenarioId: scenario.id, promptTemplateId: "test", promptTemplateVersion: "1" };

class Scripted implements RawPlannerProvider {
  requests: RawPlannerRequest[] = [];
  constructor(private readonly script: Array<string | Error | ((request: RawPlannerRequest) => Promise<RawPlannerResponse>)>) {}
  async generate(request: RawPlannerRequest): Promise<RawPlannerResponse> {
    this.requests.push(request);
    const item = this.script.shift();
    if (typeof item === "function") return item(request);
    if (item instanceof Error) throw item;
    if (item === undefined) throw new Error("script exhausted");
    return response(item, request, this.requests.length);
  }
}

test("strict extraction accepts surrounding whitespace and rejects fenced, noisy, multiple, arrays, and primitives", () => {
  assert.deepEqual(extractPlannerObject(" \n {\"x\":1}\t").ok, true);
  for (const text of ["```json\n{}\n```", "prose {}", "{} suffix", "{} {}"])
    assert.equal(extractPlannerObject(text).ok, false, text);
  for (const text of ["[]", "null", "1", "true", '"x"']) {
    const result = extractPlannerObject(text);
    assert.equal(result.ok, false);
    if (!result.ok) assert.match(result.error.message, /non-array JSON object/);
  }
});

test("valid first response succeeds with exact raw provenance", async () => {
  const raw = ` \n${validText}\t`;
  const result = await orchestratePlanner({ provider: new Scripted([raw]), scenario, prompt: "initial", identity });
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.plan.schemaVersion, "animation-plan.v1");
  assert.equal(result.attempts[0].response?.text, raw);
  assert.equal(result.attempts[0].evaluation?.valid, true);
});

test("schema, semantic, warning, and scenario policy failures are retained and never expose a plan", async () => {
  const schema = { nope: true };
  const semantic = structuredClone(validPlan); semantic.tracks.states[1].id = semantic.tracks.states[0].id;
  const warning = structuredClone(validPlan); warning.tracks.overlays = [];
  const policy = structuredClone(validPlan); policy.targetRig = "other-rig";
  for (const candidate of [schema, semantic, warning, policy]) {
    const result = await orchestratePlanner({ provider: new Scripted([JSON.stringify(candidate)]), scenario, prompt: "x", identity, maxAttempts: 1 });
    assert.equal(result.ok, false);
    assert.equal("plan" in result, false);
    assert.equal(result.attempts[0].evaluation?.valid, false);
  }
  const warningResult = await orchestratePlanner({ provider: new Scripted([JSON.stringify(warning)]), scenario, prompt: "x", identity, maxAttempts: 1 });
  assert.ok(warningResult.attempts[0].evaluation?.checks.some(value => value.id.startsWith("diagnostic-warning:") && !value.passed));
});

test("one deterministic repair can succeed and repair context is bounded", async () => {
  const hostile = "x".repeat(50_000);
  const provider = new Scripted([hostile, validText]);
  const result = await orchestratePlanner({ provider, scenario, prompt: "initial", identity });
  assert.equal(result.ok, true);
  assert.equal(result.attempts.length, 2);
  assert.equal(result.attempts[1].kind, "repair");
  assert.equal(result.attempts[0].response?.text, hostile);
  assert.equal(provider.requests[1].identity.promptTemplateId, "animation-planner-repair");
  assert.ok(provider.requests[1].prompt.length < 24_000);
  assert.match(provider.requests[1].prompt, /one corrected JSON object only/);
  assert.equal(provider.requests[1].identity.promptTemplateVersion, "2");
  assert.equal(REPAIR_TEMPLATE_VERSION, "2");
  assert.match(provider.requests[1].prompt, /authoritativeSchema/);
  assert.match(provider.requests[1].prompt, /offline_review_only/);
  assert.match(provider.requests[1].prompt, /scenario expectations/);
  assert.match(provider.requests[1].prompt, /never copy them/);
});

test("serialized attempts retain exact prompts and distinct provider IDs under one orchestration ID", async () => {
  const provider = new Scripted(["[]", validText]);
  const result = await orchestratePlanner({
    provider, scenario, prompt: "  exact initial prompt\n", identity,
    orchestrationRequestId: "shared-correlation-id"
  });
  assert.equal(result.ok, true);
  const serialized = JSON.parse(JSON.stringify(result));
  assert.equal(serialized.attempts[0].request.prompt, "  exact initial prompt\n");
  assert.equal(serialized.attempts[1].request.prompt, provider.requests[1].prompt);
  assert.match(serialized.attempts[1].request.prompt, /Repair the prior animation plan/);
  assert.deepEqual(serialized.attempts.map((attempt: PlannerAttempt) => attempt.request.orchestrationRequestId),
    ["shared-correlation-id", "shared-correlation-id"]);
  const ids = serialized.attempts.map((attempt: PlannerAttempt) => attempt.request.clientRequestId);
  assert.notEqual(ids[0], ids[1]);
  for (const id of ids) {
    assert.ok(id.length <= 512);
    assert.match(id, /^[\x20-\x7e]+$/);
  }
  assert.deepEqual(provider.requests.map(request => request.clientRequestId), ids);
});

test("repair prompt reserves bounded space for critical policy failures and diagnostics", () => {
  const checks = Array.from({ length: 30 }, (_, index) => ({ id: `other-${index}`, passed: false, message: `policy ${index}` }));
  checks.push(
    { id: "target-rig", passed: false, message: "wrong rig" },
    { id: "state-required:disclosing", passed: false, message: "required state absent" },
    { id: "full-duration-disclosure", passed: false, message: "disclosure absent" },
    { id: "terminal-neutral-reset", passed: false, message: "reset absent" },
    { id: "diagnostic-warning:/duplicate", passed: false, message: "duplicated warning" }
  );
  const diagnostics = Array.from({ length: 30 }, (_, index) => ({
    severity: "warning" as const, path: `/problem/${index}`, message: `diagnostic ${index} ${"x".repeat(500)}`
  }));
  const attempt = {
    attempt: 1, kind: "initial", request: { prompt: "x", identity }, response: response("{}", { prompt: "x", identity }, 1),
    evaluation: { scenarioId: scenario.id, planValid: true, scenarioValid: false, valid: false, checks, diagnostics }
  } satisfies PlannerAttempt;
  const prompt = renderRepairPrompt(scenario, attempt);
  for (const required of ["target-rig", "state-required:disclosing", "full-duration-disclosure", "terminal-neutral-reset"])
    assert.match(prompt, new RegExp(required));
  assert.match(prompt, /diagnostic 0/);
  assert.doesNotMatch(prompt, /diagnostic-warning:\/duplicate/);
  assert.ok(prompt.length < 24_000, `repair prompt was ${prompt.length} characters`);
});

test("repeated invalid output stops at max attempts and upper bound is enforced", async () => {
  const result = await orchestratePlanner({ provider: new Scripted(["[]", "{}"]), scenario, prompt: "x", identity });
  assert.equal(result.ok, false);
  assert.equal(result.attempts.length, 2);
  if (!result.ok) assert.equal(result.reason, "invalid-output");
  await assert.rejects(orchestratePlanner({ provider: new Scripted([]), scenario, prompt: "x", identity, maxAttempts: MAX_ATTEMPTS + 1 }), /maxAttempts/);
});

test("provider failure on initial or repair is terminal and bounded", async () => {
  for (const script of [[new Error("first")], ["[]", new Error("repair")]]) {
    const result = await orchestratePlanner({ provider: new Scripted(script), scenario, prompt: "x", identity });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.reason, "provider-error");
    assert.ok(result.attempts.at(-1)?.providerError);
  }
  const huge = await orchestratePlanner({ provider: new Scripted([new Error("z".repeat(5_000))]), scenario, prompt: "x", identity });
  assert.ok((huge.attempts[0].providerError?.message.length ?? 0) <= 500);
});

test("cancellation before, during, and between attempts never calls an extra generation", async () => {
  const before = new AbortController(); before.abort();
  const beforeProvider = new Scripted([validText]);
  const beforeResult = await orchestratePlanner({ provider: beforeProvider, scenario, prompt: "x", identity, signal: before.signal });
  assert.equal(beforeProvider.requests.length, 0); assert.equal(beforeResult.ok, false);

  const during = new AbortController();
  const duringProvider = new Scripted([request => new Promise((_, reject) => request.signal!.addEventListener("abort", () => reject(new Error("aborted")), { once: true }))]);
  const pending = orchestratePlanner({ provider: duringProvider, scenario, prompt: "x", identity, signal: during.signal });
  during.abort();
  const duringResult = await pending;
  assert.equal(duringResult.ok, false); if (!duringResult.ok) assert.equal(duringResult.reason, "cancelled");

  const between = new AbortController();
  const betweenProvider = new Scripted([async request => { between.abort(); return response("[]", request, 1); }, validText]);
  const betweenResult = await orchestratePlanner({ provider: betweenProvider, scenario, prompt: "x", identity, signal: between.signal });
  assert.equal(betweenProvider.requests.length, 1); assert.equal(betweenResult.ok, false);
});

test("caller cancellation wins when a provider aborts then resolves valid output", async () => {
  const controller = new AbortController();
  const provider = new Scripted([async request => {
    controller.abort();
    return response(validText, request, 1);
  }]);
  const result = await orchestratePlanner({ provider, scenario, prompt: "x", identity, signal: controller.signal });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.reason, "cancelled");
  assert.equal(result.attempts[0].response?.text, validText);
});

test("an abort-like provider timeout is not caller cancellation", async () => {
  const result = await orchestratePlanner({ provider: new Scripted([new Error("request timed out")]), scenario, prompt: "x", identity, signal: new AbortController().signal });
  assert.equal(result.ok, false); if (!result.ok) assert.equal(result.reason, "provider-error");
});

function response(text: string, request: RawPlannerRequest, number: number): RawPlannerResponse {
  return { provider: "fake", model: "fake", responseId: `r${number}`, text, request: { ...request.identity }, rawResponse: { number } };
}
