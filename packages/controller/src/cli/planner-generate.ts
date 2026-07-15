import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { assertScenarioCorpus, type ScenarioCorpus } from "../planner/evaluate-corpus.js";
import { OpenAIResponsesProvider } from "../planner/openai-responses.js";
import { orchestratePlanner, type PlannerFailure } from "../planner/orchestrate.js";
import { renderScenarioPrompt } from "../planner/prompt.js";
import { readJsonFile } from "./io.js";

const defaultTemplate = resolve(dirname(fileURLToPath(import.meta.url)), "../../../../prompts/animation-planner.md");
const [corpusArg, scenarioId, templateArg = defaultTemplate] = process.argv.slice(2);

try {
  if (!corpusArg || !scenarioId) throw new Error("Usage: planner:generate <corpus.json> <scenario-id> [prompt-template.md]");
  const corpus = readJsonFile(corpusArg).value;
  assertScenarioCorpus(corpus);
  const scenario = (corpus as ScenarioCorpus).scenarios.find(value => value.id === scenarioId);
  if (!scenario) throw new Error(`Scenario ${JSON.stringify(scenarioId)} was not found`);
  const rendered = renderScenarioPrompt(readFileSync(resolve(templateArg), "utf8"), scenario);
  const timeout = process.env.OPENAI_TIMEOUT_MS === undefined ? undefined : Number(process.env.OPENAI_TIMEOUT_MS);
  const provider = new OpenAIResponsesProvider({
    apiKey: process.env.OPENAI_API_KEY ?? "", model: process.env.OPENAI_MODEL ?? "",
    baseUrl: process.env.OPENAI_BASE_URL, timeoutMs: timeout
  });
  const controller = new AbortController();
  process.once("SIGINT", () => controller.abort());
  const result = await orchestratePlanner({
    provider, scenario, prompt: rendered.text,
    identity: { scenarioId, promptTemplateId: rendered.templateId, promptTemplateVersion: rendered.templateVersion },
    orchestrationRequestId: randomUUID(), signal: controller.signal
  });
  process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  if (!result.ok) process.exitCode = 1;
} catch (error) {
  const result: PlannerFailure = {
    ok: false, reason: "provider-error",
    message: error instanceof Error ? error.message : String(error), attempts: []
  };
  process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  process.exitCode = 1;
}
