import { beforeEach, describe, expect, it } from "vitest";

import { SESSION_KEY, SESSION_VERSION, TerminalSession } from "../../../../src/_helpers/terminal/session.ts";

/** Minimal in-memory Storage stand-in (decoupled from jsdom globals). */
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
let session: TerminalSession;

beforeEach(() => {
  storage = fakeStorage();
  session = new TerminalSession(storage);
});

describe("TerminalSession (command-history persistence)", () => {
  it("reads an empty history when nothing is stored", () => {
    expect(session.readHistory()).toEqual([]);
  });

  it("persists a command history and reads it back", () => {
    session.writeHistory(["ls", "open ring"]);
    expect(session.readHistory()).toEqual(["ls", "open ring"]);
  });

  it("overwrites the prior history on each write", () => {
    session.writeHistory(["one"]);
    session.writeHistory(["two", "three"]);
    expect(session.readHistory()).toEqual(["two", "three"]);
  });

  it("stores under the documented key and version", () => {
    session.writeHistory(["ls"]);
    const raw = JSON.parse(storage.getItem(SESSION_KEY)!);
    expect(raw.v).toBe(SESSION_VERSION);
    expect(raw.history).toEqual(["ls"]);
  });

  describe("defensive read (tampered / malformed / legacy storage)", () => {
    const expectEmpty = (raw: string) => {
      storage.setItem(SESSION_KEY, raw);
      expect(session.readHistory()).toEqual([]);
    };

    it("returns [] and never throws on invalid JSON", () => {
      expectEmpty("{not json");
    });

    it("ignores a wrong or missing version (e.g. a legacy #79 blob)", () => {
      expectEmpty(JSON.stringify({ v: 1, open: true, history: ["ls"], log: [] }));
      expectEmpty(JSON.stringify({ history: ["ls"] }));
    });

    it("ignores a non-array history or non-string entries", () => {
      expectEmpty(JSON.stringify({ v: SESSION_VERSION, history: "ls" }));
      expectEmpty(JSON.stringify({ v: SESSION_VERSION, history: [1, 2] }));
    });
  });
});
