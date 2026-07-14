# ADR 0002 — LLM Controls Intent, Runtime Controls Curves

## Status

Accepted.

## Context

LLMs are good at selecting communicative intent and poor at maintaining frame-by-frame animation consistency. Directly asking an LLM to output raw parameter curves would produce jitter, verbosity, and poor taste.

## Decision

The planner emits semantic animation events: states, speech acts, attention targets, affect values, and gesture requests. The deterministic runtime converts those events into parameter curves and renderer commands.

## Consequences

Positive:

- easier validation;
- easier review;
- lower risk of jitter;
- renderer independence;
- better taste control.

Negative:

- the runtime needs a handcrafted mapping layer;
- expressivity is initially limited by the vocabulary.

## Follow-up

Build a small vocabulary first, then expand only after review.
