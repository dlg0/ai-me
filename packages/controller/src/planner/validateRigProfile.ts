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
  if (profile.renderer === "local_svg") {
    const ids = new Map<string, string>();
    for (const [name, control] of Object.entries(profile.controls)) {
      const path = `/controls/${escapeJsonPointer(name)}`;
      if (control.min >= control.max) diagnostics.push({ severity: "error", path, message: "min must be lower than max" });
      if (control.neutral < control.min || control.neutral > control.max) diagnostics.push({ severity: "error", path, message: "neutral must lie between min and max" });
      const previous = ids.get(control.svgControlId);
      if (previous) diagnostics.push({ severity: "error", path, message: `duplicates SVG control ID used by ${JSON.stringify(previous)}` });
      else ids.set(control.svgControlId, name);
    }
    for (const [name, target] of Object.entries(profile.parameters)) {
      if (!profile.controls[target]) diagnostics.push({ severity: "error", path: `/parameters/${escapeJsonPointer(name)}`, message: `references undeclared control ${JSON.stringify(target)}` });
    }
    for (const [poseName, targets] of Object.entries(profile.poses)) {
      const seen = new Set<string>();
      for (const [index, target] of targets.entries()) {
        const path = `/poses/${escapeJsonPointer(poseName)}/${index}`;
        const control = profile.controls[target.control];
        if (!control) diagnostics.push({ severity: "error", path, message: `references undeclared control ${JSON.stringify(target.control)}` });
        else if (target.value < control.min || target.value > control.max) diagnostics.push({ severity: "error", path, message: "value must lie within the control range" });
        if (seen.has(target.control)) diagnostics.push({ severity: "error", path, message: `pose targets control ${JSON.stringify(target.control)} more than once` });
        seen.add(target.control);
      }
    }
    return diagnostics;
  }
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
