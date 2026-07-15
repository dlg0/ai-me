# Agent Instructions

## Mission

Maintain and extend the completed deterministic, first-party local SVG review loop. The next active target is the offline Phase 2 planner iteration loop, not autonomous attendance in Microsoft Teams. VTube Studio is not on the active roadmap: its old issues are closed as superseded and its scaffold is archival reference only. Do not bypass organizational policy or restart that work without a fresh decision.

## Read first

1. `OBJECTIVE.md`
2. `STATUS.md`
3. `ROADMAP.md`
4. `docs/ARCHITECTURE.md`
5. `docs/CONTROL_SCHEMA.md`
6. `docs/MILESTONE_1_OFFLINE_RENDER.md`
7. `tasks/milestone-1-issues.md`

## Mandatory local checks

From the repository root:

```bash
npm install
npm run check
npm run demo:dry
```

Do not claim a task is complete unless `npm run check` passes. Any future external-renderer task requires a fresh approved scope and documented manual evidence from the actual renderer.

## Architecture invariants

- The planner emits communicative intent, never raw frame-by-frame curves.
- Renderer-specific IDs belong in a rig profile or renderer adapter, not in animation plans.
- The runtime owns easing, smoothing, rate limits, conflict resolution, and neutral reset.
- Offline/dry-run paths must work without VTube Studio, OBS, Teams, an LLM API key, or network access.
- Live behaviour must remain clearly framed as an AI delegate rather than David personally attending.

## Scope boundary

Do not add Teams attendance, synthetic voice, meeting transcription, RAG, or photorealistic rendering before the Phase 2 planner iteration loop is measurable and reviewable. OBS/Teams are downstream output plumbing, not the current core problem.

## Current implementation boundary

Milestone 1 is complete: schema validation, semantic diagnostics, dry-run playback, the `local_svg` profile, deterministic render scripts, the self-contained player, durable run artifacts, and comparable visual review are implemented. Programmatic planner/provider integration, candidate evaluation, and repair are not implemented. The unauthenticated VTube client is an archival scaffold, not an active assignment. Consult `STATUS.md`; do not infer completion from the presence of a source file.

## Pull-request standard

Each PR must state:

1. the Beads issue advanced;
2. the user-visible capability added;
3. exact local test steps;
4. assumptions about the rig/renderer setup;
5. remaining limitations and non-goals.

<!-- BEGIN BEADS INTEGRATION v:1 profile:minimal hash:6cd5cc61 -->
## Beads Issue Tracker

This project uses **bd (beads)** for issue tracking. Run `bd prime` to see full workflow context and commands.

### Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --claim  # Claim work
bd close <id>         # Complete work
```

### Rules

- Use `bd` for ALL task tracking — do NOT use TodoWrite, TaskCreate, or markdown TODO lists
- Run `bd prime` for detailed command reference and session close protocol
- Use `bd remember` for persistent knowledge — do NOT use MEMORY.md files

**Architecture in one line:** issues live in a local Dolt DB; sync uses `refs/dolt/data` on your git remote; `.beads/issues.jsonl` is a passive export. See https://github.com/gastownhall/beads/blob/main/docs/SYNC_CONCEPTS.md for details and anti-patterns.

## Agent Context Profiles

The managed Beads block is task-tracking guidance, not permission to override repository, user, or orchestrator instructions.

- **Conservative (default)**: Use `bd` for task tracking. Do not run git commits, git pushes, or Dolt remote sync unless explicitly asked. At handoff, report changed files, validation, and suggested next commands.
- **Minimal**: Keep tool instruction files as pointers to `bd prime`; use the same conservative git policy unless active instructions say otherwise.
- **Team-maintainer**: Only when the repository explicitly opts in, agents may close beads, run quality gates, commit, and push as part of session close. A current "do not commit" or "do not push" instruction still wins.

## Session Completion

This protocol applies when ending a Beads implementation workflow. It is subordinate to explicit user, repository, and orchestrator instructions.

1. **File issues for remaining work** - Create beads for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **Handle git/sync by active profile**:
   ```bash
   # Conservative/minimal/default: report status and proposed commands; wait for approval.
   git status

   # Team-maintainer opt-in only, unless current instructions forbid it:
   git pull --rebase
   git push
   git status
   ```
5. **Hand off** - Summarize changes, validation, issue status, and any blocked sync/commit/push step

**Critical rules:**
- Explicit user or orchestrator instructions override this Beads block.
- Do not commit or push without clear authority from the active profile or the current user request.
- If a required sync or push is blocked, stop and report the exact command and error.
<!-- END BEADS INTEGRATION -->

<!-- BEGIN BEADS CODEX SETUP: generated by bd setup codex -->
## Beads Issue Tracker

Use Beads (`bd`) for durable task tracking in repositories that include it. Use the `beads` skill at `.agents/skills/beads/SKILL.md` (project install) or `~/.agents/skills/beads/SKILL.md` (global install) for Beads workflow guidance, then use the `bd` CLI for issue operations.

### Quick Reference

```bash
bd ready                # Find available work
bd show <id>            # View issue details
bd update <id> --claim  # Claim work
bd close <id>           # Complete work
bd prime                # Refresh Beads context
```

### Rules

- Use `bd` for all task tracking; do not create markdown TODO lists.
- Run `bd prime` when Beads context is missing or stale. Codex 0.129.0+ can load Beads context automatically through native hooks; use `/hooks` to inspect or toggle them.
- Keep persistent project memory in Beads via `bd remember`; do not create ad hoc memory files.

**Architecture in one line:** issues live in a local Dolt DB; sync uses `refs/dolt/data` on your git remote; `.beads/issues.jsonl` is a passive export. See https://github.com/gastownhall/beads/blob/main/docs/SYNC_CONCEPTS.md for details and anti-patterns.
<!-- END BEADS CODEX SETUP -->
