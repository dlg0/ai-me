# Project Status

This file is the source of truth for what exists today. Planning documents describe intended behaviour; this table distinguishes implemented, partial, and unstarted work.

Last clean-check review: **14 July 2026**. See `HANDOFF_REVIEW.md`.

## Scaffold readiness

| Capability | Status | Evidence / command |
|---|---|---|
| Root install/build/test workflow | Implemented | `npm install && npm run check` |
| Animation-plan JSON Schema validation | Implemented | `npm run validate:example` |
| Cross-event semantic diagnostics | Implemented | Covered by tests and `npm run demo:dry` |
| Dry-run ordered timeline | Implemented | `npm run demo:dry` |
| Rig-profile schema + validation | Implemented | `npm run validate:rig` |
| Semantic-to-rig mapping inspection | Implemented scaffold | `npm run demo:mapping`; no VTube commands are sent |
| VTube WebSocket connection | Client scaffold only | API-state request exists; no production authentication/session wrapper |
| VTube authentication/token persistence | Not implemented | M1-004 |
| Timed hotkey playback | Not implemented | M1-005 |
| Smoothed parameter injection loop | Not implemented | M1-006 |
| Durable run folder + JSONL renderer log | Not implemented | M1-008 |
| Review clip | Blocked on rig + M1 playback | M1-009 |
| Programmatic LLM planner integration | Not implemented | Phase 2 |
| OBS virtual camera / Teams | Not started | Later phases |

## Recommended next issue

Complete **M1-004 — VTube Studio connection and authentication**, including token persistence, clear preflight errors, and a manual test recipe on macOS. Before choosing between the in-repo thin client and `VTubeStudioJS`, perform a small documented comparison; do not maintain two implementations.

## External dependency

A reviewable visual demo requires a loaded Live2D model. Development can proceed with any known-good test model. The David-specific avatar preparation/rigging work is a parallel asset track described in `docs/ASSET_PIPELINE.md`.
