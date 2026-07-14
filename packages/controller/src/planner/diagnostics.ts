import type {
  AnimationPlan,
  Diagnostic,
  GestureEvent,
  StateEvent,
  TimelineEvent
} from "../types.js";
import { flattenTimeline } from "../runtime/timeline.js";

const MIN_NON_BLINK_GESTURE_SPACING_MS = 1200;
const STATE_GAP_TOLERANCE_MS = 50;

export function diagnoseAnimationPlan(plan: AnimationPlan): Diagnostic[] {
  return [
    ...diagnoseUniqueIds(plan),
    ...diagnoseBounds(plan),
    ...diagnoseStateTrack(plan),
    ...diagnoseGestureDensity(plan),
    ...diagnoseSpeechState(plan),
    ...diagnoseReset(plan),
    ...diagnoseDisclosure(plan)
  ];
}

function diagnoseUniqueIds(plan: AnimationPlan): Diagnostic[] {
  const seen = new Map<string, string>();
  const diagnostics: Diagnostic[] = [];

  for (const event of flattenTimeline(plan)) {
    const previousPath = seen.get(event.id);
    const path = eventPath(plan, event);
    if (previousPath) {
      diagnostics.push({
        severity: "error",
        path,
        message: `duplicate event id ${JSON.stringify(event.id)}; first used at ${previousPath}`
      });
    } else {
      seen.set(event.id, path);
    }
  }

  return diagnostics;
}

function diagnoseBounds(plan: AnimationPlan): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  for (const event of flattenTimeline(plan)) {
    const path = eventPath(plan, event);
    if (event.startMs > plan.durationMs) {
      diagnostics.push({
        severity: "error",
        path: `${path}/startMs`,
        message: `starts after plan duration (${event.startMs} > ${plan.durationMs})`
      });
    }

    if (event.durationMs !== undefined && event.startMs + event.durationMs > plan.durationMs) {
      diagnostics.push({
        severity: "error",
        path: `${path}/durationMs`,
        message: `event ends at ${event.startMs + event.durationMs} ms, beyond plan duration ${plan.durationMs} ms`
      });
    }
  }

  return diagnostics;
}

function diagnoseStateTrack(plan: AnimationPlan): Diagnostic[] {
  const states = [...plan.tracks.states].sort((a, b) => a.startMs - b.startMs);
  const diagnostics: Diagnostic[] = [];

  for (let index = 1; index < states.length; index += 1) {
    const previous = states[index - 1];
    const current = states[index];
    const previousEnd = previous.startMs + previous.durationMs;

    if (current.startMs < previousEnd) {
      diagnostics.push({
        severity: "error",
        path: eventPath(plan, current),
        message: `state overlaps ${JSON.stringify(previous.id)} by ${previousEnd - current.startMs} ms`
      });
    } else if (current.startMs - previousEnd > STATE_GAP_TOLERANCE_MS) {
      diagnostics.push({
        severity: "warning",
        path: eventPath(plan, current),
        message: `state track has a ${current.startMs - previousEnd} ms uncovered gap before this event`
      });
    }
  }

  if (states.length > 0) {
    const first = states[0];
    const last = states[states.length - 1];
    const lastEnd = last.startMs + last.durationMs;
    if (first.startMs > STATE_GAP_TOLERANCE_MS) {
      diagnostics.push({
        severity: "warning",
        path: eventPath(plan, first),
        message: `state track begins at ${first.startMs} ms instead of 0 ms`
      });
    }
    if (plan.durationMs - lastEnd > STATE_GAP_TOLERANCE_MS) {
      diagnostics.push({
        severity: "warning",
        path: eventPath(plan, last),
        message: `state track ends ${plan.durationMs - lastEnd} ms before the plan ends`
      });
    }
  }

  return diagnostics;
}

function diagnoseGestureDensity(plan: AnimationPlan): Diagnostic[] {
  const gestures = plan.tracks.gestures
    .filter((event) => !isAutomaticOrResetGesture(event))
    .sort((a, b) => a.startMs - b.startMs);
  const diagnostics: Diagnostic[] = [];

  for (let index = 1; index < gestures.length; index += 1) {
    const previous = gestures[index - 1];
    const current = gestures[index];
    const spacing = current.startMs - previous.startMs;
    if (spacing < MIN_NON_BLINK_GESTURE_SPACING_MS) {
      diagnostics.push({
        severity: "warning",
        path: eventPath(plan, current),
        message: `non-blink gestures are only ${spacing} ms apart; default minimum is ${MIN_NON_BLINK_GESTURE_SPACING_MS} ms`
      });
    }
  }

  return diagnostics;
}

function diagnoseSpeechState(plan: AnimationPlan): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const speechCompatibleStates = new Set(["speaking", "summarising", "deferring", "boundary"]);

  for (const speech of plan.tracks.speech ?? []) {
    const activeState = plan.tracks.states.find((state) =>
      state.startMs <= speech.startMs && speech.startMs < state.startMs + state.durationMs
    );

    if (!activeState || !speechCompatibleStates.has(activeState.state)) {
      diagnostics.push({
        severity: "warning",
        path: eventPath(plan, speech),
        message: activeState
          ? `speech starts during state ${JSON.stringify(activeState.state)} rather than a speech-compatible state`
          : "speech starts with no active state"
      });
    }
  }

  return diagnostics;
}

function diagnoseReset(plan: AnimationPlan): Diagnostic[] {
  const resetEvents = flattenTimeline(plan).filter((event) =>
    (event.type === "state" && event.state === "reset_neutral") ||
    (event.type === "gesture" && event.gesture === "reset_neutral")
  );

  const finalReset = resetEvents.some((event) => {
    const end = event.startMs + (event.durationMs ?? 0);
    return end >= plan.durationMs - 250;
  });

  return finalReset
    ? []
    : [{
        severity: "warning",
        path: "/tracks",
        message: "no reset_neutral event finishes near the end of the plan"
      }];
}

function diagnoseDisclosure(plan: AnimationPlan): Diagnostic[] {
  if (plan.safetyMode !== "offline_review_only") return [];

  const persistentDisclosure = (plan.tracks.overlays ?? []).some((overlay) =>
    overlay.startMs === 0 &&
    overlay.startMs + overlay.durationMs >= plan.durationMs &&
    /\b(ai|delegate)\b/i.test(overlay.text)
  );

  return persistentDisclosure
    ? []
    : [{
        severity: "warning",
        path: "/tracks/overlays",
        message: "offline review plan has no full-duration overlay identifying the AI/delegate role"
      }];
}

function isAutomaticOrResetGesture(event: GestureEvent): boolean {
  return event.gesture === "blink" || event.gesture === "slow_blink" || event.gesture === "reset_neutral";
}

function eventPath(plan: AnimationPlan, event: TimelineEvent): string {
  switch (event.type) {
    case "state":
      return indexedPath("states", plan.tracks.states, event);
    case "gesture":
      return indexedPath("gestures", plan.tracks.gestures, event);
    case "speech":
      return indexedPath("speech", plan.tracks.speech ?? [], event);
    case "overlay":
      return indexedPath("overlays", plan.tracks.overlays ?? [], event);
  }
}

function indexedPath<T extends { id: string }>(track: string, events: T[], event: T): string {
  const identityIndex = events.indexOf(event);
  const index = identityIndex >= 0
    ? identityIndex
    : events.findIndex((candidate) => candidate.id === event.id);
  return `/tracks/${track}/${Math.max(index, 0)}`;
}

export function stateEnd(state: StateEvent): number {
  return state.startMs + state.durationMs;
}
