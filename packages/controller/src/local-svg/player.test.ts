import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import type { AnimationPlan, LocalSvgRigProfile } from "../types.js";
import type { RenderScriptFrameRecord } from "../runtime/render-script.js";
import { localSvgNeutralControls, resolveLocalSvgFrame } from "./mapping.js";
import { generateLocalSvgPlayer } from "./player.js";

const load = (name: string) => JSON.parse(readFileSync(resolve(process.cwd(), `../../examples/${name}`), "utf8"));
const plan = load("example-animation-plan.json") as AnimationPlan;
const profile = load("rig-profile.local-svg.json") as LocalSvgRigProfile;
const frame = (params: Record<string, number> = {}, poses: RenderScriptFrameRecord["poses"] = []): RenderScriptFrameRecord => ({ record: "frame", tick: 0, atMs: 0, phase: "playback", params, poses, activeEventIds: [] });
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));

test("frame resolver maps asymmetric values, includes all controls, and returns exact neutral", () => {
  const custom = clone(profile); custom.controls.headX = { svgControlId: "avatar-head-x", min: -20, max: 40, neutral: 10 };
  assert.equal(resolveLocalSvgFrame(frame({ "head.angle.x": -.5 }), custom)["avatar-head-x"], -5);
  assert.equal(resolveLocalSvgFrame(frame({ "head.angle.x": .5 }), custom)["avatar-head-x"], 25);
  assert.deepEqual(resolveLocalSvgFrame(frame(), custom), localSvgNeutralControls(custom));
  assert.equal(Object.keys(resolveLocalSvgFrame(frame(), custom)).length, Object.keys(custom.controls).length);
  assert.deepEqual(Object.keys(resolveLocalSvgFrame(frame(), custom)), Object.keys(resolveLocalSvgFrame(frame(), custom)).sort());
});

test("pose targets scale from neutral and later different poses overwrite collisions", () => {
  const custom = clone(profile); custom.controls.boundary.neutral = .2;
  const values = resolveLocalSvgFrame(frame({}, [{ name: "boundary", weight: .5, sourceEventIds: [] }, { name: "defer_to_human", weight: .5, sourceEventIds: [] }]), custom);
  assert.ok(Math.abs(values["avatar-boundary"]! - .425) < Number.EPSILON);
  assert.throws(() => resolveLocalSvgFrame(frame({ missing: 1 }), custom), /no parameter mapping.*missing/);
  assert.throws(() => resolveLocalSvgFrame(frame({}, [{ name: "missing", weight: 1, sourceEventIds: [] }]), custom), /no pose mapping.*missing/);
});

test("resolved controls are quantized to four decimals and normalize negative zero", () => {
  const custom = clone(profile);
  custom.controls.headX = { svgControlId: "avatar-head-x", min: -0.3, max: 0.3, neutral: 0 };
  assert.equal(resolveLocalSvgFrame(frame({ "head.angle.x": .3 }), custom)["avatar-head-x"], .09);
  assert.equal(Object.is(resolveLocalSvgFrame(frame({ "head.angle.x": -0 }), custom)["avatar-head-x"], -0), false);
  custom.controls.boundary.neutral = -0;
  assert.equal(Object.is(resolveLocalSvgFrame(frame({}, [{ name: "boundary", weight: 0, sourceEventIds: [] }]), custom)["avatar-boundary"], -0), false);
});

test("generator is deterministic, self-contained, and embeds playback and neutral data", () => {
  const a = generateLocalSvgPlayer(plan, profile), b = generateLocalSvgPlayer(plan, profile);
  assert.equal(a, b);
  for (const text of ["<svg", ">Start<", "Pause", "Restart", "countdown", "renderScript", "neutralControls", "currentState", plan.tracks.overlays![0]!.text, "offline prototype", "current"]) assert.ok(a.includes(text), text);
  assert.doesNotMatch(a, /(?:https?:|<script[^>]+src=|<link\b|\b(?:fetch|XMLHttpRequest|WebSocket|import)\s*\()/i);
  assert.match(a, /countdown" hidden>3/); assert.match(a, /status">Ready</); assert.match(a, /let mode='ready'/);
  assert.match(a, /start\.addEventListener\('click',begin\)/); assert.match(a, /function restart\(\).*setNeutral\(\);status\.classList\.remove\('error'\).*mode='countdown'/s); assert.match(a, /at>=data\.metadata\.durationMs\)\{setNeutral\(\)/);
  assert.match(a, /current\.textContent=frame\.currentState\|\|'neutral'/); assert.match(a, /\(n%60000\)\/1000/);
});

test("generated reference frames expose plan-derived semantic state names", () => {
  const html = generateLocalSvgPlayer(plan, profile);
  const encoded = html.match(/<script id="playback-data" type="application\/json">([^<]+)<\/script>/)?.[1];
  assert.ok(encoded);
  const payload = JSON.parse(encoded) as { frames: Array<{ atMs: number; currentState: string | null }> };
  assert.equal(payload.frames.find(frame => frame.atMs === 0)?.currentState, "listening");
  assert.equal(payload.frames.find(frame => frame.atMs === 4500)?.currentState, "thinking");
});

test("untrusted title and disclosure cannot escape HTML or script contexts", () => {
  const evil = clone(plan); evil.title = `</title><img onerror="x"> & '"`; evil.tracks.overlays![0]!.text = `AI delegate </script><img onerror='x'> & "`;
  const html = generateLocalSvgPlayer(evil, profile);
  assert.ok(html.includes("&lt;/title&gt;&lt;img onerror=&quot;x&quot;&gt; &amp; &#39;&quot;"));
  assert.doesNotMatch(html, /<img onerror/); assert.doesNotMatch(html, /<\/script><img/);
  assert.ok(html.includes("\\u003c/script\\u003e\\u003cimg"));
});

test("generator rejects incompatible and invalid inputs", () => {
  const wrongRenderer = load("rig-profile.example.json");
  assert.throws(() => generateLocalSvgPlayer(plan, wrongRenderer), /requires renderer/);
  const mismatch = clone(profile); mismatch.rigId = "other"; assert.throws(() => generateLocalSvgPlayer(plan, mismatch), /does not match/);
  const asset = clone(profile); asset.avatar.assetId = "other"; assert.throws(() => generateLocalSvgPlayer(plan, asset), /Unsupported/);
  const viewBox = clone(profile); viewBox.avatar.viewBox.width = 800; assert.throws(() => generateLocalSvgPlayer(plan, viewBox), /viewBox 800x640; expected 640x640.*fixed coordinates/);
  const controls = clone(profile); controls.controls.extra = { svgControlId: "avatar-extra", min: 0, max: 1, neutral: 0 }; assert.throws(() => generateLocalSvgPlayer(plan, controls), /control IDs; expected exactly/);
  const noDisclosure = clone(plan); noDisclosure.tracks.overlays = []; assert.throws(() => generateLocalSvgPlayer(noDisclosure, profile), /full-duration/);
  const short = clone(plan); short.tracks.overlays![0]!.durationMs--; assert.throws(() => generateLocalSvgPlayer(short, profile), /full-duration/);
  assert.throws(() => generateLocalSvgPlayer({}, profile), /Invalid animation plan/);
  assert.throws(() => generateLocalSvgPlayer(plan, {}), /Invalid rig profile/);
});
