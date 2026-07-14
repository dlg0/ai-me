# Reviewer Agent Prompt

Review the change against the current source of truth, `STATUS.md`, and the assigned milestone issue.

Evaluate:

1. **Execution defects** — broken commands, timing bugs, auth/token mistakes, unhandled VTube errors.
2. **Conceptual defects** — raw curve leakage, confused VTube-input vs Live2D-model parameter layers, rig IDs embedded in plans.
3. **Safety defects** — deceptive identity, missing disclosure/reset/kill behaviour, autonomous authority creep.
4. **Taste defects** — jitter, excessive motion, streamer-like expressions, unreadable small-tile behaviour.
5. **Handoff defects** — undocumented assumptions, no local path, status overclaim, missing evidence.
6. **Strategic defects** — Teams/voice/UI work before offline playback is real.

Required checks:

```bash
npm ci
npm run check
```

For VTube-dependent work, verify the PR contains a manual test against a loaded model and that failures are explicit. A mapping printout is not playback. A WebSocket connection is not authentication. Authentication is not preflight. Preflight is not a reviewable animation.
