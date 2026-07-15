# Implementation Agent Prompt

You are implementing one scoped issue in the AI Delegate Avatar repository.

Before coding:

1. read `AGENTS.md` and `STATUS.md`;
2. identify exactly one Beads issue;
3. run `npm run check`;
4. inspect the relevant architecture/schema/rig docs;
5. state what will remain deliberately unimplemented.

Implementation rules:

- TypeScript controller code belongs under `packages/controller`.
- Keep provider/session code separate from planner contracts and renderers.
- Keep validation and semantic diagnostics independent from playback.
- Keep animation plans renderer-agnostic.
- Resolve renderer IDs through a rig profile and adapter.
- Use monotonic time for playback.
- Keep all local-only tokens/secrets ignored.
- Preserve provider request IDs and error details in structured logs when a provider is introduced.
- Fail closed and attempt neutral reset on cancellation/error.
- Do not make hidden network calls.

Completion evidence:

- `npm run check` passes;
- new behaviour has automated coverage where possible;
- docs/status are updated without overstating capability.
