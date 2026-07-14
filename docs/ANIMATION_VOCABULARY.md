# Animation Vocabulary

## Intent

Use the smallest vocabulary that reliably communicates meeting-relevant state. Expressivity is valuable only when viewers can interpret it consistently.

## Core states

### `idle`

Neutral but alive. Minimal breathing/physics, occasional runtime blink, no implied engagement target.

### `listening`

Attention on the current speaker. Stable posture, modest eye/head orientation, very occasional acknowledgement.

### `thinking`

Visible processing. Slightly reduced eye contact, restrained head tilt or down/aside gaze, slower motion.

### `agreeing`

Mild acknowledgement, not consent to a commitment. Small nod and/or slight warmth. Avoid enthusiastic confirmation.

### `uncertain`

A qualified/caveat stance. Slight brow or head asymmetry, reduced smile, calm rather than anxious movement.

### `speaking`

Speech-ready pose and forward attention. In Milestone 1 this is silent intent; TTS and visemes are later.

### `summarising`

Structured explanation. Calm, relatively centred, low-to-medium energy.

### `deferring`

The question exceeds the delegate's authority or requires David. Must be clearly distinct from ordinary uncertainty.

### `boundary`

Refusal or explicit scope limit. Serious and calm, never hostile or evasive.

### `reset_neutral`

Deterministic end/control-release state. Not an expressive flourish.

## Gesture primitives

| Gesture | Meaning | Default intensity | Use |
|---|---|---:|---|
| `blink` | normal life signal | 0.20 | primarily runtime-generated |
| `slow_blink` | processing/acceptance pause | 0.30 | sparingly |
| `micro_nod` | listening acknowledgement | 0.25 | occasional |
| `small_nod` | mild confirmation/agreement | 0.35 | do not repeat rapidly |
| `head_tilt_left` | curiosity/uncertainty | 0.30 | brief |
| `head_tilt_right` | alternate curiosity/uncertainty | 0.30 | brief |
| `brow_raise` | emphasis/attention | 0.35 | mild |
| `brow_furrow` | concern/qualification | 0.30 | avoid distress |
| `glance_aside` | retrieval/thought | 0.30 | brief |
| `glance_down` | checking/caution | 0.30 | brief |
| `half_smile` | warmth | 0.25 | avoid sales-like affect |
| `caveat_expression` | qualified answer | 0.45 | brow/head combination |
| `defer_to_human` | David must decide | 0.55 | key authority affordance |
| `reset_neutral` | reset/release | 1.00 | deterministic |

## Speech-act guidance

| Speech act | State progression | Valid gesture examples |
|---|---|---|
| `acknowledge_question` | `listening` → `thinking` | `micro_nod`, `slow_blink` |
| `factual_answer` | `speaking` | `brow_raise`, `small_nod` |
| `qualified_answer` | `uncertain` → `speaking` | `caveat_expression`, `brow_raise` |
| `summary` | `summarising` | `small_nod`, `half_smile` |
| `clarifying_question` | `thinking` → `speaking` | `head_tilt_left`, `brow_raise` |
| `deferral` | `deferring` | `defer_to_human` |
| `boundary_refusal` | `boundary` | `brow_furrow`, then `reset_neutral` |

## Default transition guidance

- High-level states should normally cover the full plan without overlap.
- Use 300–700 ms visual easing for ordinary posture/expression changes.
- Discrete nods/blinks may have rig-defined internal timing.
- Leave meaningful still periods between gestures.
- Keep non-blink gesture starts at least 1200 ms apart by default.
- Do not layer multiple head-direction gestures over a state transition unless the runtime defines a clear priority.
- `reset_neutral` should finish at the plan end.

## Style constraints

- No exaggerated streamer reactions.
- No flirty, coy, manipulative, or pseudo-empathic mannerisms.
- No fake fatigue, pain, panic, or distress.
- No attempt to simulate a live webcam feed.
- No constant swaying or random gaze.
- No nod that could be read as agreement when the state is merely listening.
- Stillness is a valid and often preferred output.

## Expansion rule

Add a state or gesture only when:

1. an existing primitive cannot communicate the intended distinction;
2. the new primitive has a renderer-independent meaning;
3. it can be recognised at meeting-tile size;
4. it has a reset/conflict rule;
5. at least one review scenario demonstrates value.
