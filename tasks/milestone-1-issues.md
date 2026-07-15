# Milestone 1 Issue Breakdown

> **Historical checklist below.** Beads epic `aime-6gm` is now the source of issue scope, acceptance criteria, status, and dependencies. `STATUS.md` remains the source of implementation truth. Run `bd show aime-6gm --children`, `bd ready`, and `bd blocked` rather than selecting work from the old checklist.

## Current policy-safe critical path

ADR 0005 replaces VTube Studio as the first Milestone 1 renderer because organizational IT policy blocks installation. Work proceeds in this dependency order:

1. `M1-SVG-000` — record the local SVG decision and truthful status;
2. `M1-SVG-001` — add a discriminated `local_svg` rig profile and first-party avatar vocabulary;
3. `M1-SVG-002` — compile a deterministic fixed-tick abstract render script;
4. `M1-SVG-003` — generate a self-contained offline HTML/SVG player;
5. `M1-007` — tune a restrained, legible local SVG mannerism mapping;
6. `M1-008` — persist durable successful, failed, and cancelled run artifacts;
7. `M1-009` — review and replay the 20–45 second result at full and approximately 320px size.

The local player must require no network, external application, or licensed model asset and must display AI-delegate disclosure for the full duration. The planner remains renderer-agnostic; the runtime owns time/easing/conflicts/reset; SVG-specific identifiers stay in the rig profile or adapter.

## Superseded VTube track

The VTube model, client decision, authenticated session/preflight, hotkey playback, and parameter injection Beads issues are closed as superseded by completed local SVG issues. No VTube implementation or manual evidence is claimed. Do not bypass organizational policy or reopen those issues; a future external-renderer direction requires a fresh decision and newly scoped work.

## Pre-pivot scaffold checklist

The sections below record the acceptance criteria that shaped the existing scaffold and superseded VTube issues. They are historical context, not current instructions.

## M1-001 — Animation-plan validation CLI

Status: **complete**.

Acceptance evidence:

- `npm run validate:example` succeeds;
- wrong schema version and unknown gestures fail in tests;
- readable file/JSON errors;
- schema uses Draft 2020-12 with the matching AJV implementation.

## M1-002 — Semantic diagnostics and dry-run timeline

Status: **complete**.

Acceptance evidence:

- `npm run demo:dry` prints ordered start/end/duration data;
- duplicate IDs, event bounds, and state overlaps are tested as errors;
- density, state gaps, speech/state mismatch, reset, and disclosure can surface warnings.

## M1-003 — Rig profile and mapping inspection

Status: **complete scaffold**.

Acceptance evidence:

- `rig-profile.v1` schema/example/validator exist;
- ranges and neutral values receive semantic checks;
- plan target rig is checked against profile ID;
- `npm run demo:mapping` resolves abstract controls and explicitly sends no VTube commands.

Remaining rig discovery belongs to M1-004 preflight.

## M1-004 — Authenticated VTube session and preflight

Status: **closed as superseded** by the local SVG profile, validation, player, and durable diagnostics; not implemented for VTube.

Objective:

Create a reliable local session that authenticates once, persists the approved token, and verifies the loaded environment before playback.

Acceptance criteria:

- [ ] record an ADR choosing the thin client or `VTubeStudioJS`;
- [ ] configurable host/port with `localhost:8001` default;
- [ ] actionable error when VTube is unreachable or Plugin API access is disabled;
- [ ] token request flow using stable plugin name/developer values;
- [ ] plugin name and developer are stable strings of 3–32 characters and are validated before requesting a token;
- [ ] token persisted in an ignored local file and reused;
- [ ] revoked/invalid token handled by a clear re-authorisation path;
- [ ] current session reports authenticated;
- [ ] current model is loaded;
- [ ] loaded model matches the rig profile's expected model ID/name when bound;
- [ ] strict playback refuses an unbound rig profile; development inspection may warn and continue;
- [ ] current-model hotkeys are listed with name, unique ID, type, and backing file where available;
- [ ] duplicate/ambiguous hotkey names fail preflight unless the rig profile uses a unique ID;
- [ ] rig mappings resolve to unique hotkey IDs before playback;
- [ ] available input parameters are listed and rig mappings verified;
- [ ] preflight report identifies all missing/ambiguous mappings before playback;
- [ ] automated protocol tests plus a documented manual macOS/VTube test.

Non-goal: timed playback.

## M1-005 — Clocked hotkey playback

Status: **closed as superseded** by the renderer-neutral scheduler and local SVG player; not implemented for VTube.

Objective:

Schedule discrete gesture/expression hotkeys from a validated plan.

Acceptance criteria:

- [ ] monotonic playback clock;
- [ ] start delay/countdown available for recording;
- [ ] events execute in deterministic order;
- [ ] hotkey names/IDs come from preflighted rig profile;
- [ ] identical resolved hotkey commands at the same timestamp are rejected or deliberately coalesced;
- [ ] toggle-expression lifecycle is explicit; state transitions cannot accidentally toggle an expression off/on or leave it accumulated;
- [ ] every scheduled/sent/acknowledged/failed command is logged;
- [ ] VTube hotkey queue/cooldown errors are surfaced;
- [ ] cancellation prevents remaining events;
- [ ] reset-neutral attempted on normal completion, cancellation, and recoverable error.

## M1-006 — Smoothed parameter injection loop

Status: **closed as superseded** by the renderer-neutral easing runtime and local SVG control mapping; not implemented for VTube.

Objective:

Render state/posture targets as eased VTube input parameter values over time.

Acceptance criteria:

- [ ] configurable tick rate with documented default;
- [ ] monotonic interpolation/easing;
- [ ] active values resent frequently enough to retain VTube control;
- [ ] values clamped through rig min/max/neutral mapping;
- [ ] one owner for each parameter in `set` mode;
- [ ] start/end/cancel transitions do not jump or drift;
- [ ] reset sends/holds neutral briefly, then releases injection;
- [ ] deterministic clock/runtime unit tests.

## M1-007 — First professional taste mapping

Status: **implemented** on the first-party local SVG review rig.

Objective:

Create a restrained mapping for the reference scene on the first-party local SVG avatar.

Acceptance criteria:

- [x] listening, thinking, agreement, uncertainty, speaking-ready, deferral, and reset are visually distinct;
- [x] default motion remains below the documented style limits;
- [x] stillness is present;
- [x] mapping constants are centralised and reviewable;
- [x] no renderer IDs leak into animation-plan JSON;
- [x] review at Teams-tile size.

## M1-008 — Durable run artefacts

Status: **implemented**.

Objective:

Create one self-contained folder per playback.

Acceptance criteria:

- [x] stable run ID and `manifest.json`;
- [x] copies of plan and rig profile;
- [x] validation warnings captured;
- [x] `renderer-log.jsonl` with timestamps, event IDs, resolved commands, decisions, and errors;
- [x] review notes created from `templates/review-notes.md`;
- [x] recording path/checksum can be added after manual capture;
- [x] incomplete/failed runs are retained and marked rather than silently deleted.

## M1-009 — First review clip

Status: **implemented** on local SVG; the David-specific/VTube criterion was superseded and removed from the active direction.

Objective:

Produce and assess the first 20–45 second animation.

Acceptance criteria:

- [x] reference plan replayed on generic test rig;
- Not applicable: the David-specific VTube replay was superseded by the reviewed first-party local SVG rig;
- [x] optional recording fields retained in each manifest; no recording captured for this review;
- [x] rubric completed at full and Teams-tile size;
- [x] top five changes assigned to plan/runtime/rig/renderer/capture layers;
- [x] second replay starts/ends neutral and is comparable.

## Milestone exit

M1 is complete only when M1-009 has a reviewable clip and evidence. A successful dry run or mapping printout is not milestone completion.
