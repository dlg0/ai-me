import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { AnimationPlan, Diagnostic, LocalSvgRigProfile } from "../types.js";
import { validateAnimationPlan } from "../planner/validatePlan.js";
import { validateRigProfile } from "../planner/validateRigProfile.js";
import { compileRenderScript, serializeRenderScript, type CompileRenderScriptOptions, type RenderScriptFrameRecord, type RenderScriptRecord } from "../runtime/render-script.js";
import { resolveLocalSvgFrame } from "./mapping.js";
import { generateLocalSvgPlayer } from "./player.js";

export const RUN_IDENTITY = "Offline AI-delegate prototype — not David personally attending";

export interface LocalSvgRunOptions {
  outputRoot: string;
  planSource: string;
  rigProfileSource: string;
  reviewNotesTemplate: string;
  compile?: CompileRenderScriptOptions;
  runId?: string;
  createdAt?: string;
  /** Test seam for proving that partially-created runs survive an unexpected failure. */
  beforeFinalization?: () => void;
}

export interface LocalSvgRunResult { runId: string; runDirectory: string; status: "finalized" | "failed"; outcome: "completed" | "cancelled" | "error"; }

export function createLocalSvgRun(options: LocalSvgRunOptions): LocalSvgRunResult {
  const createdAt = options.createdAt ?? new Date().toISOString();
  if (!Number.isFinite(Date.parse(createdAt))) throw new Error("createdAt must be an ISO-compatible timestamp");
  const sourceHash = sha256(options.planSource + "\0" + options.rigProfileSource);
  const runId = options.runId ?? `${createdAt.replace(/[-:]/g, "")}-${sourceHash.slice(0, 12)}`;
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(runId)) throw new Error("runId must be a path-safe 1-128 character identifier");
  const outputRoot = resolve(options.outputRoot);
  mkdirSync(outputRoot, { recursive: true });
  const runDirectory = resolve(outputRoot, runId);
  mkdirSync(runDirectory, { recursive: false }); // Deliberately fails rather than overwriting an attempt.
  const sourceChecksums = { "plan.json": sha256(options.planSource), "rig-profile.json": sha256(options.rigProfileSource) };
  let manifest: Record<string, unknown> = baseManifest(runId, createdAt, sourceChecksums);
  write(runDirectory, "manifest.json", json(manifest));
  write(runDirectory, "plan.json", options.planSource);
  write(runDirectory, "rig-profile.json", options.rigProfileSource);
  write(runDirectory, "review-notes.md", options.reviewNotesTemplate);

  try {
    const parsed = parseAndValidate(options.planSource, options.rigProfileSource);
    write(runDirectory, "validation-diagnostics.json", json(parsed.validation));
    if (!parsed.plan || !parsed.profile || !parsed.valid) {
      const message = parsed.validation.diagnostics.filter(d => d.severity === "error").map(d => `${d.source}: ${d.message}`).join("\n");
      const log = [{ category: "validation_diagnostic", atMs: null, severity: "error", message }];
      write(runDirectory, "renderer-log.jsonl", jsonl(log));
      write(runDirectory, "player.html", failedPlayer(message));
      options.beforeFinalization?.();
      manifest = finalizeManifest(manifest, "failed", "error", runDirectory, ["validation-diagnostics.json", "renderer-log.jsonl", "player.html", "review-notes.md"], false, false, message);
      write(runDirectory, "manifest.json", json(manifest));
      return { runId, runDirectory, status: "failed", outcome: "error" };
    }

    const compile = options.compile ?? {};
    const artifacts = ["validation-diagnostics.json", "review-notes.md"];
    let records: RenderScriptRecord[];
    try {
      records = compileRenderScript(parsed.plan, compile);
      write(runDirectory, "render-script.jsonl", serializeRenderScript(records));
      artifacts.push("render-script.jsonl");
      write(runDirectory, "renderer-log.jsonl", jsonl(buildLocalSvgRendererLog(records, parsed.profile, parsed.validation.diagnostics)));
      artifacts.push("renderer-log.jsonl");
      write(runDirectory, "player.html", generateLocalSvgPlayer(parsed.plan, parsed.profile, compile));
      artifacts.push("player.html");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      write(runDirectory, "renderer-log.jsonl", jsonl([{ category: "generation_error", atMs: null, message }]));
      if (!artifacts.includes("renderer-log.jsonl")) artifacts.push("renderer-log.jsonl");
      write(runDirectory, "player.html", failedPlayer(message));
      if (!artifacts.includes("player.html")) artifacts.push("player.html");
      options.beforeFinalization?.();
      manifest = finalizeManifest(manifest, "failed", "error", runDirectory, artifacts, false, false, message);
      write(runDirectory, "manifest.json", json(manifest));
      return { runId, runDirectory, status: "failed", outcome: "error" };
    }
    options.beforeFinalization?.();
    const end = records.find(record => record.record === "end");
    if (!end || end.record !== "end") throw new Error("Generated render script has no outcome");
    manifest = finalizeManifest(manifest, "finalized", end.outcome, runDirectory, artifacts, records.some(r => r.record === "reset"), records.some(r => r.record === "release"));
    write(runDirectory, "manifest.json", json(manifest));
    return { runId, runDirectory, status: "finalized", outcome: end.outcome };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // Best effort only: the initial manifest and exact source copies already exist.
    try {
      write(runDirectory, "generation-error.json", json({ category: "generation_error", atMs: null, message }));
      manifest = { ...manifest, status: "incomplete", outcome: "error", generationError: message };
      write(runDirectory, "manifest.json", json(manifest));
    } catch { /* Preserve whatever evidence was successfully written. */ }
    throw new Error(`Run ${runId} retained incomplete at ${runDirectory}: ${message}`);
  }
}

type ValidationEntry = Diagnostic & { source: "plan" | "rig-profile" };
function parseAndValidate(planSource: string, profileSource: string): { plan?: AnimationPlan; profile?: LocalSvgRigProfile; valid: boolean; validation: { valid: boolean; diagnostics: ValidationEntry[]; warnings: ValidationEntry[] } } {
  let planValue: unknown, profileValue: unknown;
  const diagnostics: ValidationEntry[] = [];
  try { planValue = JSON.parse(planSource); } catch (e) { diagnostics.push({ source: "plan", severity: "error", path: "/", message: `Invalid JSON: ${message(e)}` }); }
  try { profileValue = JSON.parse(profileSource); } catch (e) { diagnostics.push({ source: "rig-profile", severity: "error", path: "/", message: `Invalid JSON: ${message(e)}` }); }
  if (planValue !== undefined) diagnostics.push(...validateAnimationPlan(planValue).diagnostics.map(d => ({ ...d, source: "plan" as const })));
  if (profileValue !== undefined) diagnostics.push(...validateRigProfile(profileValue).diagnostics.map(d => ({ ...d, source: "rig-profile" as const })));
  if (planValue && profileValue && (planValue as AnimationPlan).targetRig !== (profileValue as LocalSvgRigProfile).rigId) diagnostics.push({ source: "rig-profile", severity: "error", path: "/rigId", message: "does not match plan targetRig" });
  const valid = !diagnostics.some(d => d.severity === "error");
  return { ...(planValue !== undefined ? { plan: planValue as AnimationPlan } : {}), ...(profileValue !== undefined ? { profile: profileValue as LocalSvgRigProfile } : {}), valid, validation: { valid, diagnostics, warnings: diagnostics.filter(d => d.severity === "warning") } };
}

export function buildLocalSvgRendererLog(records: readonly RenderScriptRecord[], profile: LocalSvgRigProfile, diagnostics: ValidationEntry[] = []): object[] {
  const result: object[] = [{ category: "validation_summary", atMs: null, valid: !diagnostics.some(d => d.severity === "error"), diagnosticCount: diagnostics.length }, ...diagnostics.map(d => ({ category: "validation_diagnostic", atMs: null, ...d }))];
  for (const record of records) {
    if (record.record === "header") result.push({ category: "playback_header", atMs: 0, ...record });
    else if (record.record === "event") result.push({ category: "planned_event_edge", ...record });
    else if (record.record === "frame") result.push(frameLog(record, profile));
    else if (record.record === "cancelled" || record.record === "error") result.push({ category: "interruption", ...record });
    else if (record.record === "end") result.push({ category: "playback_end", ...record });
    else if (record.record === "reset") result.push({ category: "final_reset", ...record });
    else result.push({ category: "release", ...record });
  }
  return result;
}

function frameLog(frame: RenderScriptFrameRecord, profile: LocalSvgRigProfile): object {
  const owners = new Map<string, { kind: "parameter" | "pose"; control: string; sourceEventIds: string[] }>();
  const decisions: object[] = [];
  for (const abstractControl of Object.keys(frame.params)) {
    const target = profile.parameters[abstractControl];
    const id = target ? profile.controls[target]?.svgControlId : undefined;
    if (id) owners.set(id, { kind: "parameter", control: abstractControl, sourceEventIds: frame.activeEventIds });
  }
  for (const pose of frame.poses) {
    if (pose.sourceEventIds.length > 1) decisions.push({ decision: "coalesced", pose: pose.name, sourceEventIds: pose.sourceEventIds });
    for (const target of profile.poses[pose.name] ?? []) {
      const id = profile.controls[target.control]?.svgControlId;
      if (!id) continue;
      const prior = owners.get(id);
      if (prior) decisions.push({ decision: "later_pose_wins", rendererControlId: id, suppressedKind: prior.kind, suppressedControl: prior.control, suppressedSourceEventIds: prior.sourceEventIds, winningPose: pose.name, winningSourceEventIds: pose.sourceEventIds });
      owners.set(id, { kind: "pose", control: pose.name, sourceEventIds: pose.sourceEventIds });
    }
  }
  return { category: "resolved_frame", atMs: frame.atMs, tick: frame.tick, phase: frame.phase, activeEventIds: frame.activeEventIds, abstract: { params: frame.params, poses: frame.poses }, rendererControls: resolveLocalSvgFrame(frame, profile), suppressionDecisions: decisions };
}

function baseManifest(runId: string, createdAt: string, sources: Record<string, string>): Record<string, unknown> {
  return { schemaVersion: "local-svg-run.v1", runId, createdAt, status: "incomplete", outcome: null, identity: RUN_IDENTITY, offline: true, renderer: "local_svg", sourceSha256: sources, artifactSha256: {}, resetEvidence: false, releaseEvidence: false, recording: { path: null, sha256: null } };
}
function finalizeManifest(base: Record<string, unknown>, status: "finalized" | "failed", outcome: string, directory: string, files: string[], reset: boolean, release: boolean, failure?: string): Record<string, unknown> {
  const artifacts = Object.fromEntries(files.map(name => [name, sha256(readFileSync(resolve(directory, name)))]));
  return { ...base, status, outcome, artifactSha256: artifacts, resetEvidence: reset, releaseEvidence: release, ...(failure ? { failure } : {}) };
}
function write(directory: string, name: string, contents: string): void { writeFileSync(resolve(directory, name), contents); }
function sha256(value: string | Buffer): string { return createHash("sha256").update(value).digest("hex"); }
function json(value: unknown): string { return JSON.stringify(value, null, 2) + "\n"; }
function jsonl(values: readonly object[]): string { return values.map(value => JSON.stringify(value)).join("\n") + "\n"; }
function message(error: unknown): string { return error instanceof Error ? error.message : String(error); }
function failedPlayer(detail: string): string { const safe = detail.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!)); return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'"><title>Failed Offline AI Delegate Run</title><style>body{font-family:system-ui;background:#160d13;color:#ffe4e6;padding:3rem}main{max-width:50rem;margin:auto}pre{white-space:pre-wrap}</style></head><body><main><h1>Offline AI-delegate prototype — failed run</h1><p>No playback was generated. The source files and diagnostics remain available for review.</p><pre>${safe}</pre></main></body></html>\n`; }
