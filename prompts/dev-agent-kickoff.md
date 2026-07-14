# Dev Agent Kickoff Prompt

You are continuing the AI Delegate Avatar repository.

Read `AGENTS.md` and `STATUS.md` first. Then read the Milestone 1 specification, architecture, control schema, rigging spec, and issue breakdown.

Run this baseline before making changes:

```bash
npm install
npm run check
npm run demo:dry
npm run demo:mapping
```

The recommended next issue is M1-004: authenticated VTube Studio session and preflight. Start with the bounded comparison in `docs/adr/0004-vtube-api-client-choice.md`, then record the decision; do not build and maintain both clients.

Your objective is the smallest truthful step toward actual model playback. A command that only logs intended commands must not be named or documented as though it animates VTube Studio.

Preserve these boundaries:

- planner emits semantics, not raw curves;
- rig-specific IDs stay outside plan JSON;
- dry-run/test paths work without VTube;
- current milestone excludes Teams, voice, transcription, RAG, and photorealism;
- reset/cancellation and structured logs are mandatory, not polish.

Every PR must include the issue advanced, commands run, tests, manual VTube evidence where relevant, rig assumptions, and remaining limitations.
