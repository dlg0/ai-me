import type { AbstractCommand } from "../runtime/mapping.js";
import { mapEventToAbstractCommands } from "../runtime/mapping.js";
import type { TimelineEvent, VTubeRigProfile } from "../types.js";

export type VTubeCommand =
  | { kind: "hotkey"; hotkeySelector: string; sourceControl: string }
  | { kind: "parameters"; values: Array<{ id: string; value: number; weight?: number }>; sourceControls: string[] }
  | { kind: "note"; message: string };

export function resolveVTubeCommands(commands: AbstractCommand[], profile: VTubeRigProfile): VTubeCommand[] {
  const result: VTubeCommand[] = [];
  const values: Array<{ id: string; value: number; weight?: number }> = [];
  const sources: string[] = [];
  for (const command of commands) {
    if (command.kind === "note") { result.push(command); continue; }
    if (command.kind === "pose") {
      const hotkeySelector = profile.hotkeys[command.control];
      result.push(hotkeySelector ? { kind: "hotkey", hotkeySelector, sourceControl: command.control } : { kind: "note", message: `Rig ${profile.rigId} has no hotkey mapping for ${command.control}` });
      continue;
    }
    const mapping = profile.parameters[command.control];
    if (!mapping) { result.push({ kind: "note", message: `Rig ${profile.rigId} has no parameter mapping for ${command.control}` }); continue; }
    values.push({ id: mapping.vtsInputParameter, value: mapNormalisedValue(command.normalizedValue, mapping.min, mapping.max, mapping.neutral), weight: mapping.weight });
    sources.push(command.control);
  }
  if (values.length) result.unshift({ kind: "parameters", values, sourceControls: sources });
  return result;
}

export function mapEventToVTubeCommands(event: TimelineEvent, profile: VTubeRigProfile): VTubeCommand[] {
  return resolveVTubeCommands(mapEventToAbstractCommands(event), profile);
}

function mapNormalisedValue(normalized: number, min: number, max: number, neutral: number): number {
  const bounded = Math.min(Math.max(normalized, -1), 1);
  return bounded >= 0 ? neutral + bounded * (max - neutral) : neutral + bounded * (neutral - min);
}
