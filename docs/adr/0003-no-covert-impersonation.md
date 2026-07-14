# ADR 0003 — No Covert Impersonation

## Status

Accepted.

## Context

The long-term idea involves a David-associated avatar and possibly voice. That creates an obvious risk of deceptive impersonation.

## Decision

The product is a disclosed AI delegate. It must not be designed to make meeting participants believe David is personally present when he is not.

## Consequences

Positive:

- clearer trust boundary;
- safer workplace use;
- better product framing;
- avatar can visibly communicate limits.

Negative:

- reduces the fantasy of a seamless fake meeting attendee;
- requires explicit disclosure in live use.

## Follow-up

Build disclosure affordances into live modes and keep `defer_to_human` / `boundary` states in the core vocabulary.
