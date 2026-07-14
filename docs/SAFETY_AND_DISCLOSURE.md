# Safety and Disclosure

## Product boundary

This project is for a disclosed AI delegate avatar, not a covert impersonator.

The system should never join a meeting in a way that causes participants to reasonably believe David is personally present if he is not.

## Required disclosure affordances

For live use, at least one of these should always be present:

- participant display name: `David's AI Delegate`;
- visible overlay: `AI delegate`;
- spoken introduction: `I'm David's AI delegate...`;
- chat message at meeting join explaining role and limits.

## Required capability boundaries

The delegate must be able to say or visibly indicate:

- I can summarise.
- I can answer from approved notes.
- I cannot make commitments.
- David needs to confirm that.
- I do not have enough context.
- I should not answer that.

## Forbidden modes

Do not implement:

- covert attendance;
- silent impersonation;
- undisclosed synthetic voice use;
- photorealistic attempt to pass as webcam video;
- autonomous commitments on David's behalf;
- private/confidential disclosure without explicit permission;
- unlogged live utterances.

## First milestone implications

Milestone 1 is offline review only, so safety mainly means:

- generated plans must not include deceptive labels;
- generated plans should include AI-delegate framing;
- boundary/deferral expressions must be part of the vocabulary;
- the scaffold should not encourage hidden Teams use.

The Milestone 1 `overlays` track remains disclosure/capture metadata rather than an avatar-control command. The local HTML/SVG player must draw the AI-delegate disclosure for the full duration, and the run manifest and review notes must also identify the result as an offline prototype. A future VTube/OBS path must independently prove that its live composition preserves the disclosure.

## Later live-mode requirements

Before any live meeting mode:

- human approval gate for speech;
- visible AI-delegate label;
- kill switch;
- reset-to-neutral command;
- audit log;
- policy rules for commitments and confidential information;
- clear instructions for meeting participants.

## Recommended default introduction

> I am David's AI delegate. I can help summarise and answer bounded factual questions from approved context, but I cannot make commitments or decisions for David.

## Design philosophy

The avatar should communicate limits, not hide them. Showing uncertainty is a feature.
