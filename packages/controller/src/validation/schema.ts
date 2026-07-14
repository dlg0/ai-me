import { readFileSync } from "node:fs";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import type { ErrorObject, ValidateFunction } from "ajv";

const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);

export function compileSchemaFile(path: string): ValidateFunction {
  const schema = JSON.parse(readFileSync(path, "utf8"));
  return ajv.compile(schema);
}

export function formatSchemaErrors(errors: ErrorObject[] | null | undefined): string[] {
  return (errors ?? []).map((error) => {
    const path = error.instancePath || "/";
    const detail = error.params && "allowedValue" in error.params
      ? `; expected ${JSON.stringify(error.params.allowedValue)}`
      : "";
    return `${path} ${error.message ?? "is invalid"}${detail}`;
  });
}
