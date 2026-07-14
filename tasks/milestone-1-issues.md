# Milestone 1 Issue Breakdown

`STATUS.md` is the source of completion truth. “Complete” below means implemented and covered by the root check; VTube-dependent issues additionally require manual evidence.

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

Status: **next / not implemented**.

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

Status: **not implemented**.

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

Status: **not implemented**.

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

Status: **partial**; inspection mapping exists, visual mapping does not.

Objective:

Create a restrained mapping for the reference scene on a real model.

Acceptance criteria:

- [ ] listening, thinking, agreement, uncertainty, speaking-ready, deferral, and reset are visually distinct;
- [ ] default motion remains below the documented style limits;
- [ ] stillness is present;
- [ ] mapping constants are centralised and reviewable;
- [ ] no renderer IDs leak into animation-plan JSON;
- [ ] review at Teams-tile size.

## M1-008 — Durable run artefacts

Status: **not implemented**.

Objective:

Create one self-contained folder per playback.

Acceptance criteria:

- [ ] stable run ID and `manifest.json`;
- [ ] copies of plan and rig profile;
- [ ] validation warnings captured;
- [ ] `renderer-log.jsonl` with timestamps, event IDs, resolved commands, requests/responses/errors;
- [ ] review notes created from `templates/review-notes.md`;
- [ ] recording path/checksum can be added after manual capture;
- [ ] incomplete/failed runs are retained and marked rather than silently deleted.

## M1-009 — First review clip

Status: **blocked on M1-004 through M1-008 plus a usable rig**.

Objective:

Produce and assess the first 20–45 second animation.

Acceptance criteria:

- [ ] reference plan replayed on generic test rig;
- [ ] reference plan replayed on David-specific rig when available;
- [ ] recording linked in run manifest;
- [ ] rubric completed at full and Teams-tile size;
- [ ] top five changes assigned to plan/runtime/rig/VTube/capture layers;
- [ ] second replay starts/ends neutral and is comparable.

## Milestone exit

M1 is complete only when M1-009 has a reviewable clip and evidence. A successful dry run or mapping printout is not milestone completion.
