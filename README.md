# AI Delegate Avatar

A project scaffold for building a clearly disclosed, stylised AI delegate whose visible mannerisms are planned by an AI agent and rendered through a controllable avatar runtime.

The immediate experiment is deliberately narrow:

> Turn a semantic animation plan into a short, repeatable local SVG animation that David can review and iterate on without policy-blocked software.

The larger project may later add speech, live meeting context, OBS virtual-camera output, and Microsoft Teams assistance. It is not intended to create a covert deepfake or make other participants believe David is personally present when he is not.

## Core product idea

The LLM controls **communicative intent**, not raw animation curves.

```text
scene brief
  -> semantic state/gesture plan
  -> validation + taste constraints
  -> deterministic mannerism runtime
  -> rig-profile-specific renderer controls
  -> local SVG avatar (Milestone 1)
```

The avatar should make otherwise hidden agent states legible: listening, thinking, qualified confidence, uncertainty, agreement, boundary-setting, and deferral to David.

## Current status

This repository includes a completed Milestone 1 deterministic offline local-SVG review loop. See [`STATUS.md`](STATUS.md) before assigning work and [`HANDOFF_REVIEW.md`](HANDOFF_REVIEW.md) for the comparable replay evidence.

Implemented now:

- root install/build/test workflow;
- Draft 2020-12 animation-plan validation;
- semantic timing and safety diagnostics;
- dry-run timeline output;
- rig-profile validation;
- a discriminated `local_svg`/VTube rig-profile contract;
- a first-party local SVG control profile and semantic-to-rig mapping inspection;
- deterministic renderer-neutral `render-script.v1` JSONL compilation;
- deterministic, self-contained `file://` HTML/SVG player generation;
- restrained local SVG mannerism mapping reviewed at 320px;
- durable completed/cancelled/error/incomplete run artifacts and checksummed logs;
- comparable full-size/320px review and replay with exact neutral reset;
- an archival thin VTube WebSocket protocol client scaffold retained for reference.

Not implemented on the active roadmap yet:

- automatic recording;
- an integrated LLM API call;
- TTS/lip sync;
- OBS/Teams live output.

VTube authentication, hotkey playback, and parameter injection were not implemented. Their Milestone 1 issues were closed as superseded by the completed local SVG path; resuming that integration would require a fresh decision and approved environment.

## Start here

For coding agents, read [`AGENTS.md`](AGENTS.md). For humans, run:

```bash
npm install
npm run check
npm run demo:dry
npm run demo:mapping
npm run --silent demo:render-script > /tmp/render-script.jsonl
npm run demo:player
npm run demo:run
```

`npm run demo:mapping` is inspection only. It opens no WebSocket and sends nothing to VTube Studio.
`demo:player` writes the ignored `runs/local-svg-player.html`; open it directly in a browser. It uses only inline HTML, SVG, CSS, JavaScript, and precomputed frames.
`demo:run` creates an ignored, non-overwriting review bundle with exact inputs, diagnostics, deterministic scripts/logs, a player, and review notes.

## Milestone 1

Milestone 1 proves the renderer/control loop, not the whole meeting-agent system.

1. A human or AI agent writes `animation-plan.v1` JSON from a short scene brief.
2. The controller validates and diagnoses the plan.
3. A fixed-tick playback runtime resolves semantic controls through a `local_svg` rig profile.
4. The renderer generates deterministic frames and durable logs.
5. A self-contained `file://` HTML/SVG player plays a calm 20–45 second sequence at about 320 px with full-duration disclosure.
6. The run saves the plan, renderer log, review notes, and optionally a recording.

Programmatic LLM integration comes after this loop is visually worth iterating. For Milestone 1, using a coding/chat agent to create the plan file is sufficient.

## Avatar dependency

The local SVG controller and any future David-specific artwork are separate workstreams:

- **Milestone 1 runtime track:** use the implemented first-party stylised SVG avatar and versioned `local_svg` profile.
- **Archival alternate-renderer track:** the old Live2D/VTube notes are retained as reference, but are not active work. Any replacement renderer or David-specific asset should receive a fresh scoped decision and profile.

See [`docs/ASSET_PIPELINE.md`](docs/ASSET_PIPELINE.md). This separation prevents the code team from being blocked while the final avatar is prepared.

## Repository map

```text
AGENTS.md                         coding-agent operating instructions
STATUS.md                         implemented vs pending source of truth
HANDOFF_REVIEW.md                 milestone replay evidence plus historical scaffold audit
OBJECTIVE.md                      project intent and larger product boundary
ROADMAP.md                        staged path from offline clip to Teams

docs/
  MILESTONE_1_OFFLINE_RENDER.md   first delivery contract
  ARCHITECTURE.md                 components and data flow
  CONTROL_SCHEMA.md               planner/runtime contract
  ASSET_PIPELINE.md               existing-avatar decomposition and rigging
  RIGGING_SPEC.md                 runtime-facing rig requirements
  LOCAL_SETUP_MACOS.md            Mac/VTube/OBS setup
  REVIEW_RUBRIC.md                visual evaluation criteria
  SAFETY_AND_DISCLOSURE.md        product boundary
  TEAMS_INTEGRATION.md            later virtual-camera/bot paths

schemas/                          JSON Schemas
examples/                         regression fixtures; profile selectors are illustrative until preflight
packages/controller/              tested TypeScript scaffold
prompts/                          implementation, review, and planning prompts
tasks/                            issue-ready implementation breakdown
templates/                        run/review artefact templates
```

## Design principles

1. **Stylised, not deceptive.** The visual language should identify an AI delegate rather than imitate webcam footage.
2. **Intent first.** The planner chooses semantic states; deterministic code owns timing, smoothing, and bounds.
3. **Reviewable by construction.** Every behaviour comes from a durable plan that can be diffed and replayed.
4. **Stillness is allowed.** Professional presence requires restraint, not constant motion.
5. **Renderer-agnostic ontology.** Local SVG is the active adapter; the semantic contract does not preclude a separately approved future renderer.
6. **Truthful status.** A source-file skeleton is not a completed capability; `STATUS.md` and tests govern handoff claims.

## First demo scene

> The delegate listens to a question, thinks, mildly agrees, enters a visibly qualified-answer state, and finally defers the commitment to David.

Milestone 1 may render the answer segment silently with a speech-ready pose. Actual voice and visemes are deliberately deferred.
