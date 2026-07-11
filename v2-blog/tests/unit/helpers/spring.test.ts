import { describe, expect, it } from "vitest";

import { sampleSpringProgress, springProgress } from "../../../src/_helpers/spring.ts";

describe("springProgress", () => {
  it("starts at 0 and settles exactly at 1", () => {
    expect(springProgress(0)).toBe(0);
    expect(springProgress(1)).toBeCloseTo(1, 10);
  });

  it("clamps out-of-range time", () => {
    expect(springProgress(-1)).toBe(0);
    expect(springProgress(2)).toBeCloseTo(1, 10);
  });

  it("never overshoots (critically damped)", () => {
    for (let i = 0; i <= 200; i++) {
      expect(springProgress(i / 200)).toBeLessThanOrEqual(1);
    }
  });

  it("is monotonically increasing", () => {
    let previous = -Infinity;
    for (let i = 0; i <= 200; i++) {
      const value = springProgress(i / 200);
      expect(value).toBeGreaterThanOrEqual(previous);
      previous = value;
    }
  });

  it("decelerates: first half covers most of the distance", () => {
    expect(springProgress(0.5)).toBeGreaterThan(0.85);
  });
});

describe("sampleSpringProgress", () => {
  it("returns samples + 1 points from 0 to 1", () => {
    const points = sampleSpringProgress(60);
    expect(points).toHaveLength(61);
    expect(points[0]).toBe(0);
    expect(points[60]).toBeCloseTo(1, 10);
  });
});
