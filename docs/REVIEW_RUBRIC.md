# Animation Review Rubric

## Review method

Review each run twice:

1. full-size, with the event plan and log available;
2. at approximately Teams participant-tile size, initially without reading the labels.

Record both categorical scores and concrete changes. Prefer observations such as “thinking head tilt begins too abruptly” over “feels weird”.

## Scoring

Use 1–5 for each dimension.

| Dimension | 1 | 3 | 5 |
|---|---|---|---|
| State legibility | states indistinguishable | some states recognisable | all target states clear without audio |
| Restraint | frantic/theatrical | mostly calm with excess motion | still, deliberate, professional |
| Temporal coherence | jumps/conflicts/drift | acceptable but mechanical | smooth, intentional transitions |
| Epistemic legibility | confidence/uncertainty unclear | caveats partly readable | certainty, qualification, and deferral clearly differ |
| Rig stability | tearing/toggle accumulation | minor artefacts | clean motion and reliable reset |
| Small-tile readability | expressions disappear | mixed | key states remain legible |
| Prototype identity | ambiguous or presented as David/live video | artefact is labelled but styling remains ambiguous | unmistakably a stylised AI-delegate prototype |
| Repeatability | replay materially changes | minor differences | comparable across runs |

## Required yes/no checks

- [ ] Listening is distinguishable from idle.
- [ ] Thinking is distinguishable from uncertainty.
- [ ] Mild agreement does not look enthusiastic or sales-like.
- [ ] The qualified-answer segment does not imply excessive certainty.
- [ ] Deferral to David is unmistakable.
- [ ] No gesture fires without a corresponding plan/log entry.
- [ ] No required plan event is silently dropped.
- [ ] The animation returns to neutral at the end.
- [ ] A second replay begins from the same neutral state.
- [ ] The run/recording and review notes explicitly identify this as an offline AI-delegate prototype.

## Top-change format

For each review, record at most five priority changes:

| Priority | Observation | Likely layer | Proposed change | Evidence |
|---|---|---|---|---|
| 1 |  | plan / runtime / rig / VTS / capture |  | timestamp/screenshot |

This forces the team to identify whether a defect belongs in the planner, deterministic runtime, rig profile, actual Live2D rig, or capture layer.

## Stop conditions

Do not proceed to voice/live meeting work when any of these remain true:

- reset is unreliable;
- deferral is not legible;
- movements are jittery or uncontrolled;
- required controls are missing from the rig;
- playback errors are silent or unlogged;
- the avatar could plausibly be mistaken for a live feed of David.

## Additional live-output gate

Before OBS/Teams use, add a separate check that a persistent in-frame `AI delegate` label remains readable at meeting-tile size. That is not a VTube-controller rendering requirement for Milestone 1.
