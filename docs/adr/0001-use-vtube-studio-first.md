# ADR 0001 — Use VTube Studio as First Renderer

## Status

Accepted for first milestone.

## Context

The project needs a fast way to render a controllable stylised avatar on Mac. Building a renderer, video driver, or complete animation system would distract from the core experiment: agent-controlled mannerisms.

## Decision

Use VTube Studio with a Live2D avatar as the first renderer. Build an adapter that maps the project-level control schema to VTube Studio parameters and hotkeys.

## Consequences

Positive:

- avoids building a custom renderer;
- leverages existing avatar tooling;
- works with OBS virtual camera workflow;
- allows rapid visual iteration.

Negative:

- requires an appropriate Live2D rig;
- parameter mappings are rig-specific;
- VTube Studio is not the permanent abstraction.

## Follow-up

Keep `animation-plan.v1` renderer-agnostic so later adapters can target Rive, browser canvas, Unity, or another renderer.
