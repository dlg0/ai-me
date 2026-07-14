# Milestone 1 — Offline Reviewable Animation via Local SVG

## Delivery statement

Build the smallest end-to-end loop that demonstrates the project's novel element:

> A semantic plan produced by a human or AI agent drives a stylised avatar in a self-contained local HTML/SVG player, and the resulting behaviour can be replayed and reviewed.

An integrated LLM API call is not required. The milestone ends when a 20–45 second result is reviewable at approximately 320 px—not when a mapping is merely printed. The SVG player generator and functional Chrome check are complete; taste tuning and the milestone review/replay remain pending.

## Why this comes first

This isolates the expressive-control problem from Teams, transcription, voice cloning, and production identity. It lets us test whether the mannerism vocabulary is legible and worth developing before adding costly integration layers.

## Prerequisites

- macOS development machine;
- Node.js 22 or later;
- `animation-plan.v1` JSON;
- a matching `local_svg` `rig-profile.v1` file.

The path must require no network, external application, or licensed model asset. VTube/Live2D is a deferred optional adapter (ADR 0005), not a prerequisite.

## Inputs

### Scene brief

Example:

> Listen, think, mildly agree, present a qualified answer, and visibly defer the commitment to David. Keep the motion restrained.

### Animation plan

Renderer-agnostic semantic events: states, gestures, optional speech intent, and review overlays.

### Rig profile

Mapping from abstract controls such as `head.angle.x` or `defer_to_human` to local SVG adapter controls. Renderer IDs do not enter the semantic plan.

## Outputs

A completed review run contains:

```text
runs/<run-id>/
├── manifest.json
├── plan.json
├── rig-profile.json
├── renderer-log.jsonl
├── review-notes.md
└── player.html          # self-contained file:// review player
```

The log must distinguish planned events, fixed-tick resolved controls, rendered state/errors, and final reset. The player displays AI-delegate disclosure for its full duration.

## Target scene

The first reference scene should visibly show:

1. attentive listening;
2. thoughtful processing;
3. mild agreement;
4. uncertainty/caveat;
5. a qualified-answer segment;
6. defer-to-David / authority boundary;
7. neutral reset.

### Speech clarification

Milestone 1 does not include TTS or lip sync. The `speech` track records intent and timing for future coordination. The first clip may use a silent speech-ready pose or minimal placeholder mouth motion if the rig already supports it. Review should focus on state transitions, gaze, head/body mannerisms, and boundary legibility.

## Acceptance criteria

### Repository checks

From a clean checkout:

```bash
npm install
npm run check
npm run demo:dry
npm run demo:mapping
npm run --silent demo:render-script > /tmp/render-script.jsonl
npm run demo:player
```

All commands pass. The mapping command clearly states that it does not drive VTube Studio.
The player command writes the ignored `runs/local-svg-player.html`, which opens directly through `file://` without external resources.

### Plan and rig validation

- malformed JSON fails with a readable file/parse error;
- wrong schema versions and unknown states/gestures fail;
- duplicate IDs, out-of-bounds events, and overlapping high-level states fail;
- lower-severity concerns such as gesture density or missing disclosure produce warnings;
- rig ranges and neutral values are checked;
- plan `targetRig` must match the selected rig profile.

### Playback

- the render script samples a documented fixed tick deterministically;
- configured SVG controls resolve through the rig profile;
- parameter values ease rather than jump unless explicitly requested;
- cancellation stops future events;
- end-of-plan and error paths force neutral/reset;
- no event is silently dropped.

### Review

- a reviewer can watch a 20–45 second result and inspect the source plan and command log;
- the six target states are distinguishable at approximately 320 px;
- replay is sufficiently deterministic to compare iterations;
- review notes identify at least the top five behavioural or rig changes;
- the run/recording is explicitly labelled as an offline AI-delegate prototype in its manifest, title, or review notes.

The local player renders a full-duration AI-delegate disclosure from review metadata. It remains visible throughout playback.

## Implementation sequence

1. Verify the scaffold with `npm run check`.
2. Add and validate a `local_svg` rig profile.
3. Implement a deterministic fixed-tick abstract render script.
4. Generate a dependency-free, self-contained `file://` HTML/SVG player.
5. Add restrained mappings, easing, cancellation, and neutral reset.
6. Add durable run artifacts and JSONL logs.
7. Review/replay the 20–45 second reference scene at approximately 320 px.
8. Revise the vocabulary and mappings from recorded review evidence.

## Deferred optional VTube adapter

The existing VTube scaffold and detailed setup/asset documents remain reference material. Do not install around organizational policy or claim VTube evidence. Resume only under ADR 0005's approval and usability criteria.

## Non-goals

- autonomous Teams attendance;
- meeting transcript ingestion;
- synthetic voice;
- production lip sync;
- photorealistic rendering;
- custom webcam/video driver;
- full planner-provider integration;
- polished UI.

## Taste bar

The animation should look calm, intentional, and professionally restrained. Constant movement is a defect. A useful delegate should be able to remain still, indicate uncertainty without melodrama, and make deferral unmistakable without becoming theatrical.
