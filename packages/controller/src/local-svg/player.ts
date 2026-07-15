import type { AnimationPlan, LocalSvgRigProfile } from "../types.js";
import { validateAnimationPlan } from "../planner/validatePlan.js";
import { validateRigProfile } from "../planner/validateRigProfile.js";
import { compileRenderScript, type CompileRenderScriptOptions } from "../runtime/render-script.js";
import { localSvgNeutralControls, resolveLocalSvgFrame } from "./mapping.js";

const ASSET_ID = "david-delegate-svg-v0";
const CONTROL_IDS = [
  "avatar-boundary",
  "avatar-brows",
  "avatar-caveat",
  "avatar-eyes",
  "avatar-gaze-x",
  "avatar-gaze-y",
  "avatar-head-x",
  "avatar-head-y",
  "avatar-head-z",
  "avatar-mouth",
  "avatar-smile"
] as const;
const VISUAL_MAPPING = {
  headTranslateX: 1,
  headTranslateY: 1,
  gazeTranslateX: 28,
  gazeTranslateY: 24,
  browTranslateY: 12,
  smileCurve: 28,
  mouthCurve: 18,
  mouthStroke: 12,
  mouthOpenRadius: 42,
  mouthOpenOpacity: 3
} as const;

export function generateLocalSvgPlayer(planInput: unknown, profileInput: unknown, compileOptions: CompileRenderScriptOptions = {}): string {
  const pv = validateAnimationPlan(planInput);
  if (!pv.valid) throw new Error(`Invalid animation plan:\n${pv.errors.map(e => `- ${e}`).join("\n")}`);
  const rv = validateRigProfile(profileInput);
  if (!rv.valid) throw new Error(`Invalid rig profile:\n${rv.errors.map(e => `- ${e}`).join("\n")}`);
  const plan = planInput as AnimationPlan;
  const profile = profileInput as LocalSvgRigProfile;
  if (profile.renderer !== "local_svg") throw new Error(`Local SVG player requires renderer "local_svg", received ${JSON.stringify(profile.renderer)}`);
  if (plan.targetRig !== profile.rigId) throw new Error(`Plan targetRig ${JSON.stringify(plan.targetRig)} does not match rig ${JSON.stringify(profile.rigId)}`);
  if (profile.avatar.assetId !== ASSET_ID) throw new Error(`Unsupported local SVG avatar assetId ${JSON.stringify(profile.avatar.assetId)}; expected ${JSON.stringify(ASSET_ID)}`);
  if (profile.avatar.viewBox.width !== 640 || profile.avatar.viewBox.height !== 640) throw new Error(`Unsupported ${ASSET_ID} viewBox ${profile.avatar.viewBox.width}x${profile.avatar.viewBox.height}; expected 640x640 because the first-party avatar geometry uses fixed coordinates`);
  const profileControlIds = Object.values(profile.controls).map(control => control.svgControlId).sort();
  const expectedControlIds = [...CONTROL_IDS].sort();
  if (JSON.stringify(profileControlIds) !== JSON.stringify(expectedControlIds)) {
    throw new Error(`Unsupported ${ASSET_ID} control IDs; expected exactly ${expectedControlIds.join(", ")}`);
  }
  const disclosure = plan.tracks.overlays?.find(o => o.startMs === 0 && o.durationMs === plan.durationMs && /ai/i.test(o.text) && /delegate/i.test(o.text));
  if (!disclosure) throw new Error("Plan requires a full-duration overlay starting at 0 whose text contains AI and delegate");
  const records = compileRenderScript(plan, compileOptions);
  const terminal = records.find(record => record.record === "end");
  if (!terminal || terminal.record !== "end") throw new Error("Render script has no terminal end record");
  const playbackDurationMs = terminal.atMs;
  const statesById = new Map(plan.tracks.states.map(event => [event.id, event.state]));
  const frames = records.filter(r => r.record === "frame").map(frame => ({ atMs: frame.atMs, controls: resolveLocalSvgFrame(frame, profile), currentState: frame.activeEventIds.map(id => statesById.get(id)).find(state => state !== undefined) ?? null, activeEventIds: frame.activeEventIds }));
  const payload = { metadata: { title: plan.title, durationMs: playbackDurationMs, planDurationMs: plan.durationMs, outcome: terminal.outcome, rigId: profile.rigId, assetId: profile.avatar.assetId, disclosure: disclosure.text }, visualMapping: VISUAL_MAPPING, renderScript: records, frames, neutralControls: localSvgNeutralControls(profile) };
  const json = JSON.stringify(payload).replace(/[<>&]/g, c => ({"<":"\\u003c", ">":"\\u003e", "&":"\\u0026"}[c]!));
  const title = escapeHtml(plan.title);
  const w = profile.avatar.viewBox.width, h = profile.avatar.viewBox.height;
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data:; connect-src 'none'; font-src 'none'; media-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'">
<title>${title} — Offline AI Delegate</title><style>
:root{color-scheme:dark;font-family:ui-sans-serif,system-ui,sans-serif;background:#0b1020;color:#eef2ff}*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:radial-gradient(circle at 50% 20%,#26345d,#090d18 65%)}main{width:min(94vw,760px)}.stage{position:relative;overflow:hidden;border:1px solid #7180aa55;border-radius:24px;background:linear-gradient(150deg,#17213b,#0e1426);box-shadow:0 28px 80px #0008}.avatar{display:block;width:100%;max-height:72vh}.badge{position:absolute;top:18px;left:18px;right:18px;width:max-content;max-width:calc(100% - 36px);padding:7px 11px;border:1px solid #a9b7df55;border-radius:18px;background:#10182ddd;font-size:clamp(9px,2vw,12px);letter-spacing:.08em;text-align:center;text-transform:uppercase;overflow-wrap:anywhere}.disclosure{position:absolute;left:20px;right:20px;bottom:18px;padding:11px 15px;border-radius:12px;background:#080d1be8;border-left:3px solid #7dd3fc;font-weight:650;text-align:center}.countdown{position:absolute;inset:0;display:grid;place-items:center;background:#080d1bbb;font-size:clamp(72px,18vw,150px);font-weight:800}.countdown[hidden]{display:none}.panel{display:flex;gap:10px;align-items:center;margin-top:12px;padding:12px 14px;border-radius:14px;background:#11182a}.state{flex:1}.time{font-variant-numeric:tabular-nums;color:#b8c3e2}button{border:1px solid #8392bd66;border-radius:9px;background:#24304e;color:#fff;padding:9px 15px;font-weight:650;cursor:pointer}button:hover{background:#324264}.error{color:#fda4af}
</style></head><body><main><section class="stage" aria-label="Offline AI delegate animation">
<svg class="avatar" viewBox="0 0 ${w} ${h}" role="img" aria-labelledby="avatar-title"><title id="avatar-title">Stylised geometric AI delegate avatar</title><defs><linearGradient id="bg" x2="1" y2="1"><stop stop-color="#24365d"/><stop offset="1" stop-color="#111a31"/></linearGradient><filter id="shadow"><feDropShadow dx="0" dy="14" stdDeviation="16" flood-opacity=".35"/></filter></defs><rect width="${w}" height="${h}" fill="url(#bg)"/><circle cx="${w*.5}" cy="${h*.48}" r="${Math.min(w,h)*.37}" fill="#9ae6ff" opacity=".07"/><g id="head" filter="url(#shadow)"><path d="M190 510 Q320 570 450 510 L420 385 L220 385Z" fill="#43577e"/><rect x="190" y="105" width="260" height="330" rx="118" fill="#dde8f4"/><path d="M205 225 Q215 105 320 100 Q435 110 448 230 Q385 180 300 184 Q245 185 205 225" fill="#24304a"/><g id="brows" fill="none" stroke="#34415d" stroke-width="12" stroke-linecap="round"><path d="M235 260 Q270 242 297 260"/><path d="M343 260 Q375 242 405 260"/></g><g id="eyes" fill="#172038"><ellipse cx="270" cy="294" rx="22" ry="18"/><ellipse cx="370" cy="294" rx="22" ry="18"/><g id="pupils" fill="#79d7f2"><circle cx="270" cy="294" r="8"/><circle cx="370" cy="294" r="8"/></g></g><ellipse id="mouth-open" cx="320" cy="364" rx="25" ry="0" fill="#26334e" opacity="0"/><path id="mouth" d="M282 362 Q320 378 358 362" fill="none" stroke="#394762" stroke-width="12" stroke-linecap="round"/><path id="caveat" d="M218 342 Q204 366 220 389" fill="none" stroke="#f3b56c" stroke-width="8" opacity="0"/><g id="boundary" opacity="0"><path d="M468 200 L468 405" stroke="#7dd3fc" stroke-width="9" stroke-linecap="round"/><rect x="370" y="150" width="220" height="48" rx="24" fill="#10182d" stroke="#7dd3fc" stroke-width="3"/><text x="480" y="181" fill="#dff7ff" font-size="22" font-weight="750" text-anchor="middle" letter-spacing="1">HANDOFF TO DAVID</text></g></g></svg>
<div class="badge"></div><div class="disclosure"></div><div class="countdown" hidden>3</div></section><section class="panel"><div class="state"><strong class="status">Ready</strong><div class="current">neutral</div></div><span class="time">00:00.0 / 00:00.0</span><button class="start">Start</button><button class="pause" disabled>Pause</button><button class="restart">Restart</button></section></main>
<script id="playback-data" type="application/json">${json}</script><script>
'use strict';const data=JSON.parse(document.getElementById('playback-data').textContent),visual=data.visualMapping;const $=s=>document.querySelector(s),head=$('#head'),eyes=$('#eyes'),pupils=$('#pupils'),brows=$('#brows'),mouth=$('#mouth'),mouthOpen=$('#mouth-open'),caveat=$('#caveat'),boundary=$('#boundary'),status=$('.status'),current=$('.current'),time=$('.time'),countdown=$('.countdown'),start=$('.start'),pause=$('.pause');$('.badge').textContent=data.metadata.rigId+' · offline prototype';$('.disclosure').textContent=data.metadata.disclosure;
let mode='ready',started=0,pausedAt=0,pauseTotal=0,last=-1,raf=0;const f=n=>{const s=((n%60000)/1000).toFixed(1).padStart(4,'0');return String(Math.floor(n/60000)).padStart(2,'0')+':'+s};const setNeutral=()=>applyControls(data.neutralControls);
function applyControls(c){const v=id=>c[id],open=v('avatar-mouth');head.setAttribute('transform','translate('+(v('avatar-head-x')*visual.headTranslateX)+' '+(v('avatar-head-y')*visual.headTranslateY)+') rotate('+v('avatar-head-z')+' 320 300)');pupils.setAttribute('transform','translate('+(v('avatar-gaze-x')*visual.gazeTranslateX)+' '+(v('avatar-gaze-y')*visual.gazeTranslateY)+')');eyes.setAttribute('transform','translate(0 '+(294*(1-v('avatar-eyes')))+') scale(1 '+v('avatar-eyes')+')');brows.setAttribute('transform','translate(0 '+(-v('avatar-brows')*visual.browTranslateY)+')');mouth.setAttribute('d','M282 362 Q320 '+(378+v('avatar-smile')*visual.smileCurve-open*visual.mouthCurve)+' 358 362');mouth.setAttribute('stroke-width',String(visual.mouthStroke+open*visual.mouthStroke));mouthOpen.setAttribute('ry',String(open*visual.mouthOpenRadius));mouthOpen.setAttribute('opacity',String(Math.min(1,open*visual.mouthOpenOpacity)));caveat.setAttribute('opacity',String(v('avatar-caveat')));boundary.setAttribute('opacity',String(v('avatar-boundary')))}
function begin(){if(mode==='countdown'||mode==='playing'||mode==='paused'||mode==='paused-countdown')return;restart()}
function restart(){cancelAnimationFrame(raf);setNeutral();status.classList.remove('error');mode='countdown';started=performance.now();pauseTotal=0;last=-1;countdown.hidden=false;countdown.textContent='3';status.textContent='Countdown';current.textContent='neutral';start.disabled=true;pause.disabled=false;pause.textContent='Pause';time.textContent=f(0)+' / '+f(data.metadata.durationMs);raf=requestAnimationFrame(tick)}
function tick(now){try{if(mode==='paused'||mode==='paused-countdown'){raf=requestAnimationFrame(tick);return}const elapsed=now-started-pauseTotal;if(mode==='countdown'){const left=3000-elapsed;if(left>0){countdown.textContent=String(Math.ceil(left/1000));raf=requestAnimationFrame(tick);return}mode='playing';started=now;pauseTotal=0;countdown.hidden=true;status.textContent='Playing'}const at=now-started-pauseTotal;if(at>=data.metadata.durationMs){setNeutral();mode=data.metadata.outcome;status.textContent=data.metadata.outcome==='completed'?'Completed':data.metadata.outcome==='cancelled'?'Cancelled':'Error';status.classList.toggle('error',data.metadata.outcome==='error');current.textContent='neutral';start.disabled=false;pause.disabled=true;time.textContent=f(data.metadata.durationMs)+' / '+f(data.metadata.durationMs);return}let i=Math.min(data.frames.length-1,Math.floor(at/(data.renderScript[0].tickMs)));if(i!==last){last=i;const frame=data.frames[i];applyControls(frame.controls);current.textContent=frame.currentState||'neutral'}time.textContent=f(at)+' / '+f(data.metadata.durationMs);raf=requestAnimationFrame(tick)}catch(e){setNeutral();mode='error';status.textContent='Error';status.classList.add('error');current.textContent=String(e instanceof Error?e.message:e);start.disabled=false;pause.disabled=true}}
pause.addEventListener('click',()=>{if(mode==='playing'||mode==='countdown'){pausedAt=performance.now();mode=mode==='countdown'?'paused-countdown':'paused';status.textContent='Paused';pause.textContent='Resume'}else if(mode==='paused'||mode==='paused-countdown'){const wasCountdown=mode==='paused-countdown';pauseTotal+=performance.now()-pausedAt;mode=wasCountdown?'countdown':'playing';status.textContent=wasCountdown?'Countdown':'Playing';pause.textContent='Pause'}});start.addEventListener('click',begin);$('.restart').addEventListener('click',restart);document.addEventListener('visibilitychange',()=>{if(document.hidden&&(mode==='playing'||mode==='countdown'))pause.click()});setNeutral();time.textContent=f(0)+' / '+f(data.metadata.durationMs);
</script></body></html>\n`;
}

function escapeHtml(value: string): string { return value.replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]!)); }
