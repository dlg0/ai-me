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
| `local_svg` rig profile + bounded control mapping | Implemented | Discriminated profile union, first-party fixture, and `npm run demo:mapping` |
| Deterministic fixed-tick abstract render script | Implemented | `npm run demo:render-script`; pure `render-script.v1` JSONL compiler, no visual output yet |
| Self-contained `file://` HTML/SVG player | Planned, not implemented | No player or manual visual evidence yet |
| Restrained SVG mapping + durable review artifacts | Planned, not implemented | Target is a 20–45 second review at ~320 px |
| VTube WebSocket connection | Client scaffold only | API-state request exists; no production authentication/session wrapper |
| VTube authentication/token persistence | Deferred | IT policy blocks installation; future adapter only |
| Timed VTube hotkey playback | Deferred | Future VTube adapter only |
| Smoothed VTube parameter injection loop | Deferred | Future VTube adapter only |
| Durable run folder + JSONL renderer log | Not implemented | M1-008 |
| Review clip | Blocked on local SVG playback + artifacts | No visual evidence yet |
| Programmatic LLM planner integration | Not implemented | Phase 2 |
| OBS virtual camera / Teams | Not started | Later phases |

## Recommended next issue

Implement the self-contained `file://` HTML/SVG player, restrained mappings, durable artifacts, and review/replay. The abstract render script and local SVG rig contract are implemented; visual playback is not.

## External dependency

No external application or licensed model asset is required for the Milestone 1 SVG path. VTube/Live2D and the David-specific avatar work remain deferred reference tracks described in `docs/ASSET_PIPELINE.md`.
