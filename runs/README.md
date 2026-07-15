# Generated Review Runs

Create an ignored, non-overwriting review bundle with `npm run demo:run`:

```text
runs/<run-id>/
├── manifest.json
├── plan.json
├── rig-profile.json
├── validation-diagnostics.json
├── render-script.jsonl
├── renderer-log.jsonl
├── review-notes.md
└── player.html
```

The manifest exposes optional recording path/checksum fields if a reviewer later attaches a capture. Completed, cancelled, failed, and unexpectedly incomplete attempts are retained with exact source copies and available diagnostics.

Do not commit recordings, logs, tokens, or private meeting/avatar material by default. Share selected artefacts through approved storage when review requires them.
