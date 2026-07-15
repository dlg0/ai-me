# Technology Choices

## Milestone 1 renderer — first-party local SVG

A deterministic fixed-tick script generates a self-contained HTML/SVG player opened via `file://`. It requires no network, external app, or licensed model asset and renders full-duration disclosure. This completed path is accepted by ADR 0005.

The semantic plan remains renderer-agnostic; a `local_svg` rig profile and adapter own SVG-specific controls.

## Archival renderer evaluation — VTube Studio + Live2D

The following historical rationale is retained for context; this renderer is not on the active roadmap:

- strong fit for layered/stylised 2D avatars;
- mature rigging and runtime ecosystem;
- public local WebSocket API;
- parameter injection and hotkey control;
- works on macOS;
- integrates cleanly with later OBS capture.

The evaluation reinforced that any renderer is an adapter, not the animation ontology.

## Archival avatar-authoring option — Live2D Cubism

No Live2D asset track is active. The old notes remain available if a future, separately approved renderer decision needs them.

Do not attempt to build a custom 2D deformation/rigging engine in this project.

## Controller — TypeScript / Node.js

Reasons:

- strong JSON/JSON-Schema tooling;
- straightforward WebSocket and CLI support;
- accessible to coding agents;
- easy local development on Mac;
- future browser/review tooling can share types.

The repo targets Node.js 22+ and tests against Node 22 and 24 in CI.

## Validation — JSON Schema Draft 2020-12 + code diagnostics

JSON Schema handles structure and controlled vocabularies. TypeScript diagnostics handle cross-event invariants such as uniqueness, bounds, overlaps, density, reset, and disclosure.

Do not force temporal/domain rules into unreadable JSON Schema when ordinary tested code is clearer.

## Closed VTube API client decision

The repository contains a small archival protocol client scaffold. No production client was selected, and the related issues were closed as superseded. ADR 0004 retains the historical comparison criteria.

Decision criteria:

- authentication/token handling;
- reconnection behaviour;
- request typing/error handling;
- maintenance/activity;
- ease of deterministic tests;
- amount of wrapper code still required;
- long-term control over logging and playback semantics.

Any future external-renderer work must begin with a new ADR and scoped issues.

## Capture/output — OBS

Use manual screen recording for the first clip. Use OBS later for:

- scene composition;
- persistent disclosure overlay;
- recording;
- virtual-camera output into Teams.

Do not write a custom virtual-camera driver.

## Planning model

Milestone 1 accepts plans generated manually or by a coding/chat agent. Phase 2 adds a provider-neutral planner adapter and validation/repair loop.

Do not couple the renderer package directly to one LLM provider.

## Speech/voice

Deferred until visual control is stable. Later audio architecture should keep:

- response planning;
- TTS/recorded audio;
- timing/visemes;
- virtual microphone routing;
- meeting policy/approval

as separate layers.

## Avoid now

- formal Teams media bot;
- photorealistic talking-head services;
- voice cloning;
- meeting transcription;
- RAG/connected data;
- custom rendering engine;
- large UI;
- raw LLM-to-curve control.
