# Controller Package

TypeScript scaffold for validating semantic animation plans, checking rig profiles, inspecting renderer mappings, and building the Milestone 1 local SVG playback runtime. The VTube Studio client remains a deferred future-adapter scaffold.

## Run from repository root

```bash
npm install
npm run check
npm run demo:dry
npm run demo:mapping
```

## Optional VTube connectivity probe

With VTube Studio running and **Allow Plugin API access** enabled:

```bash
npm run probe:vtube --workspace @ai-delegate-avatar/controller
```

Set `VTS_HOST` or `VTS_PORT` to override `localhost:8001`.

The probe only checks the WebSocket/API state. It does not authenticate or move the model.

## Implemented

- Draft 2020-12 JSON Schema validation;
- semantic diagnostics for bounds, duplicate IDs, state overlap/gaps, gesture density, speech/state mismatch, final reset, and disclosure overlay;
- ordered dry-run timeline;
- discriminated local SVG/VTube rig-profile validation;
- renderer-neutral semantic controls and local SVG/VTube mapping inspection;
- thin VTube protocol client scaffold.

## Not implemented

- persisted VTube authentication session;
- timed playback scheduler;
- easing/interpolation loop;
- repeated parameter injection;
- hotkey/parameter preflight against the loaded model;
- run artefact folders;
- recording, TTS, Teams, or LLM API integration.
