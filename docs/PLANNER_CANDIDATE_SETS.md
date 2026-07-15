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

## Ten-case acceptance runs

Run the held-out corpus through the same bounded orchestration sequentially:

```bash
OPENAI_API_KEY=... OPENAI_MODEL=... npm run planner:acceptance -- \
  examples/scenario-corpus.v1.json runs/planner-acceptance \
  prompts/animation-planner.md
```

This is opt-in and live; it may make up to two provider calls per scenario. The
CLI requires exactly 10 corpus cases and never prints or persists the API key.
It prints one compact JSON summary. Exit `0` means the 8/10 target was met,
exit `2` means a finalized run missed the target, and exit `1` means setup,
cancellation, or another operational failure. SIGINT/SIGTERM stops new calls
while preserving cancelled and unattempted slots.

```text
<output-root>/<run-id>/
  manifest.json                       run state, config, counts, artifact SHA-256 bindings
  corpus.json                         exact input bytes
  prompt-template.md                  exact input bytes
  prompts/<ordinal>-<scenario>.md     exact rendered initial prompts
  provenance/<ordinal>-<scenario>.json full typed initial/repair provenance
  plans/<ordinal>-<scenario>.json     canonical successful plans only
  animation-plan-candidates.json      planner-acceptance-candidates.v1 paths; failures are null
  animation-plan-evaluation.json      aggregate animation-plan-evaluation.v1 report
```

Provider/model and non-secret orchestration settings are evidence metadata.
Acceptance runs parse and validate the exact persisted corpus bytes, use safe
digest-suffixed filenames rather than raw scenario IDs, and reject response
provider/model/request identity mismatches before publishing a plan. Provider
config is limited to provider, model, retry/timeout bounds, and a normalized
credential/query-free HTTP(S) endpoint. Provider adapters must redact secrets
from errors and raw provenance. A baseline and any revised-prompt
comparison are separate immutable runs; do not alter or reuse the baseline
directory. This layer evaluates semantic plans only and performs no rendering,
ranking, or hand correction.

Diff two successful candidates, or paths relative to the set directory, entirely offline:

```bash
npm run planner:diff -- runs/planner-candidates/<set-id> \
  candidate-1-abc candidate-2-def runs/planner-candidates/comparison
```

This writes `<output-prefix>.json` and `<output-prefix>.md`. The semantic diff ignores model event IDs, event reasons, and planner notes; it never compiles frames or reads a rig profile.

## Offline side-by-side review

Render exactly two successful candidates with one matching first-party `local_svg` rig:

```bash
npm run planner:compare -- runs/planner-candidates/<set-id> \
  <left-candidate-id> <right-candidate-id> examples/rig-profile.local-svg.json runs/comparisons
```

The command is offline and keyless. It creates a non-overwriting comparison directory containing two complete nested local-SVG runs, semantic diff JSON/Markdown, `comparison.html`, a pending `review-record.json`, and a checksummed manifest. A top-level `sources/` directory preserves exact candidate-set manifest, prompt, scenario, plans, attempt provenance, and rig-profile bytes so the bundle is independently auditable. Every manifest artifact binding contains both its bundle-relative `path` and `sha256`. Open `comparison.html` directly with `file://`; its players are sandboxed `srcdoc` documents and global controls use one shared future start timestamp. At narrow widths the approximately 320px columns stack.

Complete the human-only rubric and preference (`left`, `right`, `tie`, or `no-preference`) in the page, then download the evidence-bound JSON record. The page does not infer scores or preferences. Provider calls, rig changes, frame compilation in planner code, capture, voice, and live-meeting integration are non-goals.

No audio is expected in this milestone: speech events only drive speaking and mouth-posture timing. If candidates look equivalent, equal anchored 1–5 scores and `no-preference` are valid; the reviewer may explicitly copy left scores to right and then adjust them. Required checks apply to pair-level stop, safety, and lifecycle behavior rather than preference differences.

Each embedded avatar displays its current semantic state as an on-avatar reference label for judging whether the visible expression and motion match.
