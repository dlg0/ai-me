import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createPlannerAcceptanceRun } from "../planner/acceptance-run.js";
import { OpenAIResponsesProvider } from "../planner/openai-responses.js";

const invocationRoot = process.env.INIT_CWD ?? process.cwd();
const defaultTemplate = resolve(dirname(fileURLToPath(import.meta.url)), "../../../../prompts/animation-planner.md");
const [corpusArg, outputArg, templateArg = defaultTemplate] = process.argv.slice(2);
try {
  if (!corpusArg || !outputArg) throw new Error("Usage: planner:acceptance <corpus.json> <output-root> [prompt-template.md]");
  const corpusBytes = readFileSync(resolve(invocationRoot, corpusArg)); const corpus = JSON.parse(corpusBytes.toString("utf8"));
  if (corpus.scenarios.length !== 10) throw new Error(`Phase 2 acceptance corpus must contain exactly 10 scenarios; found ${corpus.scenarios.length}`);
  const model = process.env.OPENAI_MODEL ?? "";
  const timeoutMs = process.env.OPENAI_TIMEOUT_MS ? Number(process.env.OPENAI_TIMEOUT_MS) : undefined;
  const provider = new OpenAIResponsesProvider({ apiKey: process.env.OPENAI_API_KEY ?? "", model, baseUrl: process.env.OPENAI_BASE_URL, timeoutMs });
  const controller = new AbortController(); process.once("SIGINT", () => controller.abort()); process.once("SIGTERM", () => controller.abort());
  const result = await createPlannerAcceptanceRun({ provider, corpusBytes, promptTemplateBytes: readFileSync(resolve(invocationRoot, templateArg)), providerConfig: { provider: "openai-responses", model: provider.model, maxAttempts: 2, endpoint: provider.baseUrl, timeoutMs: provider.timeoutMs }, outputRoot: resolve(invocationRoot, outputArg), signal: controller.signal });
  process.stdout.write(JSON.stringify({ runId: result.runId, runDirectory: result.runDirectory, state: result.manifest.state, targetMet: result.manifest.targetMet, counts: result.manifest.counts }) + "\n");
  if (result.manifest.state === "cancelled") process.exitCode = 1; else if (!result.manifest.targetMet) process.exitCode = 2;
} catch (error) { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; }
