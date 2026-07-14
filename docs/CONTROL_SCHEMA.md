# Animation Control Schema

## Purpose

`animation-plan.v1` is the contract between a planner and the deterministic runtime. It records semantic behaviour that can be validated, diffed, replayed, and rendered by more than one backend.

The planner emits this level of intent:

```json
{
  "type": "state",
  "state": "thinking",
  "attention": "down_left",
  "intensity": 0.45,
  "affect": {
    "confidence": 0.52,
    "uncertainty": 0.42
  }
}
```

It does not emit this:

```json
{
  "FaceAngleX": [-3.1, -3.4, -3.7],
  "ParamBrowLY": [0.22, 0.26, 0.23]
}
```

Renderer IDs and exact curves belong in the rig profile, runtime, and renderer adapter.

A rig profile may initially contain a VTube hotkey name or unique ID as its selector. Mapping inspection must call it a selector, not pretend a human-readable name is already a verified ID. M1-004 preflight resolves selectors to unique IDs before playback.

## Actual plan tracks

Version 1 has four tracks:

- `states`: mutually exclusive high-level conversational states;
- `gestures`: discrete, potentially overlapping requests;
- `speech`: optional speech intent/text and approximate duration;
- `overlays`: review/disclosure metadata for the capture layer.

Posture, face, gaze, and raw parameter channels are runtime outputs, not planner tracks in version 1.

## Top-level shape

```json
{
  "schemaVersion": "animation-plan.v1",
  "title": "Qualified answer with deferral",
  "durationMs": 28000,
  "safetyMode": "offline_review_only",
  "targetRig": "david_delegate_live2d_v0",
  "tracks": {
    "states": [],
    "gestures": [],
    "speech": [],
    "overlays": []
  }
}
```

## State event

```json
{
  "id": "state-002",
  "type": "state",
  "startMs": 4500,
  "durationMs": 3500,
  "state": "thinking",
  "intensity": 0.45,
  "attention": "down_left",
  "affect": {
    "warmth": 0.35,
    "confidence": 0.52,
    "uncertainty": 0.42,
    "energy": 0.28
  },
  "reason": "Show processing before answering."
}
```

High-level states are exclusive. The semantic validator rejects overlaps in the state track.

## Gesture event

```json
{
  "id": "gesture-004",
  "type": "gesture",
  "startMs": 11800,
  "durationMs": 900,
  "gesture": "small_nod",
  "intensity": 0.35,
  "reason": "Acknowledge the question before answering."
}
```

Gesture duration describes the intended action window. A hotkey animation may have its own internal timing; the adapter must log any mismatch.

Do not duplicate a state affordance with the same discrete gesture at the same transition unless the renderer mapping explicitly requires both. The resolved playback layer must reject or coalesce identical hotkey commands rather than blindly firing toggle actions twice.

## Speech-intent event

```json
{
  "id": "speech-001",
  "type": "speech",
  "startMs": 13200,
  "durationMs": 7200,
  "text": "My read is that this is probably safe, but David should confirm the commitment.",
  "speechAct": "qualified_answer",
  "confidence": 0.62,
  "emphasis": [
    {"text": "probably safe", "gesture": "caveat_expression"},
    {"text": "David should confirm", "gesture": "defer_to_human"}
  ]
}
```

This is not an audio asset. Milestone 1 uses it to define a speech-ready behavioural segment. Later phases may derive word/phoneme/viseme timing from audio.

## Overlay event

```json
{
  "id": "overlay-001",
  "type": "overlay",
  "startMs": 0,
  "durationMs": 28000,
  "text": "David's AI Delegate — offline animation review",
  "position": "lower_third"
}
```

Overlays belong to the review/capture layer and must not be misrepresented as avatar controls. The Milestone 1 local player renders the disclosure overlay for the full duration while keeping it out of the avatar-control mapping. A future VTube adapter may continue to preserve this event as capture intent for OBS or another output layer.

## State vocabulary

- `idle`
- `listening`
- `thinking`
- `agreeing`
- `uncertain`
- `speaking`
- `summarising`
- `deferring`
- `boundary`
- `reset_neutral`

## Gesture vocabulary

- `blink`
- `slow_blink`
- `micro_nod`
- `small_nod`
- `head_tilt_left`
- `head_tilt_right`
- `brow_raise`
- `brow_furrow`
- `glance_aside`
- `glance_down`
- `half_smile`
- `caveat_expression`
- `defer_to_human`
- `reset_neutral`

Speech emphasis gestures use the same controlled vocabulary; arbitrary strings are invalid.

## Safety modes

- `offline_review_only`
- `disclosed_ai_delegate`
- `local_operator_approved`

The schema intentionally has no covert/impersonation mode.

## Structural validation

JSON Schema checks:

- required fields and types;
- schema version;
- allowed state/gesture/speech-act values;
- value ranges;
- unknown properties;
- event-ID format;
- basic non-negative timing.

## Semantic diagnostics

Code additionally checks:

- event IDs are unique across tracks;
- events do not end beyond `durationMs`;
- high-level states do not overlap;
- state-track gaps are visible;
- non-blink gesture spacing is not excessively dense;
- speech begins in a speech-compatible state;
- a final neutral reset is present;
- offline review carries full-duration AI/delegate disclosure metadata.

Errors block playback. Warnings remain visible and must be logged with the run.

## Runtime rules

The runtime may soften or suppress requests that violate style/safety limits, but it must log the decision. It must never silently reinterpret a plan into materially different behaviour.

## Versioning

Changes that invalidate existing plans require a new schema version. Additive runtime mappings or rig profiles do not require an animation-plan version change. Keep example plans as regression fixtures whenever the schema evolves.
