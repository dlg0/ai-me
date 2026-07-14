# Roadmap

## Phase 0 — Handoff-ready scaffold

Status: complete.

Outputs:

- project objective, architecture, safety boundary, and roadmap;
- tested root development workflow;
- animation-plan and rig-profile schemas;
- semantic diagnostics and dry-run tooling;
- mapping inspection scaffold;
- agent instructions and issue breakdown;
- avatar asset/rigging workstream definition.

Gate:

```bash
npm install
npm run check
```

must pass from a clean checkout.

## Phase 1 — Offline local SVG animation review

Goal:

> A semantic animation plan replays deterministically in a self-contained local HTML/SVG player and produces review artifacts.

Runtime deliverables:

- `local_svg` rig profile;
- deterministic fixed-tick abstract render script;
- dependency-free HTML/SVG player that opens via `file://`;
- restrained rig-profile-driven mappings with easing and neutral reset;
- neutral reset/control release;
- JSONL renderer log and run folder;
- full-duration AI-delegate disclosure and review/replay recipe.

Deferred VTube/asset reference track (not required for Phase 1):

- generic test rig or known-good model for runtime development;
- selected David-associated avatar source;
- layered/reconstructed artwork;
- minimum viable Live2D rig;
- configured hotkeys/inputs and matching rig profile.

Exit criteria:

- one documented command sequence creates and opens a 20–45 second animation at approximately 320 px;
- the abstract avatar visibly expresses the six target states;
- the plan, commands, review notes, and recording can be inspected together;
- repeat playback is materially consistent;
- playback requires no network, external application, or licensed model asset;
- disclosure remains visible for the full duration.

## Phase 2 — Planner iteration loop

Goal:

> An LLM reliably generates valid, tasteful plans from high-level scene briefs.

Deliverables:

- planner prompt contract;
- model-provider adapter kept separate from the renderer;
- JSON extraction/validation/repair loop;
- scenario corpus and regression plans;
- generation of multiple bounded candidates for one brief;
- plan diff and side-by-side review workflow;
- review bundle containing plan, rig version, logs, clip, and rubric;
- an agent-assisted revision step that converts review observations into proposed plan or mapping changes;
- explicit defect attribution to planner, runtime, rig, VTube configuration, or capture.

Exit criteria:

- at least 8 of 10 held-out briefs produce valid plans without hand editing;
- plans respect timing, gesture-density, reset, and disclosure constraints;
- reviewer preference improves over a fixed baseline animation;
- a second iteration can be traced directly to review evidence rather than opaque prompt drift;
- invalid model output fails closed rather than reaching VTube Studio.

## Phase 3 — Speech and lip-sync coordination

Goal:

> Coordinate recorded or generated speech with mouth movement, emphasis, gaze, and body/head gestures.

Deliverables:

- audio asset/reference in run manifests;
- TTS or recorded-speech adapter;
- word/phoneme/viseme timing strategy;
- speech-state conflict checks;
- interruption/cancellation behaviour;
- authorised voice governance if synthetic voice is tested.

Exit criteria:

- speech, visemes, and emphasis remain aligned;
- stopping speech immediately stops mouth motion;
- the avatar never appears to speak while in a listening state;
- audio can be disabled while preserving the animation-review loop.

## Phase 4 — Local live delegate mode

Goal:

> Run the avatar locally as an operator-controlled source suitable for a dummy meeting.

Deliverables:

- event-driven live controller;
- manual state/gesture overrides;
- speech approval gate;
- kill switch and forced neutral state;
- disclosure overlay;
- OBS scene and virtual-camera recipe;
- optional virtual-audio routing.

Exit criteria:

- OBS exposes the delegate scene as a camera source;
- Teams can select it in a test call;
- a local operator can immediately stop speech and motion;
- disclosure remains visible at meeting-tile size.

## Phase 5 — Meeting-aware assistant

Goal:

> Use transcript/meeting context to support bounded live assistance without autonomous impersonation.

Deliverables:

- meeting-state engine;
- rolling summary and action extraction;
- approved-context retrieval;
- response policy and permission layer;
- push-to-speak or explicit approval;
- utterance and source audit logs.

Exit criteria:

- the delegate can summarise and answer bounded factual questions in a controlled test;
- it reliably defers commitments, confidential matters, and insufficient-context questions;
- every utterance is attributable and reviewable.

## Phase 6 — Teams product-path decision

Goal:

> Decide whether the local OBS route is sufficient or a formal Teams app/bot is justified.

Deliverables:

- Teams API/media-bot feasibility spike;
- identity, tenancy, permissions, and governance assessment;
- infrastructure/operations estimate;
- security/privacy review;
- explicit go/no-go decision.

A formal Teams bot is not an assumed destination. It is an option to justify after the avatar and meeting behaviour have demonstrated value.
