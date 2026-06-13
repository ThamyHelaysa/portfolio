import { describe, expect, it } from "vitest";

import { matchesSummonCombo } from "../../../../src/_helpers/terminal/summon.ts";

/**
 * Builds a minimal keydown-like object for predicate testing.
 */
function key(overrides: Partial<KeyboardEvent>): KeyboardEvent {
  return {
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    altKey: false,
    code: "",
    ...overrides,
  } as KeyboardEvent;
}

describe("matchesSummonCombo", () => {
  it("matches Ctrl+Shift+C", () => {
    expect(matchesSummonCombo(key({ ctrlKey: true, shiftKey: true, code: "KeyC" }))).toBe(true);
  });

  it("matches Cmd+Shift+C (macOS)", () => {
    expect(matchesSummonCombo(key({ metaKey: true, shiftKey: true, code: "KeyC" }))).toBe(true);
  });

  it("ignores layout-dependent key casing by matching on code", () => {
    // On some layouts the produced character is "c", on others "C"; both must match.
    expect(matchesSummonCombo(key({ ctrlKey: true, shiftKey: true, code: "KeyC", key: "c" }))).toBe(true);
    expect(matchesSummonCombo(key({ ctrlKey: true, shiftKey: true, code: "KeyC", key: "C" }))).toBe(true);
  });

  it("requires Shift", () => {
    expect(matchesSummonCombo(key({ ctrlKey: true, code: "KeyC" }))).toBe(false);
  });

  it("requires a Ctrl or Cmd modifier", () => {
    expect(matchesSummonCombo(key({ shiftKey: true, code: "KeyC" }))).toBe(false);
  });

  it("requires the C key specifically", () => {
    expect(matchesSummonCombo(key({ ctrlKey: true, shiftKey: true, code: "KeyX" }))).toBe(false);
  });
});
