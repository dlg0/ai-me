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
| VTube WebSocket connection | Archival scaffold; superseded | API-state request remains for reference; no production integration is planned |
| VTube authentication/token persistence | Closed as superseded | Replaced by the dependency-free local SVG path; never implemented |
| Timed VTube hotkey playback | Closed as superseded | Deterministic abstract scheduling and local SVG playback provide the active alternative |
| Smoothed VTube parameter injection loop | Closed as superseded | Runtime easing and bounded local SVG control resolution provide the active alternative |
| Durable run folder + JSONL renderer log | Implemented | `npm run demo:run`; exact inputs, diagnostics, script, resolved log, player, manifest, and review notes |
| Comparable offline review/replay | Implemented; Chrome manual review passed | Byte-identical plan/script replays at full and 320px with completed rubric and exact neutral reset |
| Programmatic LLM planner integration | Not implemented | Phase 2 |
| OBS virtual camera / Teams | Not started | Later phases |

## Recommended next issue

Milestone 1 is complete. Start Phase 2 with a provider-independent planner evaluation contract and held-out scenario corpus before adding an LLM API adapter.

## External dependency

No external application or licensed model asset is required for the active SVG path. VTube/Live2D and the old David-specific avatar documents are archival references, not active work; any future external renderer requires a fresh decision and scope.
