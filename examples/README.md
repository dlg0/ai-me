# Examples

## `example-animation-plan.json`

A valid regression fixture for the reference scene. It is intended to exercise the schema, semantic diagnostics, timeline, and mapping layer.

It targets `rig-profile.local-svg.json`, the policy-safe first-party SVG contract. That profile centralizes SVG control IDs and bounded values; animation plans remain renderer-independent. It is contract data for the forthcoming player, not an SVG renderer or asset.

## `rig-profile.example.json`

An **illustrative contract fixture**, not evidence that a matching Live2D/VTube model exists. The head-input IDs use common VTube Studio defaults, while the hotkey selectors are proposed names for the future delegate rig.

It deliberately has no `model` binding because there is no installed model to bind yet. Strict real playback should require a bound profile.

Before real playback:

1. load a known-good Live2D model;
2. create a profile for that exact VTube configuration;
3. set the plan's `targetRig` to the matching `rigId`;
4. run authenticated preflight;
5. resolve every selector to a unique hotkey ID and verify every input parameter;
6. verify toggle/expression lifecycle and reset manually.

Do not rename mapping inspection as playback merely because these fixtures validate.
