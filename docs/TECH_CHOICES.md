# Technology Choices

## Milestone 1 renderer — first-party local SVG

A deterministic fixed-tick script will generate a self-contained HTML/SVG player opened via `file://`. It will require no network, external app, or licensed model asset and will render full-duration disclosure. This path is accepted by ADR 0005 but is not yet implemented.

The semantic plan remains renderer-agnostic; a `local_svg` rig profile and adapter own SVG-specific controls.

## Deferred renderer — VTube Studio + Live2D

Rationale:

- strong fit for layered/stylised 2D avatars;
- mature rigging and runtime ecosystem;
- public local WebSocket API;
- parameter injection and hotkey control;
- works on macOS;
- integrates cleanly with later OBS capture.

VTube Studio is an adapter, not the animation ontology.

## Avatar authoring — Live2D Cubism workflow

Use an existing Live2D model for controller development. Prepare the final avatar as a parallel asset track using layered/reconstructed artwork and explicit VTube mappings.

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

## Deferred VTube API client decision

The repository contains a small protocol client scaffold. Make no client choice unless ADR 0005's policy-approved installation criteria are met. ADR 0004 retains the future comparison criteria.

Decision criteria:

- authentication/token handling;
- reconnection behaviour;
- request typing/error handling;
- maintenance/activity;
- ease of deterministic tests;
- amount of wrapper code still required;
- long-term control over logging and playback semantics.

Choose one path and record an ADR. Do not keep two overlapping production clients.

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
