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
type PlayerPayload = {
  frames: Array<{ atMs: number; controls: Record<string, number>; currentState: string | null }>;
  neutralControls: Record<string, number>;
};

function playerPayload(html: string): PlayerPayload {
  const encoded = html.match(/<script id="playback-data" type="application\/json">([^<]+)<\/script>/)?.[1];
  assert.ok(encoded);
  return JSON.parse(encoded) as PlayerPayload;
}

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
  assert.ok(Math.abs(values["avatar-boundary"]! - .54) < Number.EPSILON);
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
  for (const text of ["<svg", "mouth-open", "HANDOFF TO DAVID", ">Start<", "Pause", "Restart", "countdown", "visualMapping", "renderScript", "neutralControls", "currentState", plan.tracks.overlays![0]!.text, "offline prototype", "current", "This is neutral."]) assert.ok(a.includes(text), text);
  assert.doesNotMatch(a, /(?:https?:|<script[^>]+src=|<link\b|\b(?:fetch|XMLHttpRequest|WebSocket|import)\s*\()/i);
  assert.doesNotMatch(a, /Math\.random|setInterval/);
  assert.match(a, /@media\(max-width:420px\).*\.restart\{grid-column:3\}/);
  assert.match(a, /countdown" hidden>3/); assert.match(a, /status">Ready</); assert.match(a, /let mode='ready'/);
  assert.match(a, /start\.addEventListener\('click',begin\)/); assert.match(a, /function restart\(\).*setNeutral\(\);displayState\(null\);status\.classList\.remove\('error'\).*mode='countdown'/s); assert.match(a, /at>=data\.metadata\.durationMs\)\{setNeutral\(\)/);
  assert.match(a, /displayState\(frame\.currentState\)/); assert.match(a, /\(n%60000\)\/1000/);
  assert.match(a, /class="state-label" role="status" aria-live="polite" aria-atomic="true"/);
  assert.match(a, /stateLabel\.textContent=isError\?'Playback error\.':'This is '\+String\(raw\)\.replace\(\/_\/g,' '\)\+'\.'/);
  assert.doesNotMatch(a, /stateLabel\.innerHTML/);
});

test("embedded player accepts only exact versioned parent commands and preserves neutral lifecycle", () => {
  const html = generateLocalSvgPlayer(plan, profile);
  assert.match(html, /event\.source!==parent/);
  assert.match(html, /m\.protocol!=='local-svg-player-control\.v1'/);
  assert.match(html, /Object\.keys\(m\)\.some\(k=>!\['protocol','command','startAtEpochMs'\]\.includes\(k\)\)/);
  assert.match(html, /\['start','pause','resume','restart'\]\.includes\(m\.command\)/);
  assert.match(html, /Number\.isSafeInteger\(m\.startAtEpochMs\)/);
  assert.match(html, /!timed&&'startAtEpochMs'in m/);
  assert.match(html, /nextStartAt=m\.startAtEpochMs;restart\(\)/);
  assert.match(html, /togglePause\(m\.command==='pause'\)/);
  assert.match(html, /window\.parent!==window.*\.panel.*hidden=true/);
  assert.match(html, /\.panel\[hidden\]\{display:none\}/);
  assert.doesNotMatch(html, /\.state-label\[hidden\]/);
  assert.doesNotMatch(html, /window\.frameElement/);
  assert.match(html, /function restart\(\).*setNeutral\(\)/s);
  assert.match(html, /function restart\(\).*displayState\(null\)/s);
  assert.match(html, /at>=data\.metadata\.durationMs\)\{setNeutral\(\)/);
  assert.match(html, /at>=data\.metadata\.durationMs\).*displayState\(null\)/s);
  assert.match(html, /catch\(e\)\{setNeutral\(\);displayState\(null,true\)/);
  assert.doesNotMatch(html, /current\.textContent=String\(e/);
});

test("generated reference frames expose plan-derived semantic state names", () => {
  const payload = playerPayload(generateLocalSvgPlayer(plan, profile));
  assert.equal(payload.frames.find(frame => frame.atMs === 0)?.currentState, "listening");
  assert.equal(payload.frames.find(frame => frame.atMs === 4500)?.currentState, "thinking");
});

test("reference states have distinct restrained control fingerprints and intentional stillness", () => {
  const payload = playerPayload(generateLocalSvgPlayer(plan, profile));
  const controlsAt = (atMs: number) => {
    const selected = payload.frames.find(frame => frame.atMs === atMs);
    assert.ok(selected, `missing frame at ${atMs}`);
    return selected.controls;
  };
  const listening = controlsAt(3000);
  const thinking = controlsAt(8500);
  const agreement = controlsAt(11500);
  const uncertain = controlsAt(14500);
  const speaking = controlsAt(22000);
  const deferring = controlsAt(26000);
  const neutral = controlsAt(28000);

  assert.ok(listening["avatar-head-y"]! > 0 && listening["avatar-gaze-y"]! >= .12);
  assert.ok(thinking["avatar-gaze-x"]! < 0 && thinking["avatar-gaze-y"]! > listening["avatar-gaze-y"]! && thinking["avatar-brows"]! < 0);
  assert.ok(agreement["avatar-smile"]! > 0);
  assert.ok(uncertain["avatar-caveat"]! > 0 && uncertain["avatar-head-z"]! > 0);
  assert.ok(speaking["avatar-mouth"]! > 0);
  assert.ok(deferring["avatar-boundary"]! > 0);
  assert.deepEqual(neutral, payload.neutralControls);
  assert.equal(new Set([listening, thinking, agreement, uncertain, speaking, deferring, neutral].map(value => JSON.stringify(value))).size, 7);

  let longestStillRun = 1;
  let currentRun = 1;
  for (let index = 1; index < payload.frames.length; index += 1) {
    if (JSON.stringify(payload.frames[index]!.controls) === JSON.stringify(payload.frames[index - 1]!.controls)) {
      currentRun += 1;
      longestStillRun = Math.max(longestStillRun, currentRun);
    } else {
      currentRun = 1;
    }
  }
  assert.ok(longestStillRun >= 20, `expected at least one second of unchanged controls, got ${longestStillRun} frames`);
});

test("boundary remains distinct from deferral and profile targets stay bounded", () => {
  const boundary = resolveLocalSvgFrame(frame({}, [{ name: "boundary", weight: .65, sourceEventIds: ["boundary"] }]), profile);
  const deferral = resolveLocalSvgFrame(frame({}, [{ name: "defer_to_human", weight: .55, sourceEventIds: ["defer"] }]), profile);
  assert.notDeepEqual(boundary, deferral);
  assert.ok(boundary["avatar-boundary"]! > deferral["avatar-boundary"]!);
  assert.ok(boundary["avatar-brows"]! < 0 && deferral["avatar-brows"]! > 0);

  for (const targets of Object.values(profile.poses)) {
    for (const target of targets) {
      const control = profile.controls[target.control]!;
      assert.ok(target.value >= control.min && target.value <= control.max, `${target.control} target out of range`);
    }
  }
  assert.doesNotMatch(JSON.stringify(plan), /avatar-|svgControlId|vtsInputParameter|FaceAngle|hotkey/i);
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
