import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { generateLocalSvgPlayer } from "../local-svg/player.js";
import { fail, readJsonFile } from "./io.js";

const [planPath, profilePath, outputPath] = process.argv.slice(2);
if (!planPath || !profilePath || !outputPath) fail("Usage: generate-local-svg-player <plan.json> <profile.json> <output.html>");
try {
  const output = resolve(outputPath);
  const html = generateLocalSvgPlayer(readJsonFile(planPath).value, readJsonFile(profilePath).value);
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, html, "utf8");
  console.log(`Local SVG player written to ${output}`);
} catch (error) { fail(error instanceof Error ? error.message : String(error)); }
