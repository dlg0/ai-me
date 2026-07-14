export interface StyleLimits {
  maxNonBlinkGesturesPerMinute: number;
  minMsBetweenGestures: number;
  defaultTransitionMs: number;
  maxIntensity: number;
}

export const defaultStyleLimits: StyleLimits = {
  maxNonBlinkGesturesPerMinute: 22,
  minMsBetweenGestures: 1200,
  defaultTransitionMs: 450,
  maxIntensity: 0.65
};
