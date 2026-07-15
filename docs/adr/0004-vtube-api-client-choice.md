# ADR 0004 — VTube API Client Choice

## Status

Closed without a client decision; superseded by [ADR 0005](0005-local-svg-renderer.md) and the completed local SVG path. This is archival comparison material, not active work.

## Context

The repository contains a small, tested WebSocket protocol client scaffold. The VTube Studio documentation also lists the TypeScript/JavaScript `VTubeStudioJS` library, whose `ApiClient` provides typed API methods, authentication-token hooks, connection management, and reconnection.

Maintaining both would create duplicate authentication, protocol, and error-handling paths. M1-004 must choose one production path before adding session/preflight behaviour.

## Options

### A. Adopt `VTubeStudioJS`

Advantages:

- typed request/response surface;
- built-in authentication and reconnection flow;
- less custom protocol code;
- library is linked from the official VTube Studio API documentation.

Risks:

- request/logging hooks may need wrappers;
- reconnect semantics must be tested against deterministic playback/cancellation;
- the project depends on a community-maintained package.

### B. Extend the in-repo thin client

Advantages:

- complete control of request IDs, structured logs, timeouts, and failure semantics;
- existing mock-WebSocket tests;
- no additional protocol abstraction.

Risks:

- project must implement and maintain authentication, reconnection, events, typing, and API evolution itself;
- more opportunity for subtle protocol defects.

## Decision criteria and spike

Implement the same narrow probe with each option:

1. connect to a configurable endpoint;
2. persist/reuse one authentication token;
3. report current model;
4. list current-model hotkeys and input parameters;
5. preserve actionable API error/request context;
6. demonstrate predictable close/reconnect behaviour;
7. show how raw requests/results enter the JSONL run log.

Use a generic Live2D test model. Record code size, wrapper complexity, observed behaviour, testability, and any hidden failure handling.

## Decision

No production client was selected or implemented. If an external-renderer direction is proposed later, make a fresh ADR and create newly scoped issues rather than reopening this decision. The existing thin client remains a non-production archival scaffold.
