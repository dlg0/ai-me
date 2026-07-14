# Project Objective and Intent

## One-sentence objective

Build a clearly disclosed, stylised AI delegate avatar whose communicative mannerisms can be planned by an AI agent, rendered deterministically, reviewed offline, and eventually used as a bounded interface in live meetings.

## Why this project exists

Most meeting agents expose only words. They do not visibly distinguish:

- listening from waiting to speak;
- known facts from inference;
- confidence from uncertainty;
- a summary from a recommendation;
- an answer from a decision David must make.

A deliberately stylised avatar can make those states legible without pretending to be a live webcam feed. The avatar is therefore not decoration: it is an interface for the agent's conversational, epistemic, and authority state.

## Primary hypothesis

A small expressive vocabulary plus deterministic animation mapping will produce more believable and trustworthy behaviour than either:

- raw LLM-generated parameter curves; or
- a black-box photorealistic talking head.

The AI planner should decide:

- conversational state;
- speech act;
- attention target;
- affect/epistemic stance;
- emphasis and gesture requests;
- when to stay still;
- when to defer or refuse.

The runtime should decide:

- exact curves and easing;
- transition timing;
- blink and idle cadence;
- collision/conflict resolution;
- gesture rate limits;
- renderer-specific parameter values;
- neutral reset and control release.

## Initial product shape

```text
High-level brief or meeting state
        ↓
Planner-generated semantic plan
        ↓
Schema + semantic diagnostics
        ↓
Mannerism runtime
        ↓
Rig profile + renderer adapter
        ↓
Local SVG avatar for Milestone 1
        ↓
Review recording, then later OBS/Teams
```

The first deliverable is a reviewable offline animation in a self-contained local player. VTube Studio/Live2D remains a deferred future renderer and asset path. The larger product may become a local or independently visible AI meeting delegate.

## Parallel workstreams

### Runtime and behaviour

Build validation, mapping, playback, review artefacts, and eventually planning/live context.

### Avatar artwork and rigging

For Milestone 1, create a small first-party SVG avatar and publish a versioned `local_svg` rig profile. A later, policy-approved asset track may take an existing avatar or illustration, separate/redraw expressive parts, rig them in Live2D, configure VTube Studio inputs/hotkeys, and publish its own rig profile.

These workstreams meet at the rig profile. Neither should embed assumptions that make the other impossible to change.

## Review-driven iteration loop

The longer-term research loop is not merely “LLM writes JSON once.” It is:

```text
scene brief
  -> one or more candidate semantic plans
  -> deterministic renders + logs
  -> human review and, later, vision-assisted review
  -> attribution of defects to plan / runtime / rig / capture
  -> revised plan or mapping
  -> comparable replay
```

The system should preserve every candidate and review decision so an agent can learn which mannerisms David prefers without turning subjective feedback into untraceable prompt edits. Early iterations remain human-reviewed; later automation may propose changes, but it must not silently alter the rig, safety boundary, or authority policy.

## Target users

### David

Owns the delegate persona and reviews whether its behaviour feels useful, recognisable, restrained, and appropriately bounded.

### Developer agents

Need bounded implementation tasks, executable checks, and a truthful source of current status.

### Future meeting participants

Must be able to tell whether they are interacting with David, David's AI delegate, a notetaker, or an offline prototype.

## Definition of success

### First milestone

A reviewer opens a self-contained local HTML/SVG player, watches a 20–45 second animation generated from an inspectable semantic plan at approximately 320px, and can correctly identify:

- listening;
- thinking;
- mild agreement;
- uncertainty/caveat;
- a qualified-answer segment;
- deferral to David.

The player works without network access, an external application, or licensed model assets and identifies itself as an offline AI-delegate prototype for the full duration.

### Larger project

The avatar helps people understand the agent's state and limits more clearly than text or voice alone, while remaining operationally useful in meetings.

## Explicit boundary

The project may later use a David-associated likeness and authorised synthetic voice, but it must remain a disclosed AI delegate. It must not be designed to make participants believe David personally attended, spoke, agreed, or committed when he did not.
