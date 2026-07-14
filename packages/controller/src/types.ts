export type SafetyMode =
  | "offline_review_only"
  | "disclosed_ai_delegate"
  | "local_operator_approved";

export type AnimationState =
  | "idle"
  | "listening"
  | "thinking"
  | "agreeing"
  | "uncertain"
  | "speaking"
  | "summarising"
  | "deferring"
  | "boundary"
  | "reset_neutral";

export type Gesture =
  | "blink"
  | "slow_blink"
  | "micro_nod"
  | "small_nod"
  | "head_tilt_left"
  | "head_tilt_right"
  | "brow_raise"
  | "brow_furrow"
  | "glance_aside"
  | "glance_down"
  | "half_smile"
  | "caveat_expression"
  | "defer_to_human"
  | "reset_neutral";

export type SpeechAct =
  | "acknowledge_question"
  | "factual_answer"
  | "qualified_answer"
  | "summary"
  | "clarifying_question"
  | "deferral"
  | "boundary_refusal";

export interface Affect {
  warmth?: number;
  confidence?: number;
  uncertainty?: number;
  energy?: number;
}

export interface BaseEvent {
  id: string;
  type: string;
  startMs: number;
  durationMs?: number;
  reason?: string;
}

export interface StateEvent extends BaseEvent {
  type: "state";
  durationMs: number;
  state: AnimationState;
  intensity?: number;
  attention?:
    | "camera"
    | "current_speaker"
    | "down_left"
    | "down_right"
    | "aside_left"
    | "aside_right"
    | "none";
  affect?: Affect;
}

export interface GestureEvent extends BaseEvent {
  type: "gesture";
  durationMs: number;
  gesture: Gesture;
  intensity?: number;
}

export interface SpeechEvent extends BaseEvent {
  type: "speech";
  text: string;
  speechAct: SpeechAct;
  confidence?: number;
  emphasis?: Array<{ text: string; gesture: Gesture }>;
}

export interface OverlayEvent extends BaseEvent {
  type: "overlay";
  durationMs: number;
  text: string;
  position?: "lower_third" | "top_left" | "top_right" | "bottom_left" | "bottom_right";
}

export interface AnimationPlan {
  schemaVersion: "animation-plan.v1";
  title: string;
  description?: string;
  durationMs: number;
  safetyMode: SafetyMode;
  targetRig: string;
  plannerNotes?: string;
  tracks: {
    states: StateEvent[];
    gestures: GestureEvent[];
    speech?: SpeechEvent[];
    overlays?: OverlayEvent[];
  };
}

export interface RigParameterMapping {
  /** VTube Studio input/tracking parameter ID, not a raw Live2D model parameter ID. */
  vtsInputParameter: string;
  min: number;
  max: number;
  neutral: number;
  weight?: number;
}

interface BaseRigProfile {
  schemaVersion: "rig-profile.v1";
  rigId: string;
}

export interface VTubeRigProfile extends BaseRigProfile {
  renderer: "vtube_studio";
  model?: {
    expectedModelId?: string;
    expectedModelName?: string;
    assetVersion?: string;
  };
  parameters: Record<string, RigParameterMapping>;
  /** Value may be a VTube Studio hotkey name or unique hotkey ID. */
  hotkeys: Record<string, string>;
}

export interface SvgControl {
  svgControlId: string;
  min: number;
  max: number;
  neutral: number;
}

export interface LocalSvgRigProfile extends BaseRigProfile {
  renderer: "local_svg";
  avatar: { assetId: string; viewBox: { width: number; height: number } };
  controls: Record<string, SvgControl>;
  /** Abstract continuous control name to a key in controls. */
  parameters: Record<string, string>;
  /** Abstract pose/gesture name to bounded control targets. */
  poses: Record<string, Array<{ control: string; value: number }>>;
}

export type RigProfile = VTubeRigProfile | LocalSvgRigProfile;

export type TimelineEvent = StateEvent | GestureEvent | SpeechEvent | OverlayEvent;

export type DiagnosticSeverity = "error" | "warning";

export interface Diagnostic {
  severity: DiagnosticSeverity;
  path: string;
  message: string;
}
