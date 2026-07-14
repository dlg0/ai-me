import type { AnimationPlan, RigProfile } from "../types.js";
import { validateAnimationPlan } from "../planner/validatePlan.js";
import { validateRigProfile } from "../planner/validateRigProfile.js";
import { flattenTimeline } from "../runtime/timeline.js";
import { mapEventToAbstractCommands } from "../runtime/mapping.js";
import { resolveLocalSvgCommands } from "../local-svg/mapping.js";
import { resolveVTubeCommands } from "../vtube/mapping.js";
import { fail, printWarnings, readJsonFile } from "./io.js";

const planPath = process.argv[2];
const profilePath = process.argv[3];
if (!planPath || !profilePath) {
  fail("Usage: npm run inspect:mapping -- <animation-plan.json> <rig-profile.json>", 2);
}

try {
  const planFile = readJsonFile(planPath);
  const profileFile = readJsonFile(profilePath);
  const planValidation = validateAnimationPlan(planFile.value);
  const profileValidation = validateRigProfile(profileFile.value);

  if (!planValidation.valid || !profileValidation.valid) {
    for (const error of [...planValidation.errors, ...profileValidation.errors]) console.error(`- ${error}`);
    process.exit(1);
  }

  printWarnings([...planValidation.warnings, ...profileValidation.warnings]);
  const plan = planFile.value as AnimationPlan;
  const profile = profileFile.value as RigProfile;
  if (plan.targetRig !== profile.rigId) {
    fail(`Plan targets rig ${JSON.stringify(plan.targetRig)} but profile is ${JSON.stringify(profile.rigId)}`);
  }

  console.log(`Mapping inspection only: ${plan.title}`);
  console.log("No renderer connection is opened and no commands are sent.\n");
  for (const event of flattenTimeline(plan)) {
    console.log(JSON.stringify({
      atMs: event.startMs,
      eventId: event.id,
      eventType: event.type,
      commands: profile.renderer === "vtube_studio"
        ? resolveVTubeCommands(mapEventToAbstractCommands(event), profile)
        : resolveLocalSvgCommands(mapEventToAbstractCommands(event), profile)
    }));
  }
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}
