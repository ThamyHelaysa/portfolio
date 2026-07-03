import { beforeEach, describe, expect, it } from "vitest";

import { isUnlocked, markUnlocked, UNLOCK_KEY } from "../../../../src/_helpers/terminal/unlock.ts";

/** Minimal in-memory Storage stand-in. */
function fakeStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (k) => (map.has(k) ? map.get(k)! : null),
    key: (i) => [...map.keys()][i] ?? null,
    removeItem: (k) => void map.delete(k),
    setItem: (k, v) => void map.set(k, v),
  };
}

let storage: Storage;

beforeEach(() => {
  storage = fakeStorage();
});

describe("terminal unlock flag", () => {
  it("is locked by default", () => {
    expect(isUnlocked(storage)).toBe(false);
  });

  it("persists the unlock and reads it back", () => {
    markUnlocked(storage);
    expect(storage.getItem(UNLOCK_KEY)).not.toBeNull();
    expect(isUnlocked(storage)).toBe(true);
  });

  it("is idempotent — marking twice keeps it unlocked", () => {
    markUnlocked(storage);
    markUnlocked(storage);
    expect(isUnlocked(storage)).toBe(true);
  });

  it("never throws when storage is unavailable (private mode, blocked)", () => {
    const throwing = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    } as unknown as Storage;

    expect(() => markUnlocked(throwing)).not.toThrow();
    expect(isUnlocked(throwing)).toBe(false);
  });
});
