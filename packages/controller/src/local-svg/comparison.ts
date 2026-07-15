import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { isAbsolute, resolve, sep } from "node:path";
import type { AnimationPlan } from "../types.js";
import type { CandidateManifestEntry, CandidateSetManifest } from "../planner/candidate-set.js";
import { diffSemanticPlans, serializeSemanticDiff } from "../planner/semantic-diff.js";
import { validateAnimationPlan } from "../planner/validatePlan.js";
import { createLocalSvgRun, RUN_IDENTITY } from "./run-artifacts.js";

export const COMPARISON_SCHEMA_VERSION = "local-svg-comparison.v1";
export const REVIEW_SCHEMA_VERSION = "local-svg-comparison-review.v1";
const DIMENSIONS = ["stateLegibility", "restraint", "temporalCoherence", "epistemicLegibility", "rigStability", "smallTileReadability", "prototypeIdentity", "repeatability"] as const;
const CHECKS = ["listeningDistinctFromIdle", "thinkingDistinctFromUncertainty", "agreementIsRestrained", "qualifiedAnswerIsNotOverCertain", "deferralToDavidIsClear", "noUnplannedGesture", "noDroppedRequiredEvent", "endsNeutral", "replayStartsNeutral", "offlineAiDelegateIdentityIsExplicit", "disclosureRemainsReadable"] as const;
const LAYERS = ["planner", "runtime", "rig", "renderer", "capture"] as const;
const EVIDENCE_KEYS = ["candidateSetManifest", "prompt", "scenario", "leftPlan", "rightPlan", "leftAttempt", "rightAttempt", "rigProfile", "leftRenderScript", "rightRenderScript", "semanticDiff"] as const;
const DIMENSION_GUIDES: Record<typeof DIMENSIONS[number], [string, string, string, string, string]> = {
  stateLegibility: ["State legibility", "Can you distinguish the intended states from pose, gaze, and expression?", "States are unclear or confused.", "States are partly clear or occasionally ambiguous.", "Every intended state reads immediately and distinctly."],
  restraint: ["Restraint", "Are motion and expression professional, subtle, and free of exaggeration?", "Motion is distracting or overplayed.", "Mostly restrained with some excess or flatness.", "Consistently subtle and appropriately expressive."],
  temporalCoherence: ["Temporal coherence", "Do transitions, gestures, and speech posture occur in a natural sequence and at useful times?", "Timing feels broken or contradictory.", "Timing is adequate with some awkward moments.", "Timing and transitions feel purposeful and coherent."],
  epistemicLegibility: ["Epistemic legibility", "Are uncertainty, qualification, and deferral visibly distinct from certainty?", "The avatar implies inappropriate certainty.", "Qualification is present but uneven or subtle.", "Knowledge limits and deferral are unmistakable."],
  rigStability: ["Rig stability and reset", "Does the rig remain stable and return fully to neutral at the end and on replay?", "Visible instability or failed reset.", "Generally stable with a minor reset concern.", "Stable throughout with clean end and replay resets."],
  smallTileReadability: ["Small-tile readability", "Can the important state and disclosure cues be read at the displayed small size?", "Key cues disappear at small size.", "Most cues read, but some are too subtle.", "Key cues remain clear at small size."],
  prototypeIdentity: ["Disclosed prototype identity", "Does the avatar remain clearly identified as an offline AI-delegate prototype?", "Identity is missing, misleading, or unreadable.", "Identity is present but not consistently prominent.", "Identity is explicit, prominent, and continuously readable."],
  repeatability: ["Repeatability", "Does repeated playback produce the same motion, timing, and neutral reset?", "Replays visibly diverge or fail.", "Mostly repeatable with a minor inconsistency.", "Replays are visibly identical and deterministic."]
};
const CHECK_LABELS: Record<typeof CHECKS[number], string> = {
  listeningDistinctFromIdle: "Listening is distinct from idle", thinkingDistinctFromUncertainty: "Thinking is distinct from uncertainty", agreementIsRestrained: "Any agreement is restrained; no inappropriate agreement appears if absent", qualifiedAnswerIsNotOverCertain: "Qualified answer does not appear over-certain", deferralToDavidIsClear: "Deferral to David is clear", noUnplannedGesture: "No unplanned gesture appears", noDroppedRequiredEvent: "No required event is dropped", endsNeutral: "Playback ends neutral", replayStartsNeutral: "Replay starts neutral", offlineAiDelegateIdentityIsExplicit: "Offline AI-delegate identity is explicit", disclosureRemainsReadable: "Disclosure remains readable"
};
type Side = "left" | "right";

export interface ComparisonInput {
  candidateSetDirectory: string;
  candidateIds: [string, string];
  rigProfileSource: string | Buffer;
  outputRoot: string;
  comparisonId?: string;
  createdAt?: string;
  reviewNotesTemplate?: string;
}
export interface ReviewObservation { timestamp: string; observation: string; layer: typeof LAYERS[number]; proposedChange: string; evidence: string; }
export interface ComparisonReviewRecord {
  schemaVersion: typeof REVIEW_SCHEMA_VERSION; comparisonId: string; reviewStatus: "pending" | "completed";
  reviewer: string | null; reviewedAt: string | null; preference: "left" | "right" | "tie" | "no-preference" | null; rationale: string | null;
  candidateIds: { left: string; right: string };
  evidence: Record<string, string>;
  rubric: Record<Side, Record<typeof DIMENSIONS[number], { score: number | null; notes: string | null }>>;
  requiredChecks: Record<typeof CHECKS[number], { value: boolean | null; notes: string | null }>;
  observations: ReviewObservation[];
}
export interface ComparisonResult { comparisonId: string; comparisonDirectory: string; manifest: Record<string, unknown>; }

export function createLocalSvgComparison(input: ComparisonInput): ComparisonResult {
  const [leftId, rightId] = input.candidateIds;
  if (leftId === rightId) throw new Error("Comparison requires two distinct candidate IDs");
  const setDir = resolve(input.candidateSetDirectory);
  const setManifestBytes = readFileSync(resolve(setDir, "manifest.json"));
  const setManifest = JSON.parse(setManifestBytes.toString("utf8")) as CandidateSetManifest;
  if (setManifest.schemaVersion !== "planner-candidate-set.v1") throw new Error("Unsupported candidate-set manifest");
  const leftEntry = successful(setManifest, leftId), rightEntry = successful(setManifest, rightId);
  const promptBytes = verifiedArtifact(setDir, setManifest, setManifest.promptPath);
  const scenarioBytes = verifiedArtifact(setDir, setManifest, setManifest.scenarioPath);
  const leftProvenance = verifiedArtifact(setDir, setManifest, leftEntry.provenancePath, leftEntry.provenanceSha256);
  const rightProvenance = verifiedArtifact(setDir, setManifest, rightEntry.provenancePath, rightEntry.provenanceSha256);
  const leftPlanBytes = verifiedArtifact(setDir, setManifest, leftEntry.planPath!, leftEntry.planSha256);
  const rightPlanBytes = verifiedArtifact(setDir, setManifest, rightEntry.planPath!, rightEntry.planSha256);
  const leftPlan = validatedPlan(leftPlanBytes, leftId), rightPlan = validatedPlan(rightPlanBytes, rightId);
  const rigBytes = Buffer.isBuffer(input.rigProfileSource) ? input.rigProfileSource : Buffer.from(input.rigProfileSource);
  const createdAt = input.createdAt ?? new Date().toISOString();
  if (!Number.isFinite(Date.parse(createdAt))) throw new Error("createdAt must be an ISO-compatible timestamp");
  const comparisonId = input.comparisonId ?? `${createdAt.replace(/[-:]/g, "")}-${sha(Buffer.concat([setManifestBytes, Buffer.from(leftId + "\0" + rightId), rigBytes])).slice(0, 12)}`;
  assertSafeId(comparisonId);
  mkdirSync(resolve(input.outputRoot), { recursive: true });
  const directory = resolve(input.outputRoot, comparisonId);
  mkdirSync(directory, { recursive: false });
  mkdirSync(resolve(directory, "renders"));
  mkdirSync(resolve(directory, "sources"));
  let manifest: Record<string, unknown> = { schemaVersion: COMPARISON_SCHEMA_VERSION, comparisonId, createdAt, status: "incomplete", identity: RUN_IDENTITY, offline: true, renderer: "local_svg" };
  write(directory, "manifest.json", pretty(manifest));
  try {
    const sources = {
      candidateSetManifest: sourceBinding(directory, "sources/candidate-set-manifest.json", setManifestBytes),
      prompt: sourceBinding(directory, "sources/prompt.txt", promptBytes),
      scenario: sourceBinding(directory, "sources/scenario.json", scenarioBytes),
      leftPlan: sourceBinding(directory, "sources/left-plan.json", leftPlanBytes),
      rightPlan: sourceBinding(directory, "sources/right-plan.json", rightPlanBytes),
      leftAttempt: sourceBinding(directory, "sources/left-attempt.json", leftProvenance),
      rightAttempt: sourceBinding(directory, "sources/right-attempt.json", rightProvenance),
      rigProfile: sourceBinding(directory, "sources/rig-profile.json", rigBytes)
    };
    const notes = input.reviewNotesTemplate ?? "# Comparison nested render\n\nReview in ../../comparison.html and export review-record.json.\n";
    const runs = {} as Record<Side, ReturnType<typeof createLocalSvgRun>>;
    for (const [side, entry] of [["left", leftEntry], ["right", rightEntry]] as const) {
      const planSource = (side === "left" ? leftPlanBytes : rightPlanBytes).toString("utf8");
      runs[side] = createLocalSvgRun({ outputRoot: resolve(directory, "renders"), runId: side, createdAt, planSource, rigProfileSource: rigBytes.toString("utf8"), reviewNotesTemplate: notes });
      if (runs[side].status !== "finalized" || runs[side].outcome !== "completed") { const nested = JSON.parse(readFileSync(resolve(runs[side].runDirectory, "manifest.json"), "utf8")); throw new Error(`${side} nested render did not finalize successfully${typeof nested.failure === "string" ? `: ${nested.failure}` : ""}`); }
    }
    const diff = serializeSemanticDiff(diffSemanticPlans(leftPlan, rightPlan, { left: leftId, right: rightId }));
    write(directory, "semantic-diff.json", diff.json); write(directory, "semantic-diff.md", diff.markdown);
    const evidence = {
      candidateSetManifest: sha(setManifestBytes), prompt: sha(promptBytes), scenario: sha(scenarioBytes),
      leftPlan: leftEntry.planSha256!, rightPlan: rightEntry.planSha256!, leftAttempt: sha(leftProvenance), rightAttempt: sha(rightProvenance), rigProfile: sha(rigBytes),
      leftRenderScript: artifact(directory, "renders/left", "render-script.jsonl"), rightRenderScript: artifact(directory, "renders/right", "render-script.jsonl"), semanticDiff: sha(diff.json)
    };
    const review = makeReviewRecord(comparisonId, leftId, rightId, evidence);
    write(directory, "review-record.json", pretty(review));
    const html = comparisonHtml(leftPlan, rightPlan, leftEntry, rightEntry, readFileSync(resolve(directory, "renders/left/player.html"), "utf8"), readFileSync(resolve(directory, "renders/right/player.html"), "utf8"), diff.markdown, review);
    write(directory, "comparison.html", html);
    const bindings = {
      ...sources,
      semanticDiffJson: binding("semantic-diff.json", diff.json), semanticDiffMarkdown: binding("semantic-diff.md", diff.markdown), comparisonHtml: binding("comparison.html", html), reviewTemplate: binding("review-record.json", pretty(review)),
      left: runBindings(directory, "left", leftEntry, leftProvenance, evidence.rigProfile), right: runBindings(directory, "right", rightEntry, rightProvenance, evidence.rigProfile)
    };
    const leftRun = bindings.left, rightRun = bindings.right;
    manifest = {
      ...manifest, status: "finalized", setId: setManifest.setId, scenarioId: setManifest.scenarioId, promptIdentity: setManifest.promptIdentity,
      candidates: { left: candidateIdentity(leftEntry), right: candidateIdentity(rightEntry) }, bindings,
      nestedRuns: { left: leftRun.runManifest.path, right: rightRun.runManifest.path }, resetEvidence: { left: leftRun.resetEvidence, right: rightRun.resetEvidence }, releaseEvidence: { left: leftRun.releaseEvidence, right: rightRun.releaseEvidence }
    };
    write(directory, "manifest.json", pretty(manifest));
    return { comparisonId, comparisonDirectory: directory, manifest };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    manifest = { ...manifest, status: "incomplete", failure: message };
    try { write(directory, "manifest.json", pretty(manifest)); } catch { /* preserve initial evidence */ }
    throw new Error(`Comparison ${comparisonId} retained incomplete at ${directory}: ${message}`);
  }
}

export function assertCompletedComparisonReview(value: unknown, expected?: { comparisonId: string; leftCandidateId: string; rightCandidateId: string; evidence?: Record<string, string> }): asserts value is ComparisonReviewRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Review must be an object");
  const v = value as ComparisonReviewRecord;
  if (v.schemaVersion !== REVIEW_SCHEMA_VERSION || v.reviewStatus !== "completed") throw new Error("Review must be a completed local-svg-comparison-review.v1 record");
  if (expected && (v.comparisonId !== expected.comparisonId || v.candidateIds?.left !== expected.leftCandidateId || v.candidateIds?.right !== expected.rightCandidateId)) throw new Error("Review comparison or candidate IDs do not match expected evidence");
  if (!v.candidateIds?.left || !v.candidateIds?.right || v.candidateIds.left === v.candidateIds.right) throw new Error("Review candidate IDs must be distinct");
  if (!v.evidence || typeof v.evidence !== "object" || Array.isArray(v.evidence) || Object.keys(v.evidence).sort().join() !== [...EVIDENCE_KEYS].sort().join()) throw new Error("Review evidence must contain the exact required bindings");
  for (const key of EVIDENCE_KEYS) if (!/^[0-9a-f]{64}$/.test(v.evidence[key] ?? "")) throw new Error(`Review evidence ${key} must be a SHA-256`);
  if (expected?.evidence && EVIDENCE_KEYS.some(key => v.evidence[key] !== expected.evidence![key])) throw new Error("Review evidence does not match expected bindings");
  if (!v.reviewer?.trim() || !v.reviewedAt || !Number.isFinite(Date.parse(v.reviewedAt)) || !v.preference || !["left", "right", "tie", "no-preference"].includes(v.preference) || !v.rationale?.trim()) throw new Error("Completed review requires reviewer, reviewedAt, preference, and rationale");
  if (!v.rubric || exactKeys(v.rubric, ["left", "right"]) === false) throw new Error("Review rubric must contain exact side keys");
  for (const side of ["left", "right"] as const) { if (!v.rubric[side] || !exactKeys(v.rubric[side], DIMENSIONS)) throw new Error(`Review rubric ${side} must contain exact dimension keys`); for (const dimension of DIMENSIONS) { const item = v.rubric[side][dimension]; if (!item || typeof item !== "object" || Array.isArray(item) || !Number.isInteger(item.score) || item.score! < 1 || item.score! > 5 || (item.notes !== null && typeof item.notes !== "string")) throw new Error(`Review score ${side}.${dimension} must be 1-5 with string or null notes`); } }
  if (!v.requiredChecks || !exactKeys(v.requiredChecks, CHECKS)) throw new Error("Required checks must contain exact keys");
  for (const check of CHECKS) if (typeof v.requiredChecks[check].value !== "boolean" || (v.requiredChecks[check].notes !== null && typeof v.requiredChecks[check].notes !== "string")) throw new Error(`Required check ${check} is incomplete or has invalid notes`);
  if (!Array.isArray(v.observations) || v.observations.length > 5) throw new Error("Review may contain at most five observations");
  for (const observation of v.observations) if (!observation || typeof observation !== "object" || Array.isArray(observation) || !LAYERS.includes(observation.layer) || typeof observation.timestamp !== "string" || !observation.timestamp.trim() || typeof observation.observation !== "string" || !observation.observation.trim() || typeof observation.proposedChange !== "string" || !observation.proposedChange.trim() || typeof observation.evidence !== "string" || !observation.evidence.trim()) throw new Error("Review observation is incomplete or has an invalid layer");
}

function makeReviewRecord(comparisonId: string, left: string, right: string, evidence: Record<string, string>): ComparisonReviewRecord {
  const scores = () => Object.fromEntries(DIMENSIONS.map(name => [name, { score: null, notes: null }])) as ComparisonReviewRecord["rubric"][Side];
  return { schemaVersion: REVIEW_SCHEMA_VERSION, comparisonId, reviewStatus: "pending", reviewer: null, reviewedAt: null, preference: null, rationale: null, candidateIds: { left, right }, evidence, rubric: { left: scores(), right: scores() }, requiredChecks: Object.fromEntries(CHECKS.map(name => [name, { value: null, notes: null }])) as ComparisonReviewRecord["requiredChecks"], observations: [] };
}

function comparisonHtml(leftPlan: AnimationPlan, rightPlan: AnimationPlan, left: CandidateManifestEntry, right: CandidateManifestEntry, leftPlayer: string, rightPlayer: string, diff: string, review: ComparisonReviewRecord): string {
  const safeReview = JSON.stringify(review).replace(/[<>&]/g, c => ({ "<": "\\u003c", ">": "\\u003e", "&": "\\u0026" }[c]!));
  const safeUi = JSON.stringify({ dimensions: DIMENSION_GUIDES, checks: CHECK_LABELS }).replace(/[<>&]/g, c => ({ "<": "\\u003c", ">": "\\u003e", "&": "\\u0026" }[c]!));
  const card = (side: Side, plan: AnimationPlan, entry: CandidateManifestEntry, player: string) => `<article class="candidate" data-side="${side}"><h2>${side === "left" ? "Left" : "Right"}: ${escape(entry.candidateId)}</h2><p class="metadata">${escape(entry.provider ?? "unknown provider")} / ${escape(entry.model ?? "unknown model")} · ${escape(plan.title)}</p><div class="summary"><h3>Plan summary</h3>${planSummary(plan)}</div><iframe data-player="${side}" title="${side} candidate player" sandbox="allow-scripts" srcdoc="${escape(player)}"></iframe></article>`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; frame-src 'self'; connect-src 'none'; img-src data:; font-src 'none'; media-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'"><title>Offline AI delegate candidate comparison</title><style>*{box-sizing:border-box}:root{color-scheme:dark;font-family:system-ui;background:#090d18;color:#eef2ff}body{margin:0;padding:16px}header,.controls,section,main{max-width:1100px;margin:0 auto 16px}.disclosure,.orientation{background:#17213b;border:2px solid #7dd3fc;padding:12px;border-radius:10px}.disclosure{font-weight:700}.controls{display:flex;flex-wrap:wrap;gap:8px}.candidate-grid{display:grid;grid-template-columns:repeat(2,minmax(320px,1fr));gap:16px}.candidate{min-width:0;background:#11182a;padding:12px;border-radius:12px}.summary{min-height:11rem}.summary ul{padding-left:20px}iframe{border:0;width:100%;aspect-ratio:1/1.12;background:#0b1020}button,input,select,textarea{font:inherit}button{padding:8px 14px}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#11182a;padding:12px}.rubric-item{border:1px solid #334155;padding:10px;margin:10px 0}.rubric-fields{display:grid;grid-template-columns:90px 1fr;gap:8px}.anchors{font-size:.9rem;color:#cbd5e1}.check-grid{display:grid;grid-template-columns:minmax(180px,1fr) 100px minmax(180px,2fr);gap:8px;align-items:center}.observations{display:grid;gap:10px}.observation-row{display:grid;grid-template-columns:110px 1.5fr 120px 1.5fr 1.5fr;gap:6px}.field{display:grid;gap:4px;margin:8px 0}.review input,.review select,.review textarea{width:100%;min-width:0}.error{color:#fecaca;background:#7f1d1d;padding:10px;border-radius:6px}.error:empty{display:none}@media(max-width:680px){.candidate-grid{grid-template-columns:1fr}.rubric-fields,.check-grid,.observation-row{grid-template-columns:1fr}.summary{min-height:0}}</style></head><body><header><h1>Planner candidate comparison</h1><p class="disclosure">Offline stylised AI-delegate prototype — not David personally attending, speaking, agreeing, or committing.</p></header><section class="orientation"><h2>Before you review</h2><p><strong>No audio is expected in this milestone.</strong> Speech events only time the speaking and mouth posture. Compare motion, state legibility, restraint, timing, deferral, disclosure, and reset.</p><p>Equal scores plus <strong>no preference</strong> are valid when candidates look equivalent.</p><h3>What differs</h3><p>${pairSummary(leftPlan, rightPlan)}</p></section><nav class="controls" aria-label="Synchronized playback"><button type="button" class="sync-control" id="start" disabled>Start together</button><button type="button" class="sync-control" id="pause" disabled>Pause both</button><button type="button" class="sync-control" id="resume" disabled>Resume both</button><button type="button" class="sync-control" id="restart" disabled>Restart together</button></nav><main class="candidate-grid">${card("left", leftPlan, left, leftPlayer)}${card("right", rightPlan, right, rightPlayer)}</main><section><h2>Semantic diff context</h2><pre>${escape(diff)}</pre></section><section class="review"><h2>Human review</h2><p>No score or preference is inferred. Complete every required field before export.</p><label class="field">Reviewer<input id="reviewer"></label><label class="field">Preference<select id="preference"><option value="">Select…</option><option value="left">Left</option><option value="right">Right</option><option value="tie">Tie</option><option value="no-preference">No preference</option></select></label><label class="field">Rationale<textarea id="rationale" placeholder="Explain the evidence for your preference or no preference"></textarea></label><div id="rubric"></div><button type="button" id="copy-scores">Copy left scores to right</button><div id="checks"><h3>Required checks</h3><p>These are pair-level stop, safety, and lifecycle checks—not preference differences. Answer for the pair as a whole.</p></div><h3>Optional observations (up to five)</h3><div id="observations" class="observations"></div><p id="review-error" class="error" role="alert" aria-live="assertive"></p><button type="button" id="download">Download completed review JSON</button></section><script id="review-data" type="application/json">${safeReview}</script><script id="ui-data" type="application/json">${safeUi}</script><script>'use strict';const template=JSON.parse(document.getElementById('review-data').textContent),ui=JSON.parse(document.getElementById('ui-data').textContent),frames=[...document.querySelectorAll('iframe')],buttons=[...document.querySelectorAll('.sync-control')],startButton=document.getElementById('start'),pauseButton=document.getElementById('pause'),resumeButton=document.getElementById('resume'),restartButton=document.getElementById('restart'),preferenceInput=document.getElementById('preference'),downloadButton=document.getElementById('download');window.addEventListener('load',()=>{for(const button of buttons)button.disabled=false},{once:true});const send=(command,timed=false)=>{const message={protocol:'local-svg-player-control.v1',command};if(timed)message.startAtEpochMs=Date.now()+3000;for(const frame of frames)frame.contentWindow.postMessage(message,'*')};startButton.onclick=()=>send('start',true);restartButton.onclick=()=>send('restart',true);pauseButton.onclick=()=>send('pause');resumeButton.onclick=()=>send('resume');const rubric=document.getElementById('rubric');for(const side of ['left','right']){rubric.insertAdjacentHTML('beforeend','<h3>'+side+' candidate rubric (1–5)</h3>');for(const name of Object.keys(template.rubric[side])){const guide=ui.dimensions[name],item=document.createElement('fieldset');item.className='rubric-item';const legend=document.createElement('legend');legend.textContent=guide[0];const description=document.createElement('p');description.id=side+'-'+name+'-guide';description.textContent=guide[1];const anchors=document.createElement('p');anchors.className='anchors';anchors.textContent='1 — '+guide[2]+'  3 — '+guide[3]+'  5 — '+guide[4];const fields=document.createElement('div');fields.className='rubric-fields';const score=document.createElement('input');score.type='number';score.min='1';score.max='5';score.dataset.side=side;score.dataset.dimension=name;score.className='rubric-score';score.setAttribute('aria-label',side+' '+guide[0]+' score');score.setAttribute('aria-describedby',description.id);const notes=document.createElement('textarea');notes.placeholder='Optional notes for '+guide[0].toLowerCase();notes.dataset.side=side;notes.dataset.dimension=name;notes.className='rubric-notes';notes.setAttribute('aria-label',side+' '+guide[0]+' notes');fields.append(score,notes);item.append(legend,description,anchors,fields);rubric.append(item)}}document.getElementById('copy-scores').onclick=()=>{for(const left of document.querySelectorAll('.rubric-score[data-side="left"]')){const right=document.querySelector('.rubric-score[data-side="right"][data-dimension="'+left.dataset.dimension+'"]');right.value=left.value}};const checks=document.getElementById('checks'),checkGrid=document.createElement('div');checkGrid.className='check-grid';for(const name of Object.keys(template.requiredChecks)){const label=document.createElement('label');label.textContent=ui.checks[name];const select=document.createElement('select');select.dataset.check=name;select.className='check-value';select.setAttribute('aria-label',ui.checks[name]+' yes or no');for(const [value,text] of [['','Select…'],['yes','Yes'],['no','No']])select.add(new Option(text,value));const notes=document.createElement('textarea');notes.placeholder='Optional check notes';notes.dataset.check=name;notes.className='check-notes';notes.setAttribute('aria-label',ui.checks[name]+' notes');checkGrid.append(label,select,notes)}checks.append(checkGrid);const observations=document.getElementById('observations'),layers=['planner','runtime','rig','renderer','capture'];for(let i=0;i<5;i++){const row=document.createElement('div');row.className='observation-row';row.dataset.observationRow=String(i+1);for(const [field,label] of [['timestamp','Timestamp'],['observation','Observation'],['layer','Layer'],['proposedChange','Proposed change'],['evidence','Evidence']]){let control;if(field==='layer'){control=document.createElement('select');control.add(new Option('Select…',''));for(const layer of layers)control.add(new Option(layer,layer))}else control=document.createElement(field==='observation'||field==='proposedChange'||field==='evidence'?'textarea':'input');control.dataset.field=field;control.placeholder=label;control.setAttribute('aria-label','Observation '+(i+1)+' '+label);row.append(control)}observations.append(row)}const text=id=>document.getElementById(id).value.trim(),error=document.getElementById('review-error');downloadButton.onclick=()=>{const record=structuredClone(template);record.reviewer=text('reviewer')||null;record.preference=preferenceInput.value||null;record.rationale=text('rationale')||null;for(const input of document.querySelectorAll('.rubric-score'))record.rubric[input.dataset.side][input.dataset.dimension].score=input.value===''?null:Number(input.value);for(const notes of document.querySelectorAll('.rubric-notes'))record.rubric[notes.dataset.side][notes.dataset.dimension].notes=notes.value.trim()||null;for(const select of document.querySelectorAll('.check-value'))record.requiredChecks[select.dataset.check].value=select.value===''?null:select.value==='yes';for(const notes of document.querySelectorAll('.check-notes'))record.requiredChecks[notes.dataset.check].notes=notes.value.trim()||null;record.observations=[];let partial=false,invalidLayer=false;for(const row of document.querySelectorAll('[data-observation-row]')){const item={};for(const control of row.querySelectorAll('[data-field]'))item[control.dataset.field]=control.value.trim();const used=Object.values(item).filter(Boolean).length;if(used===5){record.observations.push(item);if(!layers.includes(item.layer))invalidLayer=true}else if(used)partial=true}const scores=Object.values(record.rubric).flatMap(Object.values).map(x=>x.score),checksDone=Object.values(record.requiredChecks).every(x=>typeof x.value==='boolean');if(!record.reviewer||!record.preference||!record.rationale||scores.length!==16||scores.some(x=>!Number.isInteger(x)||x<1||x>5)||!checksDone||partial||invalidLayer){error.textContent=partial?'Each used observation row must be complete.':invalidLayer?'Each observation layer must be one of planner, runtime, rig, renderer, or capture.':'Complete reviewer, preference, rationale, all 16 scores (1–5), and all 11 yes/no checks.';record.reviewStatus='pending';return}record.reviewStatus='completed';record.reviewedAt=new Date().toISOString();error.textContent='';const blob=new Blob([JSON.stringify(record,null,2)+'\\n'],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='${escapeJs(review.comparisonId)}-review.json';a.click();URL.revokeObjectURL(a.href)};</script></body></html>\n`;
}

function planSummary(plan: AnimationPlan): string {
  const states = plan.tracks.states.map(x => `${x.state} ${formatTime(x.startMs)}–${formatTime(x.startMs + x.durationMs)} (${formatTime(x.durationMs)}, intensity ${x.intensity ?? "default"})`).join(" → ");
  const gestures = plan.tracks.gestures.map(x => `${x.gesture} at ${formatTime(x.startMs)} (${formatTime(x.durationMs)})`).join(" → ") || "none";
  const speech = (plan.tracks.speech ?? []).map(x => `${x.speechAct} at ${formatTime(x.startMs)}${x.durationMs === undefined ? "" : ` for ${formatTime(x.durationMs)}`}`).join("; ") || "none";
  return `<ul><li><strong>States:</strong> ${escape(states)}</li><li><strong>Gestures:</strong> ${escape(gestures)}</li><li><strong>Speech acts:</strong> ${escape(speech)}</li></ul>`;
}
function pairSummary(left: AnimationPlan, right: AnimationPlan): string {
  const vocabulary = (items: string[]) => [...new Set(items)].sort().join("|");
  const ls = left.tracks.states.map(x => x.state), rs = right.tracks.states.map(x => x.state), lg = left.tracks.gestures.map(x => x.gesture), rg = right.tracks.gestures.map(x => x.gesture);
  const clauses = [`State vocabulary is ${vocabulary(ls) === vocabulary(rs) ? "the same" : "different"} and state order is ${ls.join("|") === rs.join("|") ? "the same" : "different"}.`, `Gesture vocabulary is ${vocabulary(lg) === vocabulary(rg) ? "the same" : "different"} and gesture sequence is ${lg.join("|") === rg.join("|") ? "the same" : "different"}.`];
  const timingDiff = left.tracks.states.some((x, i) => x.startMs !== right.tracks.states[i]?.startMs || x.durationMs !== right.tracks.states[i]?.durationMs) || left.tracks.gestures.some((x, i) => x.startMs !== right.tracks.gestures[i]?.startMs || x.durationMs !== right.tracks.gestures[i]?.durationMs) || (left.tracks.speech ?? []).some((x, i) => x.startMs !== right.tracks.speech?.[i]?.startMs || x.durationMs !== right.tracks.speech?.[i]?.durationMs);
  const intensityDiff = left.tracks.states.some((x, i) => x.intensity !== right.tracks.states[i]?.intensity) || left.tracks.gestures.some((x, i) => x.intensity !== right.tracks.gestures[i]?.intensity);
  if (timingDiff || intensityDiff) clauses.push(`Differences are ${timingDiff && intensityDiff ? "primarily timing and intensity" : timingDiff ? "primarily timing" : "primarily intensity"}; use the summaries below to compare exact starts, durations, and levels.`);
  return escape(clauses.join(" "));
}
function formatTime(ms: number): string { return `${Number((ms / 1000).toFixed(2))}s`; }

function successful(manifest: CandidateSetManifest, id: string): CandidateManifestEntry { const entry = manifest.candidates.find(value => value.candidateId === id); if (!entry) throw new Error(`Unknown candidate ID ${JSON.stringify(id)}`); if (entry.status !== "succeeded" || !entry.planPath || !entry.planSha256) throw new Error(`Candidate ${JSON.stringify(id)} was not successful`); return entry; }
function verifiedArtifact(root: string, manifest: CandidateSetManifest, path: string, extra?: string): Buffer { const bytes = readFileSync(safePath(root, path)); const digest = sha(bytes); if (manifest.artifactSha256[path] !== digest || (extra !== undefined && extra !== digest)) throw new Error(`Candidate provenance checksum mismatch for ${path}`); return bytes; }
function validatedPlan(bytes: Buffer, label: string): AnimationPlan { const value: unknown = JSON.parse(bytes.toString("utf8")); const result = validateAnimationPlan(value); if (!result.valid) throw new Error(`${label} is not a validated animation plan`); return value as AnimationPlan; }
function safePath(root: string, path: string): string { if (!path || isAbsolute(path)) throw new Error("Candidate artifact path must be relative"); const base = realpathSync(root), lexical = resolve(base, path); if (lexical !== base && !lexical.startsWith(base + sep)) throw new Error("Candidate artifact path escapes candidate-set directory"); const actual = realpathSync(lexical); if (actual !== base && !actual.startsWith(base + sep)) throw new Error("Candidate artifact path escapes candidate-set directory"); return actual; }
function artifact(directory: string, run: string, name: string): string { const manifest = JSON.parse(readFileSync(resolve(directory, run, "manifest.json"), "utf8")); const bytes = readFileSync(resolve(directory, run, name)); const digest = sha(bytes); if (manifest.artifactSha256?.[name] !== digest) throw new Error(`Nested run checksum mismatch for ${run}/${name}`); return digest; }
function runBindings(directory: string, side: Side, entry: CandidateManifestEntry, provenance: Buffer, rigSha256: string) { const base = `renders/${side}`; const manifestBytes = readFileSync(resolve(directory, base, "manifest.json")); const m = JSON.parse(manifestBytes.toString("utf8")); if (m.status !== "finalized" || m.outcome !== "completed" || m.resetEvidence !== true || m.releaseEvidence !== true) throw new Error(`${side} nested run evidence is incomplete`); if (m.sourceSha256?.["plan.json"] !== entry.planSha256 || m.sourceSha256?.["rig-profile.json"] !== rigSha256) throw new Error(`${side} nested run source checksums do not match comparison evidence`); return { candidatePlan: digestBinding(`sources/${side}-plan.json`, entry.planSha256!), attemptProvenance: digestBinding(`sources/${side}-attempt.json`, sha(provenance)), runManifest: binding(`${base}/manifest.json`, manifestBytes), renderScript: digestBinding(`${base}/render-script.jsonl`, artifact(directory, base, "render-script.jsonl")), rendererLog: digestBinding(`${base}/renderer-log.jsonl`, artifact(directory, base, "renderer-log.jsonl")), player: digestBinding(`${base}/player.html`, artifact(directory, base, "player.html")), resetEvidence: m.resetEvidence as boolean, releaseEvidence: m.releaseEvidence as boolean }; }
function candidateIdentity(entry: CandidateManifestEntry): object { return { candidateId: entry.candidateId, ordinal: entry.ordinal, duplicateOf: entry.duplicateOf ?? null, orchestrationId: entry.orchestrationId, provider: entry.provider ?? null, model: entry.model ?? null }; }
function assertSafeId(value: string): void { if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(value)) throw new Error("comparisonId must be a path-safe 1-128 character identifier"); }
function write(directory: string, path: string, value: string): void { writeFileSync(resolve(directory, path), value); }
function sourceBinding(directory: string, path: string, value: Buffer): { path: string; sha256: string } { writeFileSync(resolve(directory, path), value); return binding(path, value); }
function binding(path: string, value: string | Buffer): { path: string; sha256: string } { return { path, sha256: sha(value) }; }
function digestBinding(path: string, sha256: string): { path: string; sha256: string } { if (!/^[0-9a-f]{64}$/.test(sha256)) throw new Error(`Invalid SHA-256 binding for ${path}`); return { path, sha256 }; }
function exactKeys(value: object, expected: readonly string[]): boolean { return Object.keys(value).sort().join("\0") === [...expected].sort().join("\0"); }
function pretty(value: unknown): string { return JSON.stringify(value, null, 2) + "\n"; }
function sha(value: string | Buffer): string { return createHash("sha256").update(value).digest("hex"); }
function escape(value: string): string { return value.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!)); }
function escapeJs(value: string): string { return value.replace(/[\\']/g, "\\$&"); }
