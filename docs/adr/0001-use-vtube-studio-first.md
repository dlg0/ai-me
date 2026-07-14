# ADR 0001 — Use VTube Studio as First Renderer

## Status

Superseded for Milestone 1 by [ADR 0005](0005-local-svg-renderer.md). VTube Studio is deferred as a possible future adapter.

## Context

The project needs a fast way to render a controllable stylised avatar on Mac. Building a renderer, video driver, or complete animation system would distract from the core experiment: agent-controlled mannerisms.

## Decision

The historical decision was to use VTube Studio with a Live2D avatar as the first renderer and map project-level controls to its parameters and hotkeys. Organizational IT policy later made that installation unavailable; ADR 0005 changes the Milestone 1 renderer without invalidating this rationale for a future policy-approved adapter.

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
