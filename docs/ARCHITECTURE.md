# Architecture

## System overview

```text
Scenario brief / later meeting state
        ↓
Planner agent
        ↓
animation-plan.v1
        ↓
Schema validation + semantic diagnostics
        ↓
Mannerism runtime
        ↓
Abstract controls
        ↓
Rig profile + VTube adapter
        ↓
VTube Studio input parameters / hotkeys
        ↓
VTube Studio model mappings
        ↓
Live2D model parameters and animation
        ↓
Review capture / later OBS virtual camera
```

A parallel asset pipeline produces the Live2D model, its VTube configuration, and the rig profile.

## Critical parameter distinction

There are three different layers that must not be conflated:

1. **Abstract project control** — `head.angle.x`, `caveat_expression`.
2. **VTube Studio input/tracking parameter or hotkey** — for example `FaceAngleX` or a named hotkey.
3. **Live2D model parameter** — a parameter inside the rig that VTube Studio maps from an input.

The controller injects VTube Studio input parameters. The VTube model configuration maps those inputs to the actual Live2D rig. `rig-profile.v1` describes layer 1 → layer 2; the rigger owns layer 2 → layer 3.

## Components

### 1. Planner

Inputs may include a scene brief, intended text, role stance, and safety constraints.

Output is valid semantic JSON. The planner cannot select renderer IDs or animation curves.

Milestone 1 may use a coding/chat agent manually. Programmatic provider integration is Phase 2.

### 2. Validator and diagnostics

Responsibilities:

- structural schema validation;
- timing/bounds checks;
- state exclusivity;
- gesture-density warnings;
- speech/state compatibility;
- reset/disclosure checks;
- rig-profile validation;
- plan/rig identity match.

Invalid output does not reach the renderer.

### 3. Mannerism runtime

Responsibilities:

- schedule events against a monotonic clock;
- convert semantic states to abstract target values;
- interpolate/ease transitions;
- refresh held VTube input values throughout their lifetime;
- debounce/queue gestures;
- add carefully bounded micro-motion later;
- handle cancellation, error, and neutral reset;
- emit structured logs.

The runtime owns taste and temporal coherence. The planner expresses intent.

Persistent conversational stance should normally be expressed as eased parameter targets. Hotkeys are best reserved for bounded one-shot gestures/animations. If an early rig uses toggle expressions for state stance, the adapter must know their lifecycle, deactivate them on transition, and prove that reset is idempotent; blindly firing toggle hotkeys is not acceptable playback.

### 4. Rig profile

A versioned adapter manifest for one configured avatar:

- expected VTube model ID/name and asset version when available;
- abstract parameter → VTube input parameter ID;
- supported range and neutral value;
- optional injection weight;
- abstract gesture/expression → VTube hotkey selector (name or ID), resolved by preflight to a unique ID before playback.

The profile is data, not executable animation logic.

### 5. VTube adapter/session

Responsibilities:

- connect to a configurable local WebSocket endpoint;
- authenticate and persist the user-approved token outside Git;
- inspect session/model/hotkey/input-parameter state;
- send hotkey and injection requests;
- correlate responses and surface API errors;
- log sent requests and results;
- close/release safely.

VTube Studio requires held injected parameters to be resent periodically; the playback loop must therefore stream active values rather than send only state-start events.

### 6. Avatar asset pipeline

Responsibilities:

- establish source-art rights/provenance;
- decompose/redraw a flat avatar into riggable layers;
- create Live2D deformers/parameters/physics;
- configure VTube input mappings and hotkeys;
- export a matching rig profile;
- validate expression legibility at small size.

See `ASSET_PIPELINE.md`.

### 7. Review/capture layer

Responsibilities:

- create a run ID and manifest;
- copy plan/profile inputs;
- save diagnostics and JSONL command logs;
- provide a review-note template;
- optionally invoke or guide screen recording;
- support future side-by-side comparison.

### 8. Later live integration

Early live path:

```text
VTube Studio scene/window
        ↓
OBS scene + disclosure overlay
        ↓
OBS Virtual Camera
        ↓
Teams camera selection
```

Audio, transcript context, and formal Teams-bot participation remain separate later components.

## Milestone 1 data flow

```text
example-animation-plan.json + rig-profile.json
        ↓
validate
        ↓
preflight authenticated VTube session
        ↓
resolve semantic events
        ↓
clocked hotkey + parameter playback
        ↓
neutral reset/release
        ↓
run folder + optional recording
```

## Failure behaviour

The runtime must fail closed and visibly when:

- VTube Studio cannot be reached;
- plugin API access is disabled;
- authentication is denied/revoked;
- no model is loaded;
- a required input/hotkey is missing;
- the plan and rig IDs differ;
- event timing is invalid;
- playback is cancelled or the connection closes.

Every failure path must attempt neutral/reset when a connection remains available.

## Renderer strategy

VTube Studio is the first adapter because it provides a mature Live2D host and public control API on Mac. The project-level schema must remain usable by later Rive, browser, Unity, or other renderers.
