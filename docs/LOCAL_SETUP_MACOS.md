# Local Setup on macOS

## Scope

This setup supports development and offline review. It does not configure synthetic voice or autonomous Teams attendance.

## Prerequisites

- macOS 13 or later; David's current Mac is suitable;
- Node.js 22 or later;
- VTube Studio desktop app;
- a Live2D model available to load;
- OBS Studio 30 or later for later capture/virtual-camera tests.

## Repository setup

```bash
git clone <repository-url>
cd ai-delegate-avatar
nvm use             # reads .nvmrc, if nvm is installed
npm install
npm run check
npm run demo:dry
npm run demo:mapping
```

The last two commands require no VTube installation and make no network calls.

## VTube Studio setup

1. Launch VTube Studio.
2. Load a known-good Live2D model.
3. Open VTube Studio settings.
4. Enable **Allow Plugin API access**.
5. Confirm or note the configured WebSocket port; the default is `8001`.
6. Run the non-authenticated connectivity probe:

```bash
npm run probe:vtube --workspace @ai-delegate-avatar/controller
```

Override the endpoint when required:

```bash
VTS_HOST=localhost VTS_PORT=8001 \
  npm run probe:vtube --workspace @ai-delegate-avatar/controller
```

The probe should report API state and explicitly state that it has not authenticated or controlled the model.

## Authentication expectations for M1-004

The first authenticated command should trigger VTube Studio's user approval prompt. The implementation must store the returned token in an ignored local file and reuse it on later sessions. Never commit the token.

Suggested ignored location:

```text
packages/controller/.vts-token.json
```

The file should contain only the token plus the matching plugin name/developer metadata, with restrictive local permissions where practical.

## Model preflight

Before playback, the future preflight command should report:

- VTube version/API active status;
- current authentication status;
- loaded model name and ID;
- available hotkeys;
- available input parameters;
- missing rig-profile mappings;
- plan/rig ID match.

Do not discover missing controls for the first time halfway through playback.

## OBS setup for later phases

OBS Virtual Camera can expose an OBS scene as a webcam source. On modern macOS, the OBS camera extension may require approval in System Settings and an OBS restart.

For the first review clip, ordinary screen recording is acceptable. Virtual-camera setup is not required to complete the controller playback tasks.

Later scene outline:

```text
VTube Studio capture
+ persistent AI Delegate lower-third
+ optional status/debug overlay (hidden from final output)
-> OBS Virtual Camera
-> Teams test call
```

## Troubleshooting order

1. Does `npm run check` pass?
2. Is VTube Studio running?
3. Is Plugin API access enabled?
4. Is host/port correct?
5. Is a model fully loaded?
6. Was plugin access approved?
7. Does preflight find each required hotkey and parameter?
8. Is another plugin exclusively controlling the same injected parameter?
9. Does reset-neutral work manually in VTube Studio?

Capture exact API errors and request IDs in the run log rather than replacing them with a generic failure message.
