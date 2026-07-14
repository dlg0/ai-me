import type { AnimationPlan, GestureEvent, StateEvent, TimelineEvent } from "../types.js";
import { validateAnimationPlan } from "../planner/validatePlan.js";
import { mapEventToAbstractCommands } from "./mapping.js";
import { compareEventIdentity, flattenTimeline } from "./timeline.js";

export const DEFAULT_RENDER_TICK_MS = 50;
export const DEFAULT_RENDER_TRANSITION_MS = 450;
const DECIMALS = 4;

export type RenderOutcome = "completed" | "cancelled" | "error";
export interface CompileRenderScriptOptions {
  tickMs?: number;
  transitionMs?: number;
  outcome?: RenderOutcome;
  stopAtMs?: number;
  reason?: string;
}
export interface RenderPoseContribution { name: string; weight: number; sourceEventIds: string[]; }
export interface RenderFramePose { params: Record<string, number>; poses: RenderPoseContribution[]; activeEventIds: string[]; }
export interface RenderScriptHeaderRecord { record: "header"; schemaVersion: "render-script.v1"; title: string; targetRig: string; safetyMode: AnimationPlan["safetyMode"]; durationMs: number; effectiveStopMs: number; tickMs: number; transitionMs: number; easing: string; valueDecimals: number; posePolicy: string; }
export interface RenderScriptEventRecord { record: "event"; edge: "start" | "end"; atMs: number; eventId: string; eventType: TimelineEvent["type"]; name: string; text?: string; position?: string; speechAct?: string; reason?: string; }
export interface RenderScriptFrameRecord extends RenderFramePose { record: "frame"; tick: number; atMs: number; phase: "playback" | "reset"; }
export interface RenderScriptInterruptionRecord { record: "cancelled" | "error"; atMs: number; requestedStopMs: number; effectiveStopMs: number; reason?: string; }
export interface RenderScriptEndRecord { record: "end"; atMs: number; outcome: RenderOutcome; }
export interface RenderScriptResetRecord { record: "reset"; atMs: number; params: Record<string, number>; poses: []; }
export interface RenderScriptReleaseRecord { record: "release"; atMs: number; }
export type RenderScriptRecord = RenderScriptHeaderRecord | RenderScriptEventRecord | RenderScriptFrameRecord | RenderScriptInterruptionRecord | RenderScriptEndRecord | RenderScriptResetRecord | RenderScriptReleaseRecord;

/** Pure compiler from validated semantic intent to renderer-independent samples. */
export function compileRenderScript(input: unknown, options: CompileRenderScriptOptions = {}): RenderScriptRecord[] {
  const validation = validateAnimationPlan(input);
  if (!validation.valid) throw new Error(`Invalid animation plan:\n${validation.errors.map((e) => `- ${e}`).join("\n")}`);
  const plan = input as AnimationPlan;
  const tickMs = positiveInteger(options.tickMs ?? DEFAULT_RENDER_TICK_MS, "tickMs");
  const transitionMs = positiveInteger(options.transitionMs ?? DEFAULT_RENDER_TRANSITION_MS, "transitionMs");
  if (transitionMs % tickMs !== 0) throw new Error("transitionMs must be a multiple of tickMs");
  const outcome = options.outcome ?? "completed";
  if (!(["completed", "cancelled", "error"] as string[]).includes(outcome)) throw new Error(`outcome must be completed, cancelled, or error`);
  if (outcome === "completed" && options.stopAtMs !== undefined) throw new Error("stopAtMs is only valid for cancelled or error outcomes");
  if (outcome === "completed" && options.reason !== undefined) throw new Error("reason is only valid for cancelled or error outcomes");
  if (outcome !== "completed" && options.stopAtMs === undefined) throw new Error(`${outcome} outcome requires stopAtMs`);
  if (options.reason !== undefined && (typeof options.reason !== "string" || options.reason.trim().length === 0)) throw new Error("reason must be a non-empty string");
  const requestedStop = options.stopAtMs ?? plan.durationMs;
  if (!Number.isSafeInteger(requestedStop) || requestedStop < 0 || requestedStop > plan.durationMs) throw new Error("stopAtMs must be a non-negative safe integer within the plan duration");
  const effectiveStopMs = outcome === "completed" ? plan.durationMs : Math.floor(requestedStop / tickMs) * tickMs;
  const events = flattenTimeline(plan);
  rejectGestureConflicts(plan.tracks.gestures);
  const params = knownParameters(plan.tracks.states);
  const records: RenderScriptRecord[] = [{
    record: "header", schemaVersion: "render-script.v1", title: plan.title,
    targetRig: plan.targetRig, safetyMode: plan.safetyMode, durationMs: plan.durationMs,
    effectiveStopMs, tickMs, transitionMs, easing: "smoothstep:t*t*(3-2*t)", valueDecimals: DECIMALS,
    posePolicy: "unique abstract pose names; coalesce same-name contributions by maximum weight with sorted sourceEventIds; state before gesture, then startMs and event ID; after rig resolution later listed poses win renderer-control collisions"
  }];
  const markerTimes = new Map<number, Array<{ edge: "end" | "start"; event: TimelineEvent }>>();
  for (const event of events) {
    if (event.startMs <= effectiveStopMs) addMarker(markerTimes, event.startMs, "start", event);
    const end = event.startMs + (event.durationMs ?? 0);
    if (event.durationMs !== undefined && end <= effectiveStopMs) addMarker(markerTimes, end, "end", event);
  }
  const tickTimes: number[] = [];
  for (let at = 0; at <= effectiveStopMs; at += tickMs) tickTimes.push(at);
  const tickTimeSet = new Set(tickTimes);
  const allTimes = [...new Set([...tickTimes, ...markerTimes.keys()])].sort((a, b) => a - b);
  let tick = 0;
  let interrupted: ReturnType<typeof sampleFrame> | undefined;
  for (const atMs of allTimes) {
    const markers = markerTimes.get(atMs) ?? [];
    markers.sort((a, b) => (a.edge === b.edge ? compareEventIdentity(a.event, b.event) : a.edge === "end" ? -1 : 1));
    for (const { edge, event } of markers) records.push(eventMarker(edge, atMs, event));
    if (tickTimeSet.has(atMs)) {
      interrupted = sampleFrame(plan, params, atMs, transitionMs);
      records.push({ record: "frame", tick: tick++, atMs, phase: "playback", ...interrupted });
    }
  }
  if (outcome !== "completed") {
    records.push({ record: outcome, atMs: effectiveStopMs, requestedStopMs: requestedStop, effectiveStopMs, ...(options.reason ? { reason: options.reason } : {}) });
    const initial = interrupted ?? sampleFrame(plan, params, effectiveStopMs, transitionMs);
    for (let elapsed = tickMs; elapsed <= transitionMs; elapsed += tickMs) {
      const atMs = effectiveStopMs + elapsed;
      const p = smoothstep(Math.min(elapsed / transitionMs, 1));
      records.push({ record: "frame", tick: tick++, atMs, phase: "reset", params: sortedMap(Object.fromEntries(Object.entries(initial.params).map(([k, v]) => [k, q(v * (1 - p))]))), poses: initial.poses.map((pose) => ({ ...pose, weight: q(pose.weight * (1 - p)) })).filter((pose) => pose.weight > 0), activeEventIds: [] });
    }
  }
  const terminalAt = outcome === "completed" ? plan.durationMs : effectiveStopMs + transitionMs;
  records.push({ record: "end", atMs: terminalAt, outcome });
  records.push({ record: "reset", atMs: terminalAt, params: neutralParams(params), poses: [] });
  records.push({ record: "release", atMs: terminalAt });
  return records;
}

export function serializeRenderScript(records: readonly RenderScriptRecord[]): string {
  return records.map((record) => JSON.stringify(record)).join("\n") + "\n";
}

function sampleFrame(plan: AnimationPlan, names: string[], atMs: number, transitionMs: number): RenderFramePose {
  const state = plan.tracks.states.find((e) => atMs >= e.startMs && atMs < e.startMs + e.durationMs);
  const target = state ? stateParameters(state) : {};
  const segmentStart = state?.startMs ?? gapStart(plan.tracks.states, atMs);
  const previous = valuesImmediatelyBefore(plan.tracks.states, names, segmentStart, transitionMs);
  const duration = state?.durationMs ?? transitionMs;
  const progress = smoothstep(Math.min((atMs - segmentStart) / Math.min(transitionMs, duration), 1));
  const params = sortedMap(Object.fromEntries(names.map((name) => [name, q(clamp((previous[name] ?? 0) + ((target[name] ?? 0) - (previous[name] ?? 0)) * progress, -1, 1))])));
  const activeEvents = flattenTimeline(plan).filter((e) => atMs >= e.startMs && atMs < e.startMs + (e.durationMs ?? 0));
  const poseEvents = activeEvents.filter((e): e is StateEvent | GestureEvent => e.type === "state" || e.type === "gesture")
    .sort((a, b) => (a.type === b.type ? a.startMs - b.startMs || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0) : a.type === "state" ? -1 : 1));
  const poses: RenderPoseContribution[] = [];
  const poseIndexes = new Map<string, number>();
  for (const event of poseEvents) for (const pose of eventPoses(event)) {
    const weight = q(pose.weight * envelope(event, atMs, transitionMs));
    if (pose.name === "reset_neutral" || weight <= 0) continue;
    const index = poseIndexes.get(pose.name);
    if (index === undefined) {
      poseIndexes.set(pose.name, poses.length);
      poses.push({ name: pose.name, weight, sourceEventIds: [event.id] });
    } else {
      const existing = poses[index]!;
      existing.weight = Math.max(existing.weight, weight);
      existing.sourceEventIds.push(event.id);
      existing.sourceEventIds.sort();
    }
  }
  return { params, poses, activeEventIds: activeEvents.map((e) => e.id).sort() };
}

function valuesImmediatelyBefore(states: StateEvent[], names: string[], atMs: number, transitionMs: number): Record<string, number> {
  if (atMs <= 0) return Object.fromEntries(names.map((n) => [n, 0]));
  const prior = states.filter((s) => s.startMs < atMs).sort((a, b) => b.startMs - a.startMs)[0];
  if (!prior) return Object.fromEntries(names.map((n) => [n, 0]));
  const priorEnd = prior.startMs + prior.durationMs;
  if (atMs >= priorEnd + transitionMs) return Object.fromEntries(names.map((n) => [n, 0]));
  const priorTarget = stateParameters(prior);
  if (atMs <= priorEnd) return Object.fromEntries(names.map((n) => [n, priorTarget[n] ?? 0]));
  const p = smoothstep((atMs - priorEnd) / transitionMs);
  return Object.fromEntries(names.map((n) => [n, (priorTarget[n] ?? 0) * (1 - p)]));
}

function stateParameters(event: StateEvent): Record<string, number> { return Object.fromEntries(mapEventToAbstractCommands(event).filter((c) => c.kind === "parameter").map((c) => [c.control, c.normalizedValue])); }
function knownParameters(states: StateEvent[]): string[] { return [...new Set(states.flatMap((s) => Object.keys(stateParameters(s))))].sort(); }
function eventPoses(event: StateEvent | GestureEvent) { return mapEventToAbstractCommands(event).filter((c) => c.kind === "pose").map((c) => ({ name: c.control, weight: clamp(c.intensity, 0, 1) })); }
function envelope(event: StateEvent | GestureEvent, at: number, transition: number): number { const elapsed = at - event.startMs; const half = event.durationMs / 2; const edge = Math.min(transition, half); return smoothstep(Math.min(elapsed / edge, (event.durationMs - elapsed) / edge, 1)); }
function gapStart(states: StateEvent[], at: number): number { return Math.max(0, ...states.filter((s) => s.startMs + s.durationMs <= at).map((s) => s.startMs + s.durationMs)); }
function eventMarker(edge: "start" | "end", atMs: number, event: TimelineEvent): RenderScriptRecord { const name = event.type === "state" ? event.state : event.type === "gesture" ? event.gesture : event.type === "speech" ? event.speechAct : "overlay"; return { record: "event", edge, atMs, eventId: event.id, eventType: event.type, name, ...(event.type === "overlay" ? { text: event.text, position: event.position } : {}), ...(event.type === "speech" ? { text: event.text, speechAct: event.speechAct } : {}), ...(event.reason ? { reason: event.reason } : {}) }; }
function addMarker(map: Map<number, Array<{ edge: "end" | "start"; event: TimelineEvent }>>, at: number, edge: "end" | "start", event: TimelineEvent) { const list = map.get(at) ?? []; list.push({ edge, event }); map.set(at, list); }
function rejectGestureConflicts(gestures: GestureEvent[]) { for (let i = 0; i < gestures.length; i++) for (let j = i + 1; j < gestures.length; j++) { const a = gestures[i]!, b = gestures[j]!; if (a.gesture === b.gesture && a.startMs < b.startMs + b.durationMs && b.startMs < a.startMs + a.durationMs) throw new Error(`Overlapping gesture pose '${a.gesture}' from events ${a.id} and ${b.id}`); } }
function positiveInteger(value: number, name: string): number { if (!Number.isSafeInteger(value) || value <= 0) throw new Error(`${name} must be a positive safe integer`); return value; }
function smoothstep(t: number): number { const x = clamp(t, 0, 1); return x * x * (3 - 2 * x); }
function clamp(v: number, min: number, max: number) { return Math.min(max, Math.max(min, v)); }
function q(v: number) { const n = Math.round(v * 10 ** DECIMALS) / 10 ** DECIMALS; return Object.is(n, -0) ? 0 : n; }
function sortedMap(values: Record<string, number>) { return Object.fromEntries(Object.entries(values).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)); }
function neutralParams(names: string[]) { return Object.fromEntries(names.map((name) => [name, 0])); }
