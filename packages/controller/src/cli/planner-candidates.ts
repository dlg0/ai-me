import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { generateCandidateSet } from "../planner/candidate-set.js";
import { assertScenarioCorpus, type ScenarioCorpus } from "../planner/evaluate-corpus.js";
import { OpenAIResponsesProvider } from "../planner/openai-responses.js";
import { renderScenarioPrompt } from "../planner/prompt.js";
import { readJsonFile } from "./io.js";

const defaultTemplate = resolve(dirname(fileURLToPath(import.meta.url)), "../../../../prompts/animation-planner.md");
const [corpusArg, scenarioId, countArg, outputRoot, templateArg = defaultTemplate] = process.argv.slice(2);
const invocationRoot = process.env.INIT_CWD ?? process.cwd();
try {
  if (!corpusArg || !scenarioId || !countArg || !outputRoot) throw new Error("Usage: planner:candidates <corpus.json> <scenario-id> <count:2-5> <output-root> [prompt-template.md]");
  const corpus = readJsonFile(resolve(invocationRoot, corpusArg)).value;
  assertScenarioCorpus(corpus);
  const scenario = (corpus as ScenarioCorpus).scenarios.find(value => value.id === scenarioId);
  if (!scenario) throw new Error(`Scenario ${JSON.stringify(scenarioId)} was not found`);
  const rendered = renderScenarioPrompt(readFileSync(resolve(invocationRoot, templateArg), "utf8"), scenario);
  const provider = new OpenAIResponsesProvider({ apiKey: process.env.OPENAI_API_KEY ?? "", model: process.env.OPENAI_MODEL ?? "", baseUrl: process.env.OPENAI_BASE_URL, timeoutMs: process.env.OPENAI_TIMEOUT_MS ? Number(process.env.OPENAI_TIMEOUT_MS) : undefined });
  const controller = new AbortController();
  process.once("SIGINT", () => controller.abort());
  process.once("SIGTERM", () => controller.abort());
  const result = await generateCandidateSet({ provider, scenario, prompt: rendered.text, identity: { scenarioId, promptTemplateId: rendered.templateId, promptTemplateVersion: rendered.templateVersion }, count: Number(countArg), outputRoot: resolve(invocationRoot, outputRoot), signal: controller.signal });
  process.stdout.write(JSON.stringify({ setId: result.setId, setDirectory: result.setDirectory, status: result.manifest.status, counts: { requested: result.manifest.requested, succeeded: result.manifest.succeeded, failed: result.manifest.failed, cancelled: result.manifest.cancelled } }, null, 2) + "\n");
  if (result.manifest.status !== "completed") process.exitCode = result.manifest.status === "partial" ? 2 : 1;
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
