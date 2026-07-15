# Teams Integration Plan

## First live path — local virtual camera

After offline playback is stable:

```text
Local renderer supplies the avatar scene
        ↓
OBS captures/composes the scene
        ↓
OBS adds persistent AI-delegate disclosure
        ↓
OBS Virtual Camera
        ↓
Teams camera selection
```

This part is commodity plumbing compared with the mannerism controller. OBS already exposes scenes as virtual cameras; the project should configure it rather than build a video driver.

## Important identity distinction

A local virtual camera appears within the account/device that joins the meeting. It is not an independently addressable Teams participant. The display name and spoken/chat disclosure still need to make clear when the delegate—not David—is acting.

## Later audio path

When speech is added:

```text
approved text
  -> authorised TTS/recorded voice
  -> local virtual-audio device
  -> Teams microphone selection
```

Video and audio cancellation must be coordinated, and a human kill switch must stop both.

## Why formal Teams bots are deferred

A visible Teams app/bot may eventually offer cleaner participant identity, tenancy governance, and auditability, but it adds permissions, hosting, media infrastructure, organisational approval, and operational burden. That decision should be based on evidence that the local avatar/meeting behaviour is valuable.

## Candidate future modes

### A. Local sidecar/delegate mode

David joins from the Mac and selects the OBS delegate feed. Speech remains operator-approved.

Best for early testing; lowest infrastructure; not an independent attendee.

### B. Independent visible Teams app/bot

A separately named `David's AI Delegate` joins under organisational controls.

Potentially cleaner identity and policy boundaries; substantially higher technical and governance complexity.

### C. Transcript/chat assistant only

No live avatar participant; the system consumes approved meeting artefacts and provides summaries/actions.

Lowest impersonation risk, but does not test the expressive-avatar hypothesis.

## Staged integration gates

1. Offline plan playback and reliable reset.
2. Review clip passes visual rubric.
3. Local event-driven controller and human overrides.
4. OBS scene and disclosure overlay.
5. Dummy Teams call with no synthetic voice.
6. Human-approved audio test.
7. Meeting-aware bounded responses.
8. Formal bot feasibility only after governance review.

## Required live safeguards

- persistent visible AI-delegate label;
- participant/display-name disclosure where possible;
- first-utterance disclosure;
- stop/kill command that halts audio and motion;
- forced neutral/blank fallback;
- no autonomous commitments;
- no unlogged utterances;
- approved-context boundary;
- clear operator state.
