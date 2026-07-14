import type { AbstractCommand } from "../runtime/mapping.js";
import type { LocalSvgRigProfile } from "../types.js";

export type LocalSvgCommand =
  | { kind: "controls"; values: Array<{ id: string; value: number }>; sourceControls: string[] }
  | { kind: "note"; message: string };

export function resolveLocalSvgCommands(commands: AbstractCommand[], profile: LocalSvgRigProfile): LocalSvgCommand[] {
  const values: Array<{ id: string; value: number }> = [];
  const sources: string[] = [];
  const notes: LocalSvgCommand[] = [];
  for (const command of commands) {
    if (command.kind === "note") { notes.push(command); continue; }
    if (command.kind === "pose") {
      const pose = profile.poses[command.control];
      if (!pose) { notes.push({ kind: "note", message: `Rig ${profile.rigId} has no pose mapping for ${command.control}` }); continue; }
      for (const target of pose) {
        const control = profile.controls[target.control];
        values.push({ id: control.svgControlId, value: control.neutral + command.intensity * (target.value - control.neutral) });
        sources.push(command.control);
      }
      continue;
    }
    const controlName = profile.parameters[command.control];
    if (!controlName) { notes.push({ kind: "note", message: `Rig ${profile.rigId} has no parameter mapping for ${command.control}` }); continue; }
    const control = profile.controls[controlName];
    values.push({ id: control.svgControlId, value: mapNormalisedValue(command.normalizedValue, control.min, control.max, control.neutral) });
    sources.push(command.control);
  }
  return values.length ? [{ kind: "controls", values, sourceControls: sources }, ...notes] : notes;
}

function mapNormalisedValue(normalized: number, min: number, max: number, neutral: number): number {
  const bounded = Math.min(Math.max(normalized, -1), 1);
  return bounded >= 0 ? neutral + bounded * (max - neutral) : neutral + bounded * (neutral - min);
}
