# Reviewer Agent Prompt

Review the change against the current source of truth, `STATUS.md`, and the assigned Beads issue.

Evaluate:

1. **Execution defects** — broken commands, timing bugs, extraction/validation mistakes, unhandled provider errors.
2. **Conceptual defects** — raw curve leakage, provider/renderer coupling, rig IDs embedded in plans.
3. **Safety defects** — deceptive identity, missing disclosure/reset/kill behaviour, autonomous authority creep.
4. **Taste defects** — jitter, excessive motion, streamer-like expressions, unreadable small-tile behaviour.
5. **Handoff defects** — undocumented assumptions, no local path, status overclaim, missing evidence.
6. **Strategic defects** — Teams/voice/UI work before offline playback is real.

Required checks:

```bash
npm ci
npm run check
```

For user-visible work, verify the PR contains direct review evidence and explicit failures. A valid model response is not necessarily a valid plan; a valid plan is not necessarily a preferable animation.
