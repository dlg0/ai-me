# Live2D Rigger Brief

## Project

Create or adapt a Live2D model for a clearly disclosed AI delegate associated with David.

Read:

- `docs/ASSET_PIPELINE.md`
- `docs/RIGGING_SPEC.md`
- `docs/ANIMATION_VOCABULARY.md`

## Visual direction

Professional, calm, recognisable, and intentionally stylised. A visibly segmented/collage-like puppet is welcome if it is coherent and expressive. Do not aim for a photorealistic webcam clone.

## Source preparation

For a flat image, separate/redraw the expressive parts and reconstruct hidden geometry. The model must not reveal holes when the head, eyelids, eyes, brows, mouth, hair, or torso move.

## Small-size requirement

The result will often appear as a Teams participant tile. Thinking, uncertainty, agreement, speech-ready, boundary, and deferral must remain distinguishable at small size.

## First-milestone actions

- neutral/reset;
- listening;
- thinking;
- mild agreement;
- uncertainty/caveat;
- speech-ready/qualified-answer pose;
- boundary/refusal;
- defer-to-David;
- micro nod;
- small nod;
- slow blink;
- left/right modest head tilt;
- brow raise/furrow;
- brief glance aside/down.

## VTube Studio handoff

Configure unique hotkeys listed in `docs/RIGGING_SPEC.md`. Map VTube input/tracking parameters to the actual Live2D model parameters. Provide:

- model/version identifier;
- installation notes;
- VTube input → Live2D parameter map;
- hotkey names and IDs where available;
- neutral/min/max values;
- `rig-profile.v1` matching the configured model;
- expression contact sheet and neutral reference.

The rig profile maps abstract project controls to VTube inputs/hotkeys. It does not replace the VTube model's own mapping from inputs to Live2D parameters.
