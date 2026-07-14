import type { RigProfile, TimelineEvent } from "../types.js";
import { defaultStyleLimits } from "../runtime/style.js";

export type AbstractCommand =
  | { kind: "hotkey"; control: string }
  | { kind: "parameter"; control: string; normalizedValue: number }
  | { kind: "note"; message: string };

export type VTubeCommand =
  | { kind: "hotkey"; hotkeySelector: string; sourceControl: string }
  | {
      kind: "parameters";
      values: Array<{ id: string; value: number; weight?: number }>;
      sourceControls: string[];
    }
  | { kind: "note"; message: string };

/**
 * Converts semantic plan events to renderer-independent abstract controls.
 * Exact easing and time-continuous curves belong in the future runtime player.
 */
export function mapEventToAbstractCommands(event: TimelineEvent): AbstractCommand[] {
  const intensity = event.type === "state" || event.type === "gesture"
    ? boundedIntensity(event.intensity, event.type === "gesture" && event.gesture === "reset_neutral")
    : 1;

  if (event.type === "gesture") {
    return [{ kind: "hotkey", control: event.gesture }];
  }

  if (event.type === "state") {
    switch (event.state) {
      case "idle":
        return neutralHead();
      case "listening":
        return [
          { kind: "parameter", control: "head.angle.x", normalizedValue: 0 },
          { kind: "parameter", control: "head.angle.y", normalizedValue: 0.16 * intensity },
          { kind: "parameter", control: "head.angle.z", normalizedValue: 0 }
        ];
      case "thinking":
        return [
          { kind: "parameter", control: "head.angle.x", normalizedValue: -0.30 * intensity },
          { kind: "parameter", control: "head.angle.y", normalizedValue: -0.38 * intensity },
          { kind: "parameter", control: "head.angle.z", normalizedValue: -0.24 * intensity },
          { kind: "hotkey", control: "thinking" }
        ];
      case "agreeing":
        return [{ kind: "hotkey", control: "mild_smile" }];
      case "uncertain":
        return [{ kind: "hotkey", control: "uncertain" }];
      case "speaking":
        return [
          ...neutralHead(),
          { kind: "hotkey", control: "speaking_ready" },
          { kind: "note", message: "M1 speech segment has no TTS/viseme playback; use a speech-ready pose only." }
        ];
      case "summarising":
        return [...neutralHead(), { kind: "hotkey", control: "mild_smile" }];
      case "deferring":
        return [{ kind: "hotkey", control: "defer_to_human" }];
      case "boundary":
        return [{ kind: "hotkey", control: "boundary" }];
      case "reset_neutral":
        return [{ kind: "hotkey", control: "reset_neutral" }, ...neutralHead()];
    }
  }

  if (event.type === "speech") {
    return [{
      kind: "note",
      message: `Speech intent ${event.speechAct} is present, but audio/lip-sync is outside Milestone 1: ${event.text}`
    }];
  }

  return [{
    kind: "note",
    message: `Overlay is review/capture-layer metadata rather than a VTube command: ${event.text}`
  }];
}

/** Resolves abstract controls against a rig profile. Missing mappings become explicit notes. */
export function resolveVTubeCommands(
  abstractCommands: AbstractCommand[],
  rigProfile: RigProfile
): VTubeCommand[] {
  const commands: VTubeCommand[] = [];
  const parameterValues: Array<{ id: string; value: number; weight?: number }> = [];
  const sourceControls: string[] = [];

  for (const command of abstractCommands) {
    if (command.kind === "note") {
      commands.push(command);
      continue;
    }

    if (command.kind === "hotkey") {
      const hotkeySelector = rigProfile.hotkeys[command.control];
      commands.push(hotkeySelector
        ? { kind: "hotkey", hotkeySelector, sourceControl: command.control }
        : { kind: "note", message: `Rig ${rigProfile.rigId} has no hotkey mapping for ${command.control}` });
      continue;
    }

    const mapping = rigProfile.parameters[command.control];
    if (!mapping) {
      commands.push({
        kind: "note",
        message: `Rig ${rigProfile.rigId} has no parameter mapping for ${command.control}`
      });
      continue;
    }

    parameterValues.push({
      id: mapping.vtsInputParameter,
      value: mapNormalisedValue(command.normalizedValue, mapping.min, mapping.max, mapping.neutral),
      weight: mapping.weight
    });
    sourceControls.push(command.control);
  }

  if (parameterValues.length > 0) {
    commands.unshift({ kind: "parameters", values: parameterValues, sourceControls });
  }

  return commands;
}

export function mapEventToVTubeCommands(event: TimelineEvent, rigProfile: RigProfile): VTubeCommand[] {
  return resolveVTubeCommands(mapEventToAbstractCommands(event), rigProfile);
}

function neutralHead(): AbstractCommand[] {
  return [
    { kind: "parameter", control: "head.angle.x", normalizedValue: 0 },
    { kind: "parameter", control: "head.angle.y", normalizedValue: 0 },
    { kind: "parameter", control: "head.angle.z", normalizedValue: 0 }
  ];
}

function boundedIntensity(value: number | undefined, allowFullRange: boolean): number {
  const requested = value ?? 1;
  const upper = allowFullRange ? 1 : defaultStyleLimits.maxIntensity;
  return Math.min(Math.max(requested, 0), upper);
}

function mapNormalisedValue(normalized: number, min: number, max: number, neutral: number): number {
  const bounded = Math.min(Math.max(normalized, -1), 1);
  return bounded >= 0
    ? neutral + bounded * (max - neutral)
    : neutral + bounded * (neutral - min);
}
