import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Diagnostic, RigProfile } from "../types.js";
import { compileSchemaFile, formatSchemaErrors } from "../validation/schema.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const schemaPath = resolve(__dirname, "../../../../schemas/rig-profile.schema.json");
const validateSchema = compileSchemaFile(schemaPath);

export interface RigValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  diagnostics: Diagnostic[];
}

export function validateRigProfile(profile: unknown): RigValidationResult {
  const schemaValid = validateSchema(profile);
  if (!schemaValid) {
    const errors = formatSchemaErrors(validateSchema.errors);
    return {
      valid: false,
      errors,
      warnings: [],
      diagnostics: errors.map((message) => ({ severity: "error", path: "/", message }))
    };
  }

  const diagnostics = diagnoseRigProfile(profile as RigProfile);
  const errors = diagnostics
    .filter((diagnostic) => diagnostic.severity === "error")
    .map((diagnostic) => `${diagnostic.path} ${diagnostic.message}`);
  const warnings = diagnostics
    .filter((diagnostic) => diagnostic.severity === "warning")
    .map((diagnostic) => `${diagnostic.path} ${diagnostic.message}`);

  return { valid: errors.length === 0, errors, warnings, diagnostics };
}

function diagnoseRigProfile(profile: RigProfile): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const usedVtsInputs = new Map<string, string>();

  if (!profile.model) {
    diagnostics.push({
      severity: "warning",
      path: "/model",
      message: "profile is not bound to an expected VTube model; strict playback must refuse it"
    });
  }

  for (const [abstractControl, mapping] of Object.entries(profile.parameters)) {
    const path = `/parameters/${escapeJsonPointer(abstractControl)}`;
    if (mapping.min >= mapping.max) {
      diagnostics.push({ severity: "error", path, message: "min must be lower than max" });
    }
    if (mapping.neutral < mapping.min || mapping.neutral > mapping.max) {
      diagnostics.push({ severity: "error", path, message: "neutral must lie between min and max" });
    }

    const previous = usedVtsInputs.get(mapping.vtsInputParameter);
    if (previous) {
      diagnostics.push({
        severity: "warning",
        path,
        message: `shares VTube input parameter ${JSON.stringify(mapping.vtsInputParameter)} with ${JSON.stringify(previous)}`
      });
    } else {
      usedVtsInputs.set(mapping.vtsInputParameter, abstractControl);
    }
  }

  return diagnostics;
}

function escapeJsonPointer(value: string): string {
  return value.replaceAll("~", "~0").replaceAll("/", "~1");
}
