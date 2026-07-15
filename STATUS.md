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
| Raw programmatic planner integration | Implemented | Provider-neutral boundary, prompt versioning, and opt-in raw-only `npm run planner:smoke -- <scenario-id>` OpenAI Responses adapter |
| Bounded planner orchestration | Implemented | Strict whole-text extraction, scenario validation, one repair by default, typed provenance, and opt-in `npm run planner:generate -- <scenario-id>` |
| Durable planner candidate sets + semantic diff | Implemented | Bounded sequential generation, non-overwriting checksummed artifacts, duplicate detection, and offline `npm run planner:diff` |
| Side-by-side candidate render and review bundle | Implemented | Offline `npm run planner:compare`; synchronized sandboxed players, semantic diff, checksummed provenance, and human JSON export |
| Planner acceptance-run evidence | Implemented; live target met, human preference pending | Pinned-model baseline `20260715T032337.085Z-a90bb7434449` scored 0/10; evidence-linked prompt revision run `20260715T033040.807Z-5c2dabdf6e27` scored 8/10 without hand edits |
| OBS virtual camera / Teams | Not started | Later phases |

## Recommended next issue

Complete the evidence-bound human preference for the guided comparison `20260715T072026.184Z-0a5567c07680`, then finalize the Phase 2 trace and close `aime-rmz.6`.

## External dependency

No external application or licensed model asset is required for the active SVG path. VTube/Live2D and the old David-specific avatar documents are archival references, not active work; any future external renderer requires a fresh decision and scope.
