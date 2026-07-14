import { validateRigProfile } from "../planner/validateRigProfile.js";
import { fail, printWarnings, readJsonFile } from "./io.js";

const profilePath = process.argv[2];
if (!profilePath) fail("Usage: npm run validate:rig -- <path-to-rig-profile.json>", 2);

try {
  const { absolutePath, value } = readJsonFile(profilePath);
  const result = validateRigProfile(value);

  if (!result.valid) {
    console.error("Rig profile is invalid:");
    for (const error of result.errors) console.error(`- ${error}`);
    process.exit(1);
  }

  printWarnings(result.warnings);
  console.log(`OK: ${absolutePath}`);
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}
