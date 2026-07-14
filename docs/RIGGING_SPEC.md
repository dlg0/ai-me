# Avatar Rigging Specification

## Goal

Provide a Live2D/VTube Studio avatar that the controller can drive through a stable, versioned rig profile.

The rig should be a stylised professional delegate associated with David, not a photorealistic webcam replacement.

## Control layers

The handoff must document both mappings:

```text
abstract project control
  -> VTube Studio input parameter or hotkey      (rig-profile.json)
  -> Live2D model parameter/expression/animation (VTube model setup)
```

The controller does not directly address arbitrary Live2D model parameter IDs through the VTube public API. It feeds VTube inputs and triggers configured hotkeys.

## Minimum visual parts

- head/face base;
- neck and shoulders/torso;
- eyes, pupils, and eyelids separated left/right;
- brows separated left/right;
- mouth base and enough interior/forms for later speech;
- hair/accessories in sensible front/back layers;
- optional arm/hand or equivalent deferral affordance.

For a flattened source image, hidden regions exposed by movement must be reconstructed.

## Minimum abstract controls

The long-term rig should support these where practical:

| Abstract control | Purpose |
|---|---|
| `head.angle.x` | turn/look left-right |
| `head.angle.y` | look up-down |
| `head.angle.z` | tilt |
| `eye.open.left` | blink/squint |
| `eye.open.right` | blink/squint |
| `eye.gaze.x` | pupil gaze X |
| `eye.gaze.y` | pupil gaze Y |
| `brow.left.y` | brow stance |
| `brow.right.y` | brow stance |
| `mouth.open` | later speaking/visemes |
| `mouth.form` | smile/frown/caveat |
| `body.lean.x` | lateral posture |
| `body.lean.y` | forward/back posture |

Milestone 1 may begin with head X/Y/Z plus expression/gesture hotkeys. Mouth and detailed gaze controls can follow once the first clip is working.

## Required first-milestone hotkeys

Use unique, documented names:

- `neutral`
- `mild_smile`
- `thinking`
- `uncertain`
- `speaking_ready`
- `boundary`
- `defer_to_human`
- `reset_neutral`
- `micro_nod`
- `small_nod`
- `slow_blink`
- `head_tilt_left`
- `head_tilt_right`
- `brow_raise`
- `brow_furrow`
- `glance_aside`
- `glance_down`
- `half_smile`
- `caveat_expression`

Hotkeys may be backed by VTube expressions, animations, or parameter presets. Their type matters: a toggle expression has different reset semantics from a one-shot animation. Prefer parameter mappings for persistent state posture/expression and one-shot animations for discrete gestures. When a toggle expression is retained for speed, its activation/deactivation lifecycle must be documented and reset must be idempotent. The controller can trigger by unique ID or name, but preflight should record the name, type, backing file, and unique ID, reject ambiguous duplicate names, and resolve playback to the unique ID.

## Rig profile

Example:

```json
{
  "schemaVersion": "rig-profile.v1",
  "rigId": "david_delegate_live2d_v0",
  "renderer": "vtube_studio",
  "model": {
    "expectedModelId": "VTS_MODEL_ID_AFTER_INSTALL",
    "expectedModelName": "David Delegate",
    "assetVersion": "0.1.0"
  },
  "parameters": {
    "head.angle.x": {
      "vtsInputParameter": "FaceAngleX",
      "min": -30,
      "max": 30,
      "neutral": 0,
      "weight": 1
    }
  },
  "hotkeys": {
    "thinking": "thinking",
    "reset_neutral": "reset_neutral"
  }
}
```

`vtsInputParameter` is a VTube Studio input/tracking parameter ID. Its min/max/neutral values describe the range the runtime should use; they must be confirmed against the loaded VTube configuration.

The optional `model` binding lets preflight reject a profile accidentally used against the wrong loaded model. A contract/example profile may be unbound, but a review run should use a profile bound to the installed model ID or, at minimum, its exact name.

## Reset contract

`reset_neutral` must:

- clear toggle expressions that should not persist;
- return discrete animation state to neutral;
- cooperate with parameter injection returning to neutral;
- be safe to call repeatedly;
- leave the model in a stable review-ready pose.

The runtime will also stop refreshing controlled parameters so VTube can return control to its prior source.

## Art direction

- calm and professional;
- stylised enough to read as an AI delegate;
- clear silhouette and expressions;
- readable at meeting-tile size;
- limited idle physics;
- no exaggerated streamer reactions;
- visible segmented construction is acceptable and may be a deliberate design feature.

## Rig acceptance

1. Required hotkeys can be listed through the VTube API.
2. Required input parameters can be listed through the VTube API.
3. The example rig profile validates.
4. Neutral → state → neutral cycles do not accumulate toggles or drift.
5. Thinking, uncertainty, agreement, and deferral are distinguishable without audio.
6. Repeated playback remains visually stable.
