# Agent Handoff Guide

## Mission

Complete the first offline local SVG playback loop for a disclosed, stylised AI delegate.

## Source of truth

Read `STATUS.md` before selecting work. Planning files describe intended capabilities; only the status table, tests, and manual VTube evidence establish completion.

## Required reading order

1. `AGENTS.md`
2. `OBJECTIVE.md`
3. `STATUS.md`
4. `docs/MILESTONE_1_OFFLINE_RENDER.md`
5. `docs/ARCHITECTURE.md`
6. `docs/CONTROL_SCHEMA.md`
7. `docs/RIGGING_SPEC.md`
8. `tasks/milestone-1-issues.md`

## Baseline verification

```bash
npm install
npm run check
npm run demo:dry
npm run demo:mapping
```

Do not begin implementation until the baseline passes. Do not weaken tests or schema rules to make a change pass.

## Recommended next assignment

Implement ADR 0005's current critical path: `local_svg` rig profile → deterministic fixed-tick abstract render script → self-contained `file://` HTML/SVG player → restrained mapping → durable artifacts → review/replay. None of these SVG capabilities has visual completion evidence yet.

## Parallel asset assignment

A separate agent/artist can progress `tasks/avatar-asset-track.md` using `docs/ASSET_PIPELINE.md`. Runtime work must remain testable with a generic Live2D model.

## Optimise for

- minimal end-to-end progress;
- deterministic/replayable behaviour;
- actionable local failures;
- structured logs;
- calm visual output;
- strict separation between semantics, runtime, rig profile, and VTube protocol;
- safe reset/cancellation.

## Do not optimise for yet

- perfect visual realism;
- synthetic voice;
- autonomous meetings;
- Teams bot infrastructure;
- large configuration UI;
- automatic rigging;
- broad framework abstractions.

## PR evidence

Each implementation PR must include:

1. milestone issue and acceptance criteria addressed;
2. exact commands run;
3. automated test result;
4. manual VTube test steps/results where relevant;
5. model/rig assumptions;
6. sample log or screenshot for user-visible behaviour;
7. remaining limitations and deliberately excluded scope.
