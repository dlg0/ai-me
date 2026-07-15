# Planner candidate sets

Generate two to five independently orchestrated candidates for one corpus scenario:

```bash
OPENAI_API_KEY=... OPENAI_MODEL=... npm run planner:candidates -- \
  examples/scenario-corpus.v1.json qualified-answer 3 runs/planner-candidates
```

This is an explicitly live command: every candidate (and any repair attempt) calls OpenAI and spends provider quota. It does not render a player. Exit status is `0` for complete success, `2` for a partial set, and `1` for failed/cancelled setup or generation. Once a set directory is created it is never overwritten; successful, invalid, provider-failed, and cancelled attempt evidence is retained.

Layout:

```text
<output-root>/<set-id>/
  manifest.json             version, ordered candidates, counts, checksums
  scenario.json             selected scenario contract
  prompt.txt                exact initial rendered prompt
  attempts/<candidate>.json complete orchestration result and provenance
  plans/<candidate>.json    canonical validated plan (successes only)
```

The output root should be ignored (the repository's `runs/` root is ignored). Manifests contain provider/model/request metadata but no provider credentials. Raw provider provenance and bounded failure messages are preserved exactly in attempt files. Every provider adapter must sanitize credentials and secrets from both returned response provenance and thrown errors before they cross the provider-neutral boundary.

Diff two successful candidates, or paths relative to the set directory, entirely offline:

```bash
npm run planner:diff -- runs/planner-candidates/<set-id> \
  candidate-1-abc candidate-2-def runs/planner-candidates/comparison
```

This writes `<output-prefix>.json` and `<output-prefix>.md`. The semantic diff ignores model event IDs, event reasons, and planner notes; it never compiles frames or reads a rig profile.
