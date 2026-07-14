import type { AnimationPlan, TimelineEvent } from "../types.js";

export function flattenTimeline(plan: AnimationPlan): TimelineEvent[] {
  const events: TimelineEvent[] = [
    ...plan.tracks.states,
    ...plan.tracks.gestures,
    ...(plan.tracks.speech ?? []),
    ...(plan.tracks.overlays ?? [])
  ];

  return events.sort((a, b) => {
    if (a.startMs !== b.startMs) return a.startMs - b.startMs;
    return typePriority(a.type) - typePriority(b.type);
  });
}

function typePriority(type: string): number {
  switch (type) {
    case "overlay": return 0;
    case "state": return 1;
    case "gesture": return 2;
    case "speech": return 3;
    default: return 99;
  }
}
