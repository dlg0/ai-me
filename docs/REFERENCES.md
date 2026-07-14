# Technical References

Checked: 14 July 2026.

Prefer these primary/official sources when implementation details conflict with prose in this repository.

## VTube Studio

- Official public API development page: https://github.com/DenchiSoft/VTubeStudio
- Official site/documentation entry: https://denchisoft.com/
- VTubeStudioJS, listed by the official API page: https://github.com/Hawkbat/VTubeStudioJS

Implementation facts to verify against the official API page:

- default local endpoint is `ws://localhost:8001`, but port is configurable;
- the user must enable **Allow Plugin API access**;
- plugins request an authentication token once and authenticate each session with it;
- plugin name/developer values must match between token and authentication requests;
- hotkeys can be triggered by unique ID or case-insensitive name;
- available current-model hotkeys can be listed before playback, including type/backing-file/unique-ID metadata;
- duplicate hotkey names are ambiguous because triggering by name executes only the first match;
- available VTube input/tracking parameters can be listed before playback;
- injected values target VTube input parameters, not arbitrary raw Live2D model parameters;
- an injected parameter must be resent at least once per second while the plugin retains control;
- `set` mode is exclusive per parameter, while `add` mode has different composition semantics;
- `faceFound` is optional injection metadata and should not be asserted accidentally;
- expression state and direct activation/deactivation APIs are available when an adapter needs explicit expression lifecycle control;
- VTube API errors include request IDs/error details that should be preserved in logs.

## OBS

- Virtual Camera Guide: https://obsproject.com/kb/virtual-camera-guide
- Virtual Camera Troubleshooting/macOS compatibility: https://obsproject.com/kb/virtual-camera-troubleshooting
- macOS Permissions Guide: https://obsproject.com/kb/macos-permissions-guide

Implementation notes:

- OBS Virtual Camera exposes an OBS scene/source/program as a webcam input;
- modern macOS uses a camera extension that may require approval in System Settings;
- use a current OBS release on modern macOS.

## Microsoft Teams

- Teams real-time media concepts: https://learn.microsoft.com/en-us/microsoftteams/platform/bots/calls-and-meetings/real-time-media-concepts
- Application-hosted media bot requirements/considerations: https://learn.microsoft.com/en-us/microsoftteams/platform/bots/calls-and-meetings/requirements-considerations-application-hosted-media-bots

Implementation note:

Formal application-hosted media bots are a materially different production architecture from selecting an OBS virtual camera in the desktop client. Treat the formal route as a later feasibility/governance decision.
