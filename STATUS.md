# Project Status

This file is the source of truth for what exists today. Planning documents describe intended behaviour; this table distinguishes implemented, partial, and unstarted work.

Last clean-check review: **15 July 2026**. See `HANDOFF_REVIEW.md`.

## Scaffold readiness

| Capability | Status | Evidence / command |
|---|---|---|
| Root install/build/test workflow | Implemented | `npm install && npm run check` |
| Animation-plan JSON Schema validation | Implemented | `npm run validate:example` |
| Cross-event semantic diagnostics | Implemented | Covered by tests and `npm run demo:dry` |
| Dry-run ordered timeline | Implemented | `npm run demo:dry` |
| Rig-profile schema + validation | Implemented | `npm run validate:rig` |
| Semantic-to-rig mapping inspection | Implemented scaffold | `npm run demo:mapping`; no VTube commands are sent |
| `local_svg` rig profile + bounded control mapping | Implemented | Discriminated profile union, first-party fixture, and `npm run demo:mapping` |
| Deterministic fixed-tick abstract render script | Implemented | `npm run demo:render-script`; pure `render-script.v1` JSONL consumed by the local player |
| Self-contained `file://` HTML/SVG player | Implemented; Chrome manual check passed | `npm run demo:player`; Start/countdown/pause/restart/completion and exact neutral reset reviewed |
| Restrained SVG mannerism mapping | Implemented; Chrome visual review passed | Distinct listening, thinking, agreement, caveat, speaking-ready, deferral, and neutral states reviewed at 320 px |
| VTube WebSocket connection | Client scaffold only | API-state request exists; no production authentication/session wrapper |
| VTube authentication/token persistence | Deferred | IT policy blocks installation; future adapter only |
| Timed VTube hotkey playback | Deferred | Future VTube adapter only |
| Smoothed VTube parameter injection loop | Deferred | Future VTube adapter only |
| Durable run folder + JSONL renderer log | Implemented | `npm run demo:run`; exact inputs, diagnostics, script, resolved log, player, manifest, and review notes |
| Comparable offline review/replay | Implemented; Chrome manual review passed | Byte-identical plan/script replays at full and 320px with completed rubric and exact neutral reset |
| Programmatic LLM planner integration | Not implemented | Phase 2 |
| OBS virtual camera / Teams | Not started | Later phases |

## Recommended next issue

Milestone 1 is complete. Choose the next bounded Phase 2 experiment from `ROADMAP.md`; do not resume VTube work unless organizational policy and ADR 0005's criteria allow it.

## External dependency

No external application or licensed model asset is required for the Milestone 1 SVG path. VTube/Live2D and the David-specific avatar work remain deferred reference tracks described in `docs/ASSET_PIPELINE.md`.
