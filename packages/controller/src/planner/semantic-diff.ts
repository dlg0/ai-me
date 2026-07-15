import { createHash } from "node:crypto";
import { readFileSync, realpathSync } from "node:fs";
import { isAbsolute, resolve, sep } from "node:path";
import type { AnimationPlan } from "../types.js";
import { canonicalJson } from "./candidate-set.js";
import { validateAnimationPlan } from "./validatePlan.js";

export interface SemanticChange { kind: "added" | "removed" | "changed"; path: string; before?: unknown; after?: unknown; }
export interface SemanticPlanDiff { schemaVersion: "semantic-plan-diff.v1"; left: string; right: string; changes: SemanticChange[]; }

export function diffSemanticPlans(left: AnimationPlan, right: AnimationPlan, labels = { left: "left", right: "right" }): SemanticPlanDiff {
  assertValid(left, labels.left); assertValid(right, labels.right);
  const changes: SemanticChange[] = [];
  compare("", semanticPlan(left), semanticPlan(right), changes);
  return { schemaVersion: "semantic-plan-diff.v1", left: labels.left, right: labels.right, changes };
}

export function serializeSemanticDiff(diff: SemanticPlanDiff): { json: string; markdown: string } {
  const json = JSON.stringify(diff, null, 2) + "\n";
  const lines = ["# Semantic plan diff", "", `- Left: \`${escapeMd(diff.left)}\``, `- Right: \`${escapeMd(diff.right)}\``, `- Changes: ${diff.changes.length}`, ""];
  if (!diff.changes.length) lines.push("No semantic changes.", "");
  else for (const change of diff.changes) {
    lines.push(`## ${change.kind}: \`${escapeMd(change.path)}\``, "");
    if (change.kind !== "added") lines.push(`- Before: \`${escapeMd(canonicalJson(change.before))}\``);
    if (change.kind !== "removed") lines.push(`- After: \`${escapeMd(canonicalJson(change.after))}\``);
    lines.push("");
  }
  return { json, markdown: lines.join("\n") };
}

export function loadCandidatePlan(setDirectory: string, candidateIdOrPath: string): { plan: AnimationPlan; label: string } {
  const root = realpathSync(resolve(setDirectory));
  const manifest = JSON.parse(readFileSync(resolve(root, "manifest.json"), "utf8"));
  const candidate = manifest.candidates?.find((value: any) => value.candidateId === candidateIdOrPath);
  const relative = candidate?.planPath ?? candidateIdOrPath;
  if (candidate && (typeof relative !== "string" || !relative || isAbsolute(relative))) throw new Error("Manifest candidate planPath must be a non-empty relative path");
  const lexical = resolve(root, relative);
  if (lexical !== root && !lexical.startsWith(root + sep)) throw new Error("Plan path escapes candidate-set directory");
  const absolute = realpathSync(lexical);
  if (absolute !== root && !absolute.startsWith(root + sep)) throw new Error("Plan path escapes candidate-set directory");
  const bytes = readFileSync(absolute);
  if (candidate) {
    const artifactDigest = manifest.artifactSha256?.[relative];
    if (typeof candidate.planSha256 !== "string" || !candidate.planSha256 || typeof artifactDigest !== "string" || !artifactDigest)
      throw new Error("Manifest candidate plan checksums are required");
    const digest = createHash("sha256").update(bytes).digest("hex");
    if (digest !== candidate.planSha256 || digest !== artifactDigest) throw new Error("Candidate plan checksum mismatch");
  }
  const plan = JSON.parse(bytes.toString("utf8"));
  assertValid(plan, candidateIdOrPath);
  return { plan, label: candidate?.candidateId ?? relative };
}

function semanticPlan(plan: AnimationPlan): unknown {
  const event = (value: any): any => Object.fromEntries(Object.entries(value).filter(([key]) => !["id", "reason"].includes(key)));
  const sorted = (values: readonly any[] = []) => values.map((value, index) => ({ value, index })).sort((a, b) => a.value.startMs - b.value.startMs || a.index - b.index).map(item => event(item.value));
  return {
    schemaVersion: plan.schemaVersion, title: plan.title, description: plan.description, durationMs: plan.durationMs,
    safetyMode: plan.safetyMode, targetRig: plan.targetRig,
    tracks: { states: sorted(plan.tracks.states), gestures: sorted(plan.tracks.gestures), speech: sorted(plan.tracks.speech), overlays: sorted(plan.tracks.overlays) }
  };
}
function compare(path: string, left: any, right: any, changes: SemanticChange[]): void {
  if (canonicalJson(left) === canonicalJson(right)) return;
  if (Array.isArray(left) && Array.isArray(right)) {
    for (const item of align(left, right)) {
      const child = `${path}/${item.rightIndex ?? item.leftIndex}`;
      if (item.leftIndex === undefined) changes.push({ kind: "added", path: child, after: right[item.rightIndex!] });
      else if (item.rightIndex === undefined) changes.push({ kind: "removed", path: child, before: left[item.leftIndex] });
      else compare(child, left[item.leftIndex], right[item.rightIndex], changes);
    }
  } else if (isObject(left) && isObject(right)) {
    for (const key of [...new Set([...Object.keys(left), ...Object.keys(right)])].sort()) {
      const child = `${path}/${key}`;
      if (!(key in left)) changes.push({ kind: "added", path: child, after: right[key] });
      else if (!(key in right)) changes.push({ kind: "removed", path: child, before: left[key] });
      else compare(child, left[key], right[key], changes);
    }
  } else changes.push({ kind: "changed", path: path || "/", before: left, after: right });
}
function align(left: any[], right: any[]): Array<{ leftIndex?: number; rightIndex?: number }> {
  const leftKeys = left.map(matchKey), rightKeys = right.map(matchKey);
  const lengths = Array.from({ length: left.length + 1 }, () => Array<number>(right.length + 1).fill(0));
  for (let i = left.length - 1; i >= 0; i--) for (let j = right.length - 1; j >= 0; j--)
    lengths[i][j] = leftKeys[i] === rightKeys[j] ? lengths[i + 1][j + 1] + 1 : Math.max(lengths[i + 1][j], lengths[i][j + 1]);
  const result: Array<{ leftIndex?: number; rightIndex?: number }> = [];
  let i = 0, j = 0;
  while (i < left.length || j < right.length) {
    if (i < left.length && j < right.length && leftKeys[i] === rightKeys[j]) result.push({ leftIndex: i++, rightIndex: j++ });
    else if (j < right.length && (i === left.length || lengths[i][j + 1] > lengths[i + 1][j])) result.push({ rightIndex: j++ });
    else result.push({ leftIndex: i++ });
  }
  return result;
}
function matchKey(value: any): string {
  return canonicalJson({ type: value.type, state: value.state, gesture: value.gesture, speechAct: value.speechAct, position: value.position });
}
function assertValid(value: unknown, label: string): asserts value is AnimationPlan { const result = validateAnimationPlan(value); if (!result.valid) throw new Error(`${label} is not a validated animation plan`); }
function isObject(value: unknown): value is Record<string, any> { return typeof value === "object" && value !== null && !Array.isArray(value); }
function escapeMd(value: string): string { return value.replace(/`/g, "\\`"); }
