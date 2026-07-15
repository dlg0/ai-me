export interface PlannerPromptIdentity {
  scenarioId: string;
  promptTemplateId: string;
  promptTemplateVersion: string;
}

export interface RawPlannerRequest {
  prompt: string;
  identity: PlannerPromptIdentity;
  signal?: AbortSignal;
  clientRequestId?: string;
}

export interface RawPlannerResponse {
  provider: string;
  model: string;
  responseId: string;
  serverRequestId?: string;
  clientRequestId?: string;
  text: string;
  request: {
    scenarioId: string;
    promptTemplateId: string;
    promptTemplateVersion: string;
  };
  usage?: unknown;
  rawResponse: unknown;
}

/**
 * Provider-neutral raw generation boundary. Implementations must not validate planner JSON.
 * Implementations must sanitize credentials and secrets from returned provenance and thrown
 * errors; orchestration preserves bounded provider failure messages exactly.
 */
export interface RawPlannerProvider {
  generate(request: RawPlannerRequest): Promise<RawPlannerResponse>;
}
