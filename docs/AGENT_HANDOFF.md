# Agent Handoff Guide

## Mission

Build the next bounded planner-iteration capability on top of the completed offline local SVG playback loop.

## Source of truth

Read `STATUS.md` before selecting work. Planning files describe intended capabilities; only the status table, tests, and recorded review evidence establish completion.

## Required reading order

1. `AGENTS.md`
2. `OBJECTIVE.md`
3. `STATUS.md`
4. `ROADMAP.md`
5. `docs/ARCHITECTURE.md`
6. `docs/CONTROL_SCHEMA.md`
7. `prompts/animation-planner.md`
8. `examples/scenario-briefs.md`

## Baseline verification

```bash
npm install
npm run check
npm run demo:dry
npm run demo:mapping
```

Do not begin implementation until the baseline passes. Do not weaken tests or schema rules to make a change pass.

## Recommended next assignment

Milestone 1's local SVG path is complete. Scope the first Phase 2 issue around a provider-independent planner evaluation contract: a versioned brief corpus, deterministic candidate validation report, and held-out acceptance metrics. Add a provider adapter only after that contract is reviewable.

The old VTube and Live2D tasks are closed as superseded. Their documents remain archival reference only and are not parallel assignments.

## Optimise for

- minimal end-to-end progress;
- deterministic/replayable behaviour;
- actionable local failures;
- structured logs;
- calm visual output;
- strict separation between semantics, runtime, rig profile, renderer, and future provider adapters;
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
4. model/rig and provider assumptions;
5. sample report, log, or screenshot for user-visible behaviour;
6. remaining limitations and deliberately excluded scope.
