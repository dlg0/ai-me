import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export function readJsonFile(path: string): { absolutePath: string; value: unknown } {
  const absolutePath = resolve(path);
  let source: string;

  try {
    source = readFileSync(absolutePath, "utf8");
  } catch (error) {
    throw new Error(`Could not read ${absolutePath}: ${messageFrom(error)}`);
  }

  try {
    return { absolutePath, value: JSON.parse(source) };
  } catch (error) {
    throw new Error(`Invalid JSON in ${absolutePath}: ${messageFrom(error)}`);
  }
}

export function fail(message: string, exitCode = 1): never {
  console.error(message);
  process.exit(exitCode);
}

export function printWarnings(warnings: string[]): void {
  if (warnings.length === 0) return;
  console.warn("Warnings:");
  for (const warning of warnings) console.warn(`- ${warning}`);
}

function messageFrom(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
