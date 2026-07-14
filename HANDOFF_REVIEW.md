# Final Handoff Review

> Historical note: this review records the pre-pivot scaffold handoff. ADR 0005 and `STATUS.md` now define a policy-safe local SVG critical path; the VTube recommendation below is deferred because organizational IT blocks installation.

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
