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
render-script.v1 (fixed-tick abstract controls + semantic markers)
        ↓
Rig profile + renderer adapter
        ↓
Resolved renderer controls
        ↓
Milestone 1 local SVG adapter
        ↓
Self-contained HTML/SVG player
        ↓
Review capture / later OBS virtual camera
```

The `local_svg` profile, deterministic runtime, player, and durable run bundle are implemented for Milestone 1. The earlier Live2D/VTube asset and adapter path is archival rather than a parallel workstream.

## Critical parameter distinction (archival VTube example)

There are three different layers that must not be conflated:

1. **Abstract project control** — `head.angle.x`, `caveat_expression`.
2. **VTube Studio input/tracking parameter or hotkey** — for example `FaceAngleX` or a named hotkey.
3. **Live2D model parameter** — a parameter inside the rig that VTube Studio maps from an input.

The VTube example records why renderer inputs and model parameters must not be conflated. In every adapter, `rig-profile.v1` describes the abstract-to-renderer boundary; renderer internals stay downstream.

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

The Phase 2 provider-neutral orchestration boundary parses the complete trimmed model text as one JSON object, applies both plan and selected-scenario policy validation (warnings included), and permits one bounded repair by default. Every attempt retains its exact raw response and validation provenance. `npm run planner:generate -- <scenario-id>` is an opt-in live command requiring the OpenAI environment variables; it writes exactly one typed JSON result to stdout and exits nonzero for every terminal failure. It does not persist or render a plan.

### 3. Mannerism runtime

Responsibilities:

- schedule events against a monotonic clock;
- convert semantic states to abstract target values;
- interpolate/ease transitions;
- sample and resolve held values on deterministic fixed ticks;
- debounce/queue gestures;
- add carefully bounded micro-motion later;
- handle cancellation, error, and neutral reset;
- emit structured logs.

The runtime owns taste and temporal coherence. The planner expresses intent.

Its pure compiler has no clock, filesystem, randomness, rig profile, or renderer dependency. It samples at 20 fps by default, applies deterministic smoothstep transitions and neutral gap handling, and quantizes abstract values to four decimals. Same-name gesture overlap is rejected at this layer; differently named poses remain ordered contributions because only the adapter can know whether their renderer mappings collide. Completed, cancelled, and recoverable-error streams all terminate with explicit outcome, exact-neutral reset, and release records. Cancellation/error stop times truncate to the tick grid and add a deterministic reset ramp.

Persistent conversational stance should normally be expressed as eased parameter targets. Hotkeys are best reserved for bounded one-shot gestures/animations. If an early rig uses toggle expressions for state stance, the adapter must know their lifecycle, deactivate them on transition, and prove that reset is idempotent; blindly firing toggle hotkeys is not acceptable playback.

### 4. Rig profile

A versioned adapter manifest for one configured avatar:

- renderer identity and asset version when available;
- abstract parameter → renderer-specific control ID;
- supported range and neutral value;
- optional injection weight;
- abstract gesture/expression → renderer-specific selector.

The profile is data, not executable animation logic.

### 5. Local SVG adapter (Milestone 1; implemented)

Responsibilities:

- consume fixed-tick abstract runtime output through a `local_svg` rig profile;
- consume compiler-coalesced unique abstract poses in listed state-before-gesture order, then resolve them through the profile; later poses win when different names resolve to the same renderer control;
- render restrained abstract-avatar controls into self-contained HTML/SVG;
- open via `file://` without network, external apps, or licensed model assets;
- preserve full-duration disclosure, logs, deterministic replay, and neutral reset.

The VTube scaffold is retained as archival reference only. It has no active client, session, or playback assignment.

### 6. Archival avatar asset pipeline

Responsibilities:

- establish source-art rights/provenance;
- decompose/redraw a flat avatar into riggable layers;
- create Live2D deformers/parameters/physics;
- configure VTube input mappings and hotkeys;
- export a matching rig profile;
- validate expression legibility at small size.

See `ASSET_PIPELINE.md` for historical reference. This is not an active parallel workstream.

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
Local renderer/browser scene
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
example-animation-plan.json + local_svg rig-profile.json
        ↓
validate
        ↓
fixed-tick semantic resolution
        ↓
restrained renderer-control mapping
        ↓
self-contained HTML/SVG player
        ↓
neutral reset/release
        ↓
run folder + optional recording
```

## Failure behaviour

The local SVG path must fail visibly on plan/profile mismatch, invalid timing, unresolved controls, generation/write failure, or cancellation, and must preserve diagnostics and neutral reset.

### Archival VTube-specific failure requirements

If a new decision ever revives this adapter, it must fail closed and visibly when:

- VTube Studio cannot be reached;
- plugin API access is disabled;
- authentication is denied/revoked;
- no model is loaded;
- a required input/hotkey is missing;
- the plan and rig IDs differ;
- event timing is invalid;
- playback is cancelled or the connection closes.

Any revived external-renderer failure path must attempt neutral/reset when a connection remains available.

## Renderer strategy

Local SVG is the active adapter because it is deterministic, dependency-free, and policy-compatible. The project-level schema remains renderer-agnostic so a separately approved future adapter can reuse it.
