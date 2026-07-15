import assert from "node:assert/strict";
import test from "node:test";
import { OpenAIResponsesProvider } from "./openai-responses.js";
import type { RawPlannerProvider } from "./provider.js";

const identity = { scenarioId: "case", promptTemplateId: "prompt", promptTemplateVersion: "sha256:abc" };
const completed = { id: "resp_1", status: "completed", output: [{ type: "message", content: [{ type: "output_text", text: " raw " }] }], usage: { input_tokens: 2 }, extra: true };
const response = (body: unknown, status = 200, id = "req_1") => new Response(typeof body === "string" ? body : JSON.stringify(body), { status, headers: { "x-request-id": id } });

test("provider-neutral boundary is trivial to fake", async () => {
  const fake: RawPlannerProvider = { generate: async request => ({ provider: "fake", model: "fixed", responseId: "1", text: request.prompt, request: request.identity, rawResponse: {} }) };
  assert.equal((await fake.generate({ prompt: "x", identity })).text, "x");
});

test("sends exact Responses body and preserves raw provenance", async () => {
  let seenUrl = ""; let seen: RequestInit | undefined;
  const provider = new OpenAIResponsesProvider({ apiKey: "secret", model: "gpt-pinned", baseUrl: "https://example.test/responses", fetch: async (url, init) => { seenUrl = String(url); seen = init; return response(completed); } });
  const result = await provider.generate({ prompt: "PROMPT", identity, clientRequestId: "client_1" });
  assert.equal(seenUrl, "https://example.test/responses");
  assert.deepEqual(JSON.parse(String(seen?.body)), { model: "gpt-pinned", input: "PROMPT", store: false, tools: [] });
  assert.equal((seen?.headers as Record<string, string>).authorization, "Bearer secret");
  assert.equal((seen?.headers as Record<string, string>)["x-client-request-id"], "client_1");
  assert.deepEqual(result, { provider: "openai-responses", model: "gpt-pinned", responseId: "resp_1", serverRequestId: "req_1", clientRequestId: "client_1", text: " raw ", request: identity, usage: { input_tokens: 2 }, rawResponse: completed });
});

test("reports bounded API errors with request ID and no secret", async () => {
  const secret = "super-secret-key";
  const provider = new OpenAIResponsesProvider({ apiKey: secret, model: "m", fetch: async () => response({ error: { message: `bad ${secret}\n${"x".repeat(500)}` } }, 429, "req_err") });
  await assert.rejects(provider.generate({ prompt: "x", identity }), error => {
    const message = String(error); assert.match(message, /HTTP 429.*req_err.*bad/); assert.ok(message.length < 400); assert.doesNotMatch(message, new RegExp(secret)); return true;
  });
});

test("rejects malformed bodies, shapes, statuses, missing and ambiguous text", async () => {
  const cases: Array<[unknown, RegExp]> = [
    ["not json", /malformed JSON/], [{}, /status/], [{ id: "r", status: "failed", output: [] }, /failed/],
    [{ id: "r", status: "incomplete", output: [] }, /incomplete/], [{ id: "r", status: "completed" }, /missing output/],
    [{ id: "r", status: "completed", output: [] }, /no non-empty/],
    [{ id: "r", status: "completed", output: [{ type: "message", content: [{ type: "output_text", text: "a" }, { type: "output_text", text: "b" }] }] }, /2 text results/]
  ];
  for (const [body, pattern] of cases) {
    const provider = new OpenAIResponsesProvider({ apiKey: "k", model: "m", fetch: async () => response(body) });
    await assert.rejects(provider.generate({ prompt: "x", identity }), pattern);
  }
});

test("distinguishes timeout and caller cancellation", async () => {
  const waitingFetch: typeof fetch = async (_url, init) => new Promise((_resolve, reject) => init?.signal?.addEventListener("abort", () => reject(new Error("aborted")), { once: true }));
  await assert.rejects(new OpenAIResponsesProvider({ apiKey: "k", model: "m", timeoutMs: 5, fetch: waitingFetch }).generate({ prompt: "x", identity }), /timed out/);
  const controller = new AbortController();
  const pending = new OpenAIResponsesProvider({ apiKey: "k", model: "m", timeoutMs: 1000, fetch: waitingFetch }).generate({ prompt: "x", identity, signal: controller.signal });
  controller.abort();
  await assert.rejects(pending, /cancelled by caller/);
});

function responseWithBodyStalledUntilAbort(secret: string): typeof fetch {
  return async (_url, init) => {
    const signal = init?.signal;
    const body = new ReadableStream({
      start(controller) {
        signal?.addEventListener("abort", () => controller.error(new Error(`body aborted ${secret}`)), { once: true });
      }
    });
    return new Response(body, { headers: { "x-request-id": "headers_received" } });
  };
}

test("classifies caller cancellation while reading a body after headers", async () => {
  const controller = new AbortController();
  const pending = new OpenAIResponsesProvider({ apiKey: "body-secret", model: "m", timeoutMs: 1000, fetch: responseWithBodyStalledUntilAbort("body-secret") })
    .generate({ prompt: "x", identity, signal: controller.signal });
  controller.abort();
  await assert.rejects(pending, /cancelled by caller/);
});

test("classifies timeout while reading a body after headers", async () => {
  const secret = "body-secret";
  await assert.rejects(
    new OpenAIResponsesProvider({ apiKey: secret, model: "m", timeoutMs: 5, fetch: responseWithBodyStalledUntilAbort(secret) }).generate({ prompt: "x", identity }),
    error => { assert.match(String(error), /timed out after 5 ms/); assert.doesNotMatch(String(error), new RegExp(secret)); return true; }
  );
});

test("bounds and redacts body-reader errors after headers", async () => {
  const secret = "body-secret";
  const provider = new OpenAIResponsesProvider({
    apiKey: secret, model: "m",
    fetch: async () => new Response(new ReadableStream({ start(controller) { controller.error(new Error(`${secret}\n${"x".repeat(500)}`)); } }))
  });
  await assert.rejects(provider.generate({ prompt: "x", identity }), error => {
    const message = String(error);
    assert.match(message, /OpenAI request failed: \[redacted\]/);
    assert.ok(message.length < 400);
    assert.doesNotMatch(message, new RegExp(secret));
    return true;
  });
});

test("keeps credentials and fetch implementation out of enumeration and serialization", () => {
  const secret = "configured-secret";
  const provider = new OpenAIResponsesProvider({ apiKey: secret, model: "m", fetch: async () => response(completed) });
  assert.deepEqual(Object.keys(provider).sort(), ["baseUrl", "model", "timeoutMs"]);
  assert.doesNotMatch(JSON.stringify(provider), new RegExp(secret));
  assert.doesNotMatch(JSON.stringify(provider), /fetchImpl|apiKey/);
});

test("validates client request IDs before fetch", async () => {
  let calls = 0;
  const provider = new OpenAIResponsesProvider({ apiKey: "k", model: "m", fetch: async () => { calls++; return response(completed); } });
  for (const invalid of ["", "   ", "tab\there", "line\nfeed", "nul\0byte", "café", "x".repeat(513)]) {
    await assert.rejects(provider.generate({ prompt: "x", identity, clientRequestId: invalid }), error => {
      assert.equal(String(error), "Error: clientRequestId must be non-empty printable ASCII and at most 512 characters");
      return true;
    });
  }
  assert.equal(calls, 0);
  for (const valid of ["x", "a b", "x".repeat(512), "123e4567-e89b-12d3-a456-426614174000"]) {
    await provider.generate({ prompt: "x", identity, clientRequestId: valid });
  }
  assert.equal(calls, 4);
});

test("validates configuration without exposing secrets", () => {
  assert.throws(() => new OpenAIResponsesProvider({ apiKey: "", model: "m" }), /API key/);
  assert.throws(() => new OpenAIResponsesProvider({ apiKey: "secret", model: "" }), /model/);
  assert.throws(() => new OpenAIResponsesProvider({ apiKey: "secret", model: "m", baseUrl: "file:///tmp/x" }), /HTTP/);
  assert.throws(() => new OpenAIResponsesProvider({ apiKey: "secret", model: "m", timeoutMs: 0 }), /positive integer/);
});
