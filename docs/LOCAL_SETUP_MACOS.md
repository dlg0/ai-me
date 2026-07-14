# Local Setup on macOS

## Scope

This setup supports development and offline review. It does not configure synthetic voice or autonomous Teams attendance.

## Prerequisites

- macOS 13 or later; David's current Mac is suitable;
- Node.js 22 or later;
- a modern browser capable of opening a local `file://` HTML document.

## Repository setup

```bash
git clone <repository-url>
cd ai-delegate-avatar
nvm use             # reads .nvmrc, if nvm is installed
npm install
npm run check
npm run demo:dry
npm run demo:mapping
npm run --silent demo:render-script > /tmp/render-script.jsonl
```

The demo commands require no VTube installation and make no network calls. `demo:render-script` writes deterministic renderer-neutral JSONL; it does not render an avatar. The planned player command will generate a self-contained HTML/SVG file for `file://` review; it is not implemented yet.

## Current local SVG review path (planned)

The critical path is `local_svg` rig profile → deterministic fixed-tick abstract render script → self-contained `file://` HTML/SVG player → restrained mapping → durable artifacts → review/replay. It will require no network, external application, or licensed model assets, show AI-delegate disclosure for the full duration, and target a 20–45 second review at approximately 320 px. Do not treat this description as implementation or visual evidence.

## Deferred optional VTube Studio setup

**This section is future reference only. Organizational IT policy currently blocks installation. Do not bypass policy or use these steps until installation is explicitly approved.**

The supported desktop distribution is the official Steam build linked from
https://denchisoft.com/ (Steam app `1325860`). Do not download a model or app
binary into this repository. VTube Studio includes example Live2D models, so a
bundled example is the preferred generic integration fixture: it avoids adding
licensed/private model assets to Git. Installation and any Steam/VTube Studio
licence prompts are deliberate human steps.

1. Install VTube Studio from its official Steam page and launch it.
2. Open the model selection bar and load one of the bundled example models.
   Keep the same model selected for all integration runs; do not assume its
   name or ID before inspecting the installed copy.
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

### Installation discovery

If Steam reports the app as installed but it is not in `/Applications`, use
Steam's **Manage → Browse local files**. A read-only terminal check of the usual
locations is:

```bash
find /Applications "$HOME/Applications" \
  "$HOME/Library/Application Support/Steam/steamapps/common" /Volumes \
  -maxdepth 8 -name 'VTube Studio.app' -print 2>/dev/null
lsof -nP -iTCP:8001 -sTCP:LISTEN
```

The official macOS documentation places bundled/imported models below
`VTube Studio.app/Contents/Resources/Data/StreamingAssets/Live2DModels`.
Treat that directory as installed third-party content: inspect it if needed,
but do not copy it into Git.

### Bind the generic integration profile

`examples/rig-profile.example.json` is intentionally unbound and its hotkey
names are proposals, not claims about a bundled model. After authentication and
the preflight API calls are available:

1. Record the loaded model's `modelName` and `modelID` exactly as returned by
   `CurrentModelRequest` (the official API is the source of truth).
2. Copy the example profile to a new reviewable JSON fixture and add:

   ```json
   "model": {
     "expectedModelId": "<exact modelID returned by VTube Studio>",
     "expectedModelName": "<exact modelName returned by VTube Studio>",
     "assetVersion": "<installed VTube/model version>"
   }
   ```

3. List `InputParameterListRequest` results and retain only parameter mappings
   that exist and whose configured ranges/neutrals were checked in VTube
   Studio. List current-model hotkeys and map only exact, unique selectors.
   Never invent missing hotkeys to make mapping inspection pass.
4. Ensure every state/gesture used by
   `examples/example-animation-plan.json` has a real mapping. If the bundled
   model cannot supply the required controls, configure repository-named
   hotkeys in VTube Studio or select a different legitimately installed model,
   then repeat discovery.
5. Set the profile `rigId` and plan `targetRig` to the same stable value, then
   validate and inspect those specific files (paths are relative to the
   controller workspace):

   ```bash
   npm run validate:rig --workspace @ai-delegate-avatar/controller -- \
     ../../path/to/bound-rig-profile.json
   npm run inspect:mapping --workspace @ai-delegate-avatar/controller -- \
     ../../path/to/animation-plan.json ../../path/to/bound-rig-profile.json
   ```

Do not commit API tokens, Steam files, model binaries, screenshots containing
private data, or a profile containing guessed identity/control values.

### Manual neutral/reset evidence

With the bound model loaded, record the VTube Studio version, model name/ID,
profile path, and test time outside any secret/token file. For each mapped
state/gesture, run `neutral → control → reset_neutral` and verify visually that
the control is distinguishable and returns to the same stable pose. Trigger
`reset_neutral` twice more; it must be idempotent, with no expression toggles or
parameter drift left active. Then repeat one complete reference-plan cycle and
confirm the final pose matches the initial neutral pose. This is a manual test;
schema validation is not evidence that it passed.

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
