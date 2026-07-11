import { describe, expect, it } from "vitest";

import filters from "../../../src/_config/filters.js";

describe("formatDateShort", () => {
  it("formats as DD/MM/YYYY", () => {
    expect(filters.formatDateShort("2025-12-25")).toBe("25/12/2025");
  });

  it("zero-pads day and month", () => {
    expect(filters.formatDateShort("2026-01-02")).toBe("02/01/2026");
  });
});

describe("readingTime", () => {
  it("returns whole minutes at ~200 wpm", () => {
    const words = Array.from({ length: 400 }, () => "word").join(" ");
    expect(filters.readingTime(words)).toBe(2);
  });

  it("rounds up partial minutes", () => {
    const words = Array.from({ length: 201 }, () => "word").join(" ");
    expect(filters.readingTime(words)).toBe(2);
  });

  it("strips HTML tags before counting", () => {
    expect(filters.readingTime("<p>one</p> <em>two</em>")).toBe(1);
  });

  it("never returns less than one minute", () => {
    expect(filters.readingTime("")).toBe(1);
    expect(filters.readingTime(undefined)).toBe(1);
  });
});

describe("meterBar", () => {
  it("fills value cells out of max", () => {
    expect(filters.meterBar(4, 5)).toBe("▌▌▌▌░");
  });

  it("empty at zero", () => {
    expect(filters.meterBar(0, 5)).toBe("░░░░░");
  });

  it("clamps values above max", () => {
    expect(filters.meterBar(9, 5)).toBe("▌▌▌▌▌");
  });

  it("clamps negatives to empty", () => {
    expect(filters.meterBar(-3, 5)).toBe("░░░░░");
  });
});

describe("readingTimeMeter", () => {
  it("fills relative to a 15-minute full bar", () => {
    expect(filters.readingTimeMeter(15, 5)).toBe("▌▌▌▌▌");
    expect(filters.readingTimeMeter(0, 5)).toBe("░░░░░");
  });

  it("caps long reads at full", () => {
    expect(filters.readingTimeMeter(60, 5)).toBe("▌▌▌▌▌");
  });

  it("rounds to nearest cell (7 min -> 2)", () => {
    expect(filters.readingTimeMeter(7, 5)).toBe("▌▌░░░");
  });
});

describe("readingTimeCells", () => {
  it("matches readingTimeMeter's fill count", () => {
    expect(filters.readingTimeCells(15, 5)).toBe(5);
    expect(filters.readingTimeCells(7, 5)).toBe(2);
    expect(filters.readingTimeCells(0, 5)).toBe(0);
  });

  it("caps long reads at max", () => {
    expect(filters.readingTimeCells(60, 5)).toBe(5);
  });
});
