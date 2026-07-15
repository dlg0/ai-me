# Controller Package

TypeScript package for validating semantic animation plans, checking rig profiles, inspecting renderer mappings, and running the completed Milestone 1 local SVG playback loop. The VTube Studio client is an archival scaffold and is not on the active roadmap.

## Run from repository root

```bash
npm install
npm run check
npm run demo:dry
npm run demo:mapping
npm run --silent demo:render-script > /tmp/render-script.jsonl
npm run demo:player
npm run --silent evaluate:scenarios
```

## Archival VTube connectivity probe

With VTube Studio running and **Allow Plugin API access** enabled:

```bash
npm run probe:vtube --workspace @ai-delegate-avatar/controller
```

Set `VTS_HOST` or `VTS_PORT` to override `localhost:8001`.

The probe only checks the WebSocket/API state. It does not authenticate or move the model and is retained for historical reference, not as active work.

## Implemented

- Draft 2020-12 JSON Schema validation;
- semantic diagnostics for bounds, duplicate IDs, state overlap/gaps, gesture density, speech/state mismatch, final reset, and disclosure overlay;
- ordered dry-run timeline;
- discriminated local SVG/VTube rig-profile validation;
- renderer-neutral semantic controls and local SVG/VTube mapping inspection;
- pure deterministic `render-script.v1` JSONL compilation with fixed-tick easing, cancellation reset, and terminal invariants;
- strict local-SVG frame resolution and deterministic self-contained HTML/SVG player generation;
- durable local-SVG run bundles and completed visual review;
- archival thin VTube protocol client scaffold.

## Not implemented

- programmatic planner/provider integration;
- automatic recording, TTS, or Teams integration.

VTube authentication, model preflight, hotkey playback, and parameter injection were closed as superseded rather than implemented.

## Live raw planner smoke test

`npm run planner:smoke -- <scenario-id>` makes one live OpenAI Responses API request and spends API quota. Set `OPENAI_API_KEY` and an explicit `OPENAI_MODEL`; `OPENAI_BASE_URL` and `OPENAI_TIMEOUT_MS` are optional. It prints JSON provenance plus genuinely raw, unvalidated model text. It does not extract, validate, repair, persist, or render a plan, and is intentionally excluded from `npm run check`.
