import { describe, expect, it } from "vitest";

import { parseDisplayDate, todayParts } from "../../../src/_helpers/date.ts";

describe("parseDisplayDate", () => {
  it("parses DD/MM/YYYY into calendar parts", () => {
    expect(parseDisplayDate("27/03/2025")).toEqual({ day: 27, month: 3, year: 2025 });
  });

  it("tolerates surrounding whitespace", () => {
    expect(parseDisplayDate(" 01/12/2024 ")).toEqual({ day: 1, month: 12, year: 2024 });
  });

  it("rejects other formats", () => {
    expect(parseDisplayDate("2025-03-27")).toBeNull();
    expect(parseDisplayDate("27/3/2025")).toBeNull();
    expect(parseDisplayDate("")).toBeNull();
    expect(parseDisplayDate("not a date")).toBeNull();
  });

  it("rejects out-of-range day and month", () => {
    expect(parseDisplayDate("32/01/2025")).toBeNull();
    expect(parseDisplayDate("00/01/2025")).toBeNull();
    expect(parseDisplayDate("15/13/2025")).toBeNull();
    expect(parseDisplayDate("15/00/2025")).toBeNull();
  });
});

describe("todayParts", () => {
  it("reads calendar parts from the local clock", () => {
    const now = new Date(2026, 6, 11); // 11 Jul 2026 local time
    expect(todayParts(now)).toEqual({ day: 11, month: 7, year: 2026 });
  });

  it("defaults to the current date", () => {
    const now = new Date();
    expect(todayParts()).toEqual({
      day: now.getDate(),
      month: now.getMonth() + 1,
      year: now.getFullYear(),
    });
  });
});
