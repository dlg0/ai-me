import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readJsonFile, fail } from "./io.js";
import { assertScenarioCorpus, type ScenarioCorpus } from "../planner/evaluate-corpus.js";
import { renderScenarioPrompt } from "../planner/prompt.js";
import { OpenAIResponsesProvider } from "../planner/openai-responses.js";

const defaultTemplate = resolve(dirname(fileURLToPath(import.meta.url)), "../../../../prompts/animation-planner.md");
const [corpusArg, scenarioId, templateArg = defaultTemplate] = process.argv.slice(2);
if (!corpusArg || !scenarioId) fail("Usage: planner:smoke <corpus.json> <scenario-id> [prompt-template.md]", 2);

try {
  const { value } = readJsonFile(corpusArg);
  assertScenarioCorpus(value);
  const scenario = (value as ScenarioCorpus).scenarios.find(item => item.id === scenarioId);
  if (!scenario) throw new Error(`Scenario ${JSON.stringify(scenarioId)} was not found`);
  const rendered = renderScenarioPrompt(readFileSync(resolve(templateArg), "utf8"), scenario);
  const timeout = process.env.OPENAI_TIMEOUT_MS === undefined ? undefined : Number(process.env.OPENAI_TIMEOUT_MS);
  const provider = new OpenAIResponsesProvider({
    apiKey: process.env.OPENAI_API_KEY ?? "", model: process.env.OPENAI_MODEL ?? "",
    baseUrl: process.env.OPENAI_BASE_URL, timeoutMs: timeout
  });
  const response = await provider.generate({
    prompt: rendered.text,
    identity: { scenarioId, promptTemplateId: rendered.templateId, promptTemplateVersion: rendered.templateVersion },
    clientRequestId: randomUUID()
  });
  process.stdout.write(JSON.stringify(response, null, 2) + "\n");
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}
