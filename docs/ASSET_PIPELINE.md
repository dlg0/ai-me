# Avatar Asset Pipeline

> **Archival reference:** this Live2D/VTube workstream was superseded by the completed first-party local SVG rig and is not active backlog. Any future asset/renderer effort requires a fresh decision and newly scoped issues.

## Purpose

Turn a selected existing avatar or illustration into a controllable Live2D asset without blocking runtime development.

The desired visual style may deliberately expose its construction: discrete eyes, brows, mouth forms, head/torso pieces, and stylised transitions can become part of the delegate's identity. The system does not need to conceal that it is a puppet.

## Historical two-track strategy

### Track A — Generic integration rig

Use any known-good Live2D model to implement VTube authentication, preflight, hotkeys, parameter injection, timing, reset, and logging.

This was the proposed integration track; it was not executed and should not be started from this document.

### Track B — David-specific avatar

Prepare the selected avatar, rig its expressive components, and create the matching VTube configuration/rig profile.

The first visual review occurs when both tracks meet. Do not make runtime code depend on private/commercial model files.

## Accepted source inputs

In descending order of suitability:

1. layered PSD/illustration with separate facial and body parts;
2. editable vector source;
3. high-resolution flat PNG with clean edges;
4. low-resolution/compressed image requiring reconstruction.

A flat image cannot simply be cut into visible rectangles and expected to deform correctly. Hidden geometry must be reconstructed—for example, complete eyeballs behind eyelids, face/background beneath hair, mouth interiors, and neck/torso areas exposed by head movement.

## Source-rights checkpoint

Before rigging:

- confirm David owns or is authorised to adapt the artwork;
- record artist/source and licence terms;
- confirm derivative animation and workplace/video use are allowed;
- do not commit restricted source artwork or paid model binaries to a public repository.

Store provenance in a local asset manifest or approved private storage.

## Decomposition workflow

### 1. Select the target style

Decide whether the first rig should be:

- clean professional caricature;
- visibly segmented/collage-like puppet;
- lightly mechanical or diagrammatic AI delegate;
- another stylised direction.

The segmented style can use deliberate seams, snap/ease transitions, and slightly exaggerated discrete parts while retaining restrained meeting behaviour.

### 2. Reconstruct layers

Minimum useful separation:

- back hair/head silhouette;
- face/base skin;
- ears;
- neck;
- torso/shoulders;
- front hair/details;
- left/right eye whites;
- left/right irises/pupils;
- upper/lower eyelids;
- left/right brows;
- nose/shading overlays as needed;
- mouth closed/base;
- mouth interior/teeth/tongue as needed;
- beard/moustache/glasses/accessories;
- optional arm/hand for deferral.

Use masks and repaint occluded regions. Avoid leaving transparent holes that appear when parts move.

### 3. Establish pivots and deformation zones

For each expressive part, define:

- natural pivot/anchor;
- expected translation/rotation range;
- deformation rather than rigid movement where needed;
- clipping/masking relationships;
- draw order;
- reset/neutral pose.

### 4. Rig in Live2D

Create enough deformers/parameters to support the minimum rig contract. Add physics only where it improves subtle presence; hair/accessory physics should not dominate a Teams tile.

### 5. Configure VTube Studio

- load and verify the model;
- map VTube input/tracking parameters to Live2D parameters;
- create named expression/animation hotkeys;
- verify reset behaviour;
- record the installed model identity/version, actual input IDs, and hotkey selectors/IDs in `rig-profile.v1`.

### 6. Thumbnail-size review

Evaluate the avatar at approximately the size of a Teams participant tile. Tiny facial changes that work full-screen may be illegible. Prefer fewer, clearer expressive changes over complex micro-detail.

## Minimum asset deliverables

Keep large/restricted binaries outside Git where necessary, but provide:

```text
avatar-delivery/
├── provenance.md
├── source-manifest.json
├── model-version.txt
├── rig-profile.json
├── vts-hotkeys.md
├── parameter-map.md
├── neutral-reference.png
├── expression-contact-sheet.png
└── installation-notes.md
```

The actual PSD/Live2D/VTube model files may be delivered through private storage.

## Required first-pass expressions/actions

- neutral;
- listening;
- thinking;
- mild smile/agreement;
- uncertainty/caveat;
- speech-ready/qualified-answer pose;
- boundary/refusal;
- defer-to-David;
- reset-neutral;
- micro nod;
- small nod;
- slow blink;
- modest head tilt.

A hand gesture is optional. A clearly readable head/face boundary gesture is acceptable for the first rig.

## Acceptance checklist

- no visible holes during head/eye/mouth movement;
- eyes and brows can move independently enough to express uncertainty;
- head X/Y/Z changes remain stable and do not tear the artwork;
- all required VTube hotkeys are discoverable and reset cleanly;
- parameter neutral values are documented;
- the avatar remains recognisable and professional at small size;
- stillness looks intentional rather than frozen;
- expression transitions do not look frantic or streamer-like;
- the rig profile validates with `npm run validate:rig`.

## Automation opportunities

AI tools can assist with masking, inpainting occluded regions, layer naming, and producing expression variants. Human art/rig review remains necessary because hidden geometry, pivots, deformation topology, and visual taste are not reliably solved by automatic image segmentation alone.
