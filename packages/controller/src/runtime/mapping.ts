import type { TimelineEvent } from "../types.js";
import { defaultStyleLimits } from "./style.js";

export type AbstractCommand =
  | { kind: "pose"; control: string; intensity: number }
  | { kind: "parameter"; control: string; normalizedValue: number }
  | { kind: "note"; message: string };

/** Converts semantic plan events to renderer-independent abstract controls. */
export function mapEventToAbstractCommands(event: TimelineEvent): AbstractCommand[] {
  const reset = (event.type === "gesture" && event.gesture === "reset_neutral")
    || (event.type === "state" && event.state === "reset_neutral");
  const intensity = event.type === "state" || event.type === "gesture"
    ? boundedIntensity(event.intensity, reset)
    : 1;
  const pose = (control: string): AbstractCommand => ({ kind: "pose", control, intensity });

  if (event.type === "gesture") return [pose(event.gesture)];
  if (event.type === "state") {
    switch (event.state) {
      case "idle": return neutralHead();
      case "listening": return [parameter("head.angle.x", 0), parameter("head.angle.y", 0.16 * intensity), parameter("head.angle.z", 0)];
      case "thinking": return [parameter("head.angle.x", -0.30 * intensity), parameter("head.angle.y", -0.38 * intensity), parameter("head.angle.z", -0.24 * intensity), pose("thinking")];
      case "agreeing": return [pose("mild_smile")];
      case "uncertain": return [pose("uncertain")];
      case "speaking": return [...neutralHead(), pose("speaking_ready"), { kind: "note", message: "M1 speech segment has no TTS/viseme playback; use a speech-ready pose only." }];
      case "summarising": return [...neutralHead(), pose("mild_smile")];
      case "deferring": return [pose("defer_to_human")];
      case "boundary": return [pose("boundary")];
      case "reset_neutral": return [pose("reset_neutral"), ...neutralHead()];
    }
  }
  if (event.type === "speech") return [{ kind: "note", message: `Speech intent ${event.speechAct} is present, but audio/lip-sync is outside Milestone 1: ${event.text}` }];
  return [{ kind: "note", message: `Overlay is review/capture-layer metadata rather than a renderer command: ${event.text}` }];
}

function parameter(control: string, normalizedValue: number): AbstractCommand {
  return { kind: "parameter", control, normalizedValue };
}

function neutralHead(): AbstractCommand[] {
  return [parameter("head.angle.x", 0), parameter("head.angle.y", 0), parameter("head.angle.z", 0)];
}

function boundedIntensity(value: number | undefined, allowFullRange: boolean): number {
  return Math.min(Math.max(value ?? 1, 0), allowFullRange ? 1 : defaultStyleLimits.maxIntensity);
}
