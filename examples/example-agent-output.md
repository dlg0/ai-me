# Example Planner Use

Use `prompts/animation-planner.md` with:

- Rig ID: `david_delegate_live2d_v0`
- Duration: `28000`
- Scene brief:

> The delegate listens, thinks, mildly agrees, gives a qualified answer, and visibly defers the final commitment to David. Keep the behaviour subtle and professional.

The expected output is JSON only and should resemble `example-animation-plan.json`.

Validate it from the repository root:

```bash
npm run validate:example
```

For a newly generated file:

```bash
npm run validate --workspace @ai-delegate-avatar/controller -- <path-to-plan.json>
```

The planner does not emit VTube parameter IDs or animation curves.
