# Dev Agent Kickoff Prompt

You are continuing the AI Delegate Avatar repository.

Read `AGENTS.md`, `STATUS.md`, and `ROADMAP.md` first. Then read the architecture, control schema, planner prompt, and scenario briefs.

Run this baseline before making changes:

```bash
npm install
npm run check
npm run demo:dry
npm run demo:mapping
```

Milestone 1 is complete. The recommended next assignment is the smallest provider-independent Phase 2 slice: turn the existing planner prompt and scenario briefs into an executable evaluation contract before adding an LLM provider.

Your objective is to establish a held-out corpus and deterministic acceptance report for candidate `animation-plan.v1` files using the existing schema and semantic diagnostics. Do not add network calls, provider credentials, prompt repair, or renderer changes in the first slice.

Preserve these boundaries:

- planner emits semantics, not raw curves;
- rig-specific IDs stay outside plan JSON;
- evaluation and rendering paths remain offline and deterministic;
- the current phase excludes Teams, voice, transcription, RAG, and photorealism;
- reset/cancellation and structured logs are mandatory, not polish.

The old VTube issues are closed as superseded; its scaffold is archival reference, not a current assignment. Every PR must include the issue advanced, commands run, tests, rig assumptions, and remaining limitations.
