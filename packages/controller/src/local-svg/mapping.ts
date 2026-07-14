import type { AbstractCommand } from "../runtime/mapping.js";
import type { LocalSvgRigProfile } from "../types.js";
import type { RenderScriptFrameRecord } from "../runtime/render-script.js";

export type LocalSvgControlMap = Record<string, number>;

/** Every renderer control at its exact declared neutral, sorted by SVG ID. */
export function localSvgNeutralControls(profile: LocalSvgRigProfile): LocalSvgControlMap {
  return sorted(Object.values(profile.controls).map((control) => [control.svgControlId, quantize(control.neutral)]));
}

/** Resolve one already-eased compiler frame. This adapter is the only owner of SVG IDs. */
export function resolveLocalSvgFrame(frame: RenderScriptFrameRecord, profile: LocalSvgRigProfile): LocalSvgControlMap {
  const result = localSvgNeutralControls(profile);
  for (const [abstractName, normalized] of Object.entries(frame.params)) {
    const controlName = profile.parameters[abstractName];
    if (!controlName) throw new Error(`Local SVG rig ${profile.rigId} has no parameter mapping for ${JSON.stringify(abstractName)}`);
    const control = profile.controls[controlName];
    if (!control) throw new Error(`Local SVG parameter ${JSON.stringify(abstractName)} references missing control ${JSON.stringify(controlName)}`);
    result[control.svgControlId] = quantize(mapNormalisedValue(normalized, control.min, control.max, control.neutral));
  }
  for (const pose of frame.poses) {
    const targets = profile.poses[pose.name];
    if (!targets) throw new Error(`Local SVG rig ${profile.rigId} has no pose mapping for ${JSON.stringify(pose.name)}`);
    for (const target of targets) {
      const control = profile.controls[target.control];
      if (!control) throw new Error(`Local SVG pose ${JSON.stringify(pose.name)} references missing control ${JSON.stringify(target.control)}`);
      result[control.svgControlId] = quantize(control.neutral + pose.weight * (target.value - control.neutral));
    }
  }
  return sorted(Object.entries(result));
}

function sorted(entries: Array<[string, number]>): LocalSvgControlMap {
  return Object.fromEntries(entries.sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0));
}

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
        values.push({ id: control.svgControlId, value: quantize(control.neutral + command.intensity * (target.value - control.neutral)) });
        sources.push(command.control);
      }
      continue;
    }
    const controlName = profile.parameters[command.control];
    if (!controlName) { notes.push({ kind: "note", message: `Rig ${profile.rigId} has no parameter mapping for ${command.control}` }); continue; }
    const control = profile.controls[controlName];
    values.push({ id: control.svgControlId, value: quantize(mapNormalisedValue(command.normalizedValue, control.min, control.max, control.neutral)) });
    sources.push(command.control);
  }
  return values.length ? [{ kind: "controls", values, sourceControls: sources }, ...notes] : notes;
}

export function mapNormalisedValue(normalized: number, min: number, max: number, neutral: number): number {
  const bounded = Math.min(Math.max(normalized, -1), 1);
  return bounded >= 0 ? neutral + bounded * (max - neutral) : neutral + bounded * (neutral - min);
}

function quantize(value: number): number {
  const result = Math.round(value * 10_000) / 10_000;
  return Object.is(result, -0) ? 0 : result;
}
