# ADR 0005 — Use a First-Party Local SVG Renderer for Milestone 1

## Status

Accepted — 2026-07-14. Milestone completed and VTube issue track closed as superseded — 2026-07-15.

## Context

Organizational IT policy blocks installation of VTube Studio on the review Mac. We must not bypass that policy or claim evidence from an unavailable installation. Waiting would leave the core hypothesis—whether semantic plans produce legible, restrained delegate behaviour—untested.

## Decision

Milestone 1 will use a deterministic, dependency-free, first-party local SVG renderer. A `local_svg` rig profile maps abstract runtime controls to renderer-specific SVG controls. A fixed-tick render script produces a self-contained HTML/SVG player that opens via `file://`, needs no network, external application, or licensed model assets, and displays full-duration AI-delegate disclosure.

The implemented target is a 20–45 second review at approximately 320 px. The player, profile, fixed-tick renderer, restrained mappings, durable artifacts, and comparable review/replay are complete.

## Alternatives

- **First-party SVG player — accepted.** It is policy-compatible, deterministic, inspectable, and sufficient to test the visual-control hypothesis.
- **Browser Live2D/Cubism — rejected for Milestone 1.** Proprietary runtime/licensing requirements and organizational-policy risk undermine the dependency-free review path.
- **Wait for VTube approval — rejected.** Approval timing is unknown and waiting leaves the core visual hypothesis untested.

## Boundary preservation

The planner still emits renderer-agnostic communicative intent. The runtime still owns fixed-tick scheduling, easing, smoothing, rate limits, conflict resolution, and neutral reset. Renderer IDs remain in the `local_svg` rig profile or SVG adapter. The renderer consumes resolved controls; it does not reinterpret semantic plans.

## Consequences

- Milestone 1 can be reviewed entirely offline from durable files.
- Abstract SVG visuals test behaviour and disclosure, not Live2D fidelity or VTube integration.
- VTube code and documentation remain as archival scaffold/reference material; no VTube evidence is implied.
- Later adapters can replay the same semantic contract while using their own rig profiles.

## Future external-renderer criteria

Do not reopen the superseded VTube issues. Any future external renderer requires a fresh ADR and newly scoped issues, organizational-policy approval, accepted licensing, a legitimately available test asset, and manual evidence from the approved installation.
