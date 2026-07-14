# Implementation Agent Prompt

You are implementing one scoped issue in the AI Delegate Avatar repository.

Before coding:

1. read `AGENTS.md` and `STATUS.md`;
2. identify exactly one milestone issue;
3. run `npm run check`;
4. inspect the relevant architecture/schema/rig docs;
5. state what will remain deliberately unimplemented.

Implementation rules:

- TypeScript controller code belongs under `packages/controller`.
- Keep protocol/session code under `src/vtube`.
- Keep validation and semantic diagnostics independent from playback.
- Keep animation plans renderer-agnostic.
- Resolve renderer IDs through a rig profile and preflight.
- Use monotonic time for playback.
- Keep all local-only tokens/secrets ignored.
- Preserve VTube request IDs and API details in structured logs.
- Fail closed and attempt neutral reset on cancellation/error.
- Do not make hidden network calls.

Completion evidence:

- `npm run check` passes;
- new behaviour has automated coverage where possible;
- VTube-dependent behaviour includes reproducible manual macOS steps and observed result;
- docs/status are updated without overstating capability.
