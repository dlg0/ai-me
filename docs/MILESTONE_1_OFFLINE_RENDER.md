# Milestone 1 — Offline Reviewable Animation via VTube Studio

## Delivery statement

Build the smallest end-to-end loop that demonstrates the project's novel element:

> A semantic plan produced by a human or AI agent drives a stylised avatar through VTube Studio, and the resulting behaviour can be replayed and reviewed.

An integrated LLM API call is not required for this milestone. A coding/chat agent may generate the JSON plan directly. The milestone ends when the plan can actually animate a loaded model—not when a mapping is merely printed.

## Why this comes first

This isolates the expressive-control problem from Teams, transcription, voice cloning, and production identity. It lets us test whether the mannerism vocabulary is legible and worth developing before adding costly integration layers.

## Prerequisites

- macOS development machine;
- Node.js 22 or later;
- VTube Studio with Plugin API access enabled;
- a loaded Live2D model;
- `animation-plan.v1` JSON;
- a matching `rig-profile.v1` file.

The runtime may use a generic test model. A David-specific rig is a parallel dependency, not a prerequisite for controller development.

## Inputs

### Scene brief

Example:

> Listen, think, mildly agree, present a qualified answer, and visibly defer the commitment to David. Keep the motion restrained.

### Animation plan

Renderer-agnostic semantic events: states, gestures, optional speech intent, and review overlays.

### Rig profile

Mapping from abstract controls such as `head.angle.x` or `defer_to_human` to VTube Studio input parameters and hotkeys.

## Outputs

A completed review run contains:

```text
runs/<run-id>/
├── manifest.json
├── plan.json
├── rig-profile.json
├── renderer-log.jsonl
├── review-notes.md
└── recording.mp4        # manual/optional until capture is automated
```

The log must distinguish planned events, resolved commands, commands actually sent, responses/errors, and final reset/release.

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
```

All commands pass. The mapping command clearly states that it does not drive VTube Studio.

### Plan and rig validation

- malformed JSON fails with a readable file/parse error;
- wrong schema versions and unknown states/gestures fail;
- duplicate IDs, out-of-bounds events, and overlapping high-level states fail;
- lower-severity concerns such as gesture density or missing disclosure produce warnings;
- rig ranges and neutral values are checked;
- plan `targetRig` must match the selected rig profile.

### VTube preflight

- host/port are configurable;
- plugin API disabled/unreachable gives an actionable error;
- token is requested once, persisted locally outside version control, and reused;
- current session authentication is verified;
- a model is loaded;
- configured hotkeys exist or fail preflight;
- configured input parameter IDs exist or fail preflight.

### Playback

- events are scheduled against a monotonic clock;
- configured hotkeys fire at the intended times;
- parameter values ease rather than jump unless explicitly requested;
- controlled parameters are refreshed frequently enough that VTube Studio does not release them during a state;
- cancellation stops future events;
- end-of-plan and error paths force neutral/reset and release control;
- no event is silently dropped.

### Review

- a reviewer can watch a 20–45 second result and inspect the source plan and command log;
- the six target states are distinguishable at Teams-tile size;
- replay is sufficiently deterministic to compare iterations;
- review notes identify at least the top five behavioural or rig changes;
- the run/recording is explicitly labelled as an offline AI-delegate prototype in its manifest, title, or review notes.

The `overlays` track is preserved as capture intent in Milestone 1; the VTube controller is not required to draw it. A persistent in-frame disclosure overlay becomes mandatory when OBS/live output is introduced.

## Implementation sequence

1. Verify the scaffold with `npm run check`.
2. Implement VTube authentication/session persistence and preflight.
3. Resolve hotkey names/IDs and input parameters against the loaded model.
4. Implement clocked hotkey playback.
5. Implement parameter interpolation and repeated injection.
6. Add cancellation, reset, and error-safe release.
7. Add durable run artefacts and JSONL logs.
8. Run against a generic test rig.
9. Run against the David-specific rig when available.
10. Record, review, and revise the vocabulary/mappings.

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
