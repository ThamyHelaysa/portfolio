// Critically damped spring progress curve: fast start, smooth deceleration
// into the target, no overshoot (the settled value never passes 1, so an
// odometer digit never shows a wrong value while settling).
const OMEGA = 8;
const NORM = 1 - (1 + OMEGA) * Math.exp(-OMEGA);

export function springProgress(t: number): number {
  const clamped = Math.min(1, Math.max(0, t));
  return (1 - (1 + OMEGA * clamped) * Math.exp(-OMEGA * clamped)) / NORM;
}

// Evenly spaced samples of the spring curve (samples + 1 points, 0 → 1),
// ready to become WAAPI keyframe offsets — works everywhere WAAPI works,
// no `linear()` easing support required.
export function sampleSpringProgress(samples = 60): number[] {
  const points: number[] = [];
  for (let i = 0; i <= samples; i++) {
    points.push(springProgress(i / samples));
  }
  return points;
}
