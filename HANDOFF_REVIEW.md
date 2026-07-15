# Review Records

## Milestone 1 offline SVG completion — 15 July 2026

**Verdict:** the policy-safe Milestone 1 loop is complete. The unchanged 28-second semantic plan was reviewed in self-contained local SVG bundles at full size and at a 320px browser viewport, revised only at the rig/renderer boundary, and replayed with a byte-identical abstract render script.

### Comparable evidence

- Replay A: `20260715T001338.814Z-79518f1791c2`
- Final Replay B: `20260715T003121.821Z-d97aaab3251d`
- shared plan SHA-256: `bff27295694c1a212c25573bde0dba61166835f63d1b082f37ebdb59ebc2854a`
- shared `render-script.jsonl` SHA-256: `b2e8e1673a8b0043c375b2d1828b48eed22d7a069ea2871d16b0e847589c2eed`
- baseline/revised profile SHA-256: `cba2c61e08803cb92162b783d834aaa8da186f222c89e7b8edfaefaa901b8570` / `c13c2041a3434fd70d6062935c67d4680e5f2159d9e5801d98e22bea6b411911`

The ignored run folders contain exact plan/profile copies, checksummed manifests, validation diagnostics, deterministic abstract scripts, resolved renderer logs, self-contained players, and completed review notes. No recording was captured; recording is optional for the local SVG acceptance and both manifests retain null attachment fields.

### Review outcome

- Replay A scored 3/5 for state legibility, epistemic legibility, and small-tile readability while passing every stop condition.
- Final Replay B scored 4/5 in those dimensions and 5/5 for restraint, temporal coherence, rig stability/reset, disclosure, and repeatability.
- Listening, thinking, mild agreement, uncertainty/caveat, speaking-ready, and deferral were identifiable at 320px without relying on the current-state label.
- The full-duration AI-delegate disclosure and offline-prototype badge remained visible and readable.
- All 15 planned event IDs produced paired start/end log edges; no unexpected gesture or error was observed.
- Direct Chrome playback completed at exact neutral. Restart synchronously reproduced the same inspected neutral SVG attributes before countdown.
- The final 320px viewport and document scroll width both measured 320px; Start, Pause, and Restart were all visible.

The five attributed changes were: local gaze gain (rig), thinking brow/tilt gain (rig), caveat visibility (renderer), small-width disclosure spacing (renderer), and responsive player controls (renderer). The semantic plan and renderer-neutral runtime were deliberately unchanged so replay comparability remained exact.

### Verification

```bash
npm run check
npm run demo:dry
npm run demo:mapping
npm run --silent demo:render-script
npm run demo:player
npm run demo:run
```

Chrome `file://` checks covered full playback, countdown, pause/restart mechanics, completion, exact neutral, 320px responsive layout, persistent disclosure, and absence of resource requests. Safari and VTube Studio were not tested; the VTube issue track was subsequently closed as superseded, with no VTube evidence claimed.

## Historical pre-pivot scaffold handoff — 14 July 2026

> This section records the pre-pivot scaffold handoff. ADR 0005 and `STATUS.md` supersede its VTube-first recommendation.

**Review date:** 14 July 2026
**Review environment:** Node.js 22.16.0, npm 10.9.2, clean source-only copy

## Verdict

The scaffold is ready to hand to development agents for **M1-004 — authenticated VTube Studio session and preflight**.

It is intentionally not represented as a completed avatar renderer. The repository has a working, tested planning/validation/mapping foundation; actual authenticated playback, visual capture, and the final avatar rig remain milestone work.

## Material defects corrected during review

1. **Schema validation was not runnable.** The schemas declare JSON Schema Draft 2020-12, while the original controller used AJV's default dialect. The validator now uses `Ajv2020`, compiles strictly, and is exercised by tests.
2. **The renderer status was overstated.** Mapping/logging code was separated from real playback. The inspection command now explicitly opens no WebSocket and sends no VTube commands.
3. **VTube and Live2D parameter layers were conflated.** The architecture and rig schema now distinguish abstract controls, VTube input/tracking parameters, and actual Live2D model parameters.
4. **The reference plan contained duplicate hotkey actions.** Deferral and reset were each represented as both a state and an identical gesture, which could double-trigger or invert toggle expressions. The collisions were removed, and lifecycle/coalescing requirements were added.
5. **Hotkey names were labelled as verified IDs.** Preflight has not happened yet, so mapping output now calls these values selectors. M1-004 must resolve selectors to unique IDs before playback.
6. **Parameter injection asserted `faceFound: false` by default.** The client now omits face-tracking state unless the caller explicitly supplies it.
7. **Duplicate-ID diagnostics could point at the wrong event.** Paths now use event identity and are covered by a regression test.
8. **Voice, overlay, asset, and Teams scope was ambiguous.** Milestone 1 is now explicitly a silent/offline animation review; overlay intent is preserved but rendered later; the David-specific avatar is a parallel asset track; OBS/Teams remain downstream.
9. **The agent-iteration objective was under-specified.** The larger scope now includes a durable candidate-render-review-revision loop with defect attribution and human review.
10. **The sample rig was not tied to a known model.** Rig profiles can now declare the expected VTube model ID/name and asset version; strict playback must reject an unbound or mismatched profile.
11. **The silent speaking segment had no guaranteed visual treatment.** The vocabulary, rig requirements, example profile, and mapping now include a `speaking_ready` selector so the no-TTS Milestone 1 demo still has a reviewable speaking state.
12. **Handoff controls were missing.** The repo now includes a status source of truth, root checks, CI, agent instructions, issue-ready tasks, a review rubric, local setup, asset pipeline, and a proposed API-client decision ADR.

## Verification completed

From a clean copy with `node_modules`, build output, local tokens, private assets, and generated runs removed:

```bash
npm ci
npm run check
npm run demo:dry
npm run demo:mapping
npm audit --audit-level=high
```

Observed results:

- TypeScript build passed;
- **16/16 automated tests passed**;
- reference animation plan validated;
- reference rig profile validated;
- every state/gesture in the reference plan resolved through the example rig without a missing-mapping diagnostic;
- dry-run timeline completed;
- mapping inspection completed and declared that no VTube commands were sent;
- npm reported **0 vulnerabilities**;
- all repository JSON parsed;
- all relative Markdown links resolved.

## Deliberately unverified external behaviour

The review environment did not contain David's local VTube Studio installation or a loaded Live2D model. Therefore the following still require the documented macOS/manual evidence:

- VTube user approval and token persistence;
- authentication after reconnect/restart;
- current-model/hotkey/input-parameter preflight;
- real hotkey and parameter playback;
- toggle-expression lifecycle and neutral reset on a real rig;
- visual quality at full and Teams-tile size;
- recording, OBS virtual camera, audio routing, and Teams selection.

No document or status line claims those behaviours are complete.

## First assignment

Start with `M1-004` in `tasks/milestone-1-issues.md` and the bounded comparison in `docs/adr/0004-vtube-api-client-choice.md`. Choose either the in-repo thin client or `VTubeStudioJS`, then implement one authenticated/preflight path with automated protocol tests and manual macOS evidence.

In parallel, the avatar/rig work can start from `tasks/avatar-asset-track.md` without blocking the generic-model runtime path.
