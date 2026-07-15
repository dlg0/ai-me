import type { RawPlannerProvider, RawPlannerRequest, RawPlannerResponse } from "./provider.js";

export interface OpenAIResponsesOptions {
  apiKey: string;
  model: string;
  baseUrl?: string;
  timeoutMs?: number;
  fetch?: typeof fetch;
}

export class OpenAIResponsesProvider implements RawPlannerProvider {
  readonly #apiKey: string;
  readonly model: string;
  readonly baseUrl: string;
  readonly timeoutMs: number;
  readonly #fetchImpl: typeof fetch;

  constructor(options: OpenAIResponsesOptions) {
    if (!options.apiKey?.trim()) throw new Error("OpenAI API key is required");
    if (!options.model?.trim()) throw new Error("OpenAI model is required");
    this.#apiKey = options.apiKey;
    this.model = options.model.trim();
    this.baseUrl = validateUrl(options.baseUrl ?? "https://api.openai.com/v1/responses");
    this.timeoutMs = options.timeoutMs ?? 30_000;
    if (!Number.isInteger(this.timeoutMs) || this.timeoutMs <= 0) throw new Error("OpenAI timeoutMs must be a positive integer");
    this.#fetchImpl = options.fetch ?? globalThis.fetch;
    if (!this.#fetchImpl) throw new Error("A fetch implementation is required");
  }

  async generate(request: RawPlannerRequest): Promise<RawPlannerResponse> {
    if (!request.prompt.trim()) throw new Error("Planner prompt must not be empty");
    if (request.clientRequestId !== undefined) validateClientRequestId(request.clientRequestId);
    const timeout = AbortSignal.timeout(this.timeoutMs);
    const signal = request.signal ? AbortSignal.any([request.signal, timeout]) : timeout;
    const headers: Record<string, string> = { "content-type": "application/json", authorization: `Bearer ${this.#apiKey}` };
    if (request.clientRequestId) headers["x-client-request-id"] = request.clientRequestId;
    let response: Response;
    let bodyText: string;
    try {
      response = await this.#fetchImpl(this.baseUrl, {
        method: "POST", headers, signal,
        body: JSON.stringify({ model: this.model, input: request.prompt, store: false, tools: [] })
      });
      bodyText = await response.text();
    } catch (error) {
      if (request.signal?.aborted) throw new Error("OpenAI request cancelled by caller");
      if (timeout.aborted) throw new Error(`OpenAI request timed out after ${this.timeoutMs} ms`);
      throw new Error(`OpenAI request failed: ${safeMessage(error, this.#apiKey)}`);
    }
    const serverRequestId = response.headers.get("x-request-id") ?? undefined;
    let raw: unknown;
    try { raw = JSON.parse(bodyText); }
    catch { throw new Error(`OpenAI returned malformed JSON (HTTP ${response.status}${requestSuffix(serverRequestId)})`); }
    if (!response.ok) {
      const detail = providerError(raw, this.#apiKey);
      throw new Error(`OpenAI HTTP ${response.status}${requestSuffix(serverRequestId)}${detail ? `: ${detail}` : ""}`);
    }
    if (!isRecord(raw)) throw new Error(`OpenAI returned an invalid response shape${requestSuffix(serverRequestId)}`);
    if (raw.status !== "completed")
      throw new Error(`OpenAI response status was ${JSON.stringify(raw.status)} instead of "completed"${requestSuffix(serverRequestId)}`);
    if (typeof raw.id !== "string" || !raw.id) throw new Error(`OpenAI response is missing id${requestSuffix(serverRequestId)}`);
    const texts: string[] = [];
    if (!Array.isArray(raw.output)) throw new Error(`OpenAI response is missing output items${requestSuffix(serverRequestId)}`);
    for (const item of raw.output) {
      if (!isRecord(item) || item.type !== "message" || !Array.isArray(item.content)) continue;
      for (const content of item.content)
        if (isRecord(content) && content.type === "output_text" && typeof content.text === "string" && content.text.trim()) texts.push(content.text);
    }
    if (texts.length === 0) throw new Error(`OpenAI completed response contained no non-empty output_text${requestSuffix(serverRequestId)}`);
    if (texts.length !== 1) throw new Error(`OpenAI completed response contained ${texts.length} text results; expected exactly one${requestSuffix(serverRequestId)}`);
    return {
      provider: "openai-responses", model: this.model, responseId: raw.id, serverRequestId,
      clientRequestId: request.clientRequestId, text: texts[0], request: { ...request.identity },
      usage: raw.usage, rawResponse: raw
    };
  }
}

function validateClientRequestId(value: string): void {
  if (!value.trim() || value.length > 512 || /[^\x20-\x7e]/.test(value)) {
    throw new Error("clientRequestId must be non-empty printable ASCII and at most 512 characters");
  }
}

function validateUrl(value: string): string {
  try { const url = new URL(value); if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error(); return url.href; }
  catch { throw new Error("OpenAI baseUrl must be a valid HTTP(S) URL"); }
}
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null; }
function requestSuffix(id?: string): string { return id ? `, request ID ${id}` : ""; }
function safeMessage(value: unknown, secret: string): string {
  return (value instanceof Error ? value.message : String(value)).split(secret).join("[redacted]").replace(/[\r\n\x00-\x1f]+/g, " ").slice(0, 300);
}
function providerError(raw: unknown, secret: string): string | undefined {
  if (!isRecord(raw) || !isRecord(raw.error) || typeof raw.error.message !== "string") return undefined;
  return safeMessage(raw.error.message, secret);
}
