import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { AnimationPlan, Diagnostic } from "../types.js";
import { compileSchemaFile, formatSchemaErrors } from "../validation/schema.js";
import { diagnoseAnimationPlan } from "./diagnostics.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const schemaPath = resolve(__dirname, "../../../../schemas/animation-plan.schema.json");
const validateSchema = compileSchemaFile(schemaPath);

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  diagnostics: Diagnostic[];
}

export function validateAnimationPlan(plan: unknown): ValidationResult {
  const schemaValid = validateSchema(plan);
  if (!schemaValid) {
    const errors = formatSchemaErrors(validateSchema.errors);
    return {
      valid: false,
      errors,
      warnings: [],
      diagnostics: errors.map((message) => ({ severity: "error", path: "/", message }))
    };
  }

  const diagnostics = diagnoseAnimationPlan(plan as AnimationPlan);
  const errors = diagnostics
    .filter((diagnostic) => diagnostic.severity === "error")
    .map(formatDiagnostic);
  const warnings = diagnostics
    .filter((diagnostic) => diagnostic.severity === "warning")
    .map(formatDiagnostic);

  return { valid: errors.length === 0, errors, warnings, diagnostics };
}

function formatDiagnostic(diagnostic: Diagnostic): string {
  return `${diagnostic.path} ${diagnostic.message}`;
}
