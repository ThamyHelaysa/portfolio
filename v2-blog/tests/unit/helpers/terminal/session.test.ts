import { beforeEach, describe, expect, it } from "vitest";

import { LOG_CAP, SESSION_KEY, SESSION_VERSION, TerminalSession } from "../../../../src/_helpers/terminal/session.ts";

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

describe("TerminalSession", () => {
  it("reads null when nothing has been stored", () => {
    expect(session.read()).toBeNull();
  });

  it("persists the open flag, history and log lines, then reads them back", () => {
    session.setOpen(true);
    session.appendLine("$ ls", 2);
    session.appendLine("blog/", 0);
    session.setHistory(["ls"]);

    expect(session.read()).toEqual({
      v: SESSION_VERSION,
      open: true,
      history: ["ls"],
      log: [
        { t: "$ ls", k: 2 },
        { t: "blog/", k: 0 },
      ],
    });
  });

  it("caps the log to the most recent LOG_CAP lines", () => {
    for (let i = 0; i < LOG_CAP + 25; i++) session.appendLine(`line ${i}`, 0);

    const snap = session.read()!;
    expect(snap.log).toHaveLength(LOG_CAP);
    expect(snap.log[0].t).toBe(`line 25`); // oldest 25 dropped
    expect(snap.log[snap.log.length - 1].t).toBe(`line ${LOG_CAP + 24}`);
  });

  it("clear() removes the stored session", () => {
    session.setOpen(true);
    session.clear();
    expect(session.read()).toBeNull();
    expect(storage.getItem(SESSION_KEY)).toBeNull();
  });

  describe("defensive read (tampered / malformed storage)", () => {
    const reject = (raw: string) => {
      storage.setItem(SESSION_KEY, raw);
      expect(session.read()).toBeNull();
    };

    it("returns null and never throws on invalid JSON", () => {
      reject("{not json");
    });

    it("rejects a wrong or missing version", () => {
      reject(JSON.stringify({ v: 999, open: true, history: [], log: [] }));
      reject(JSON.stringify({ open: true, history: [], log: [] }));
    });

    it("rejects a non-boolean open flag", () => {
      reject(JSON.stringify({ v: SESSION_VERSION, open: "yes", history: [], log: [] }));
    });

    it("rejects a non-array history or log", () => {
      reject(JSON.stringify({ v: SESSION_VERSION, open: true, history: "ls", log: [] }));
      reject(JSON.stringify({ v: SESSION_VERSION, open: true, history: [], log: {} }));
    });

    it("rejects a log line with a non-string text or an unknown kind", () => {
      reject(JSON.stringify({ v: SESSION_VERSION, open: true, history: [], log: [{ t: 5, k: 0 }] }));
      reject(JSON.stringify({ v: SESSION_VERSION, open: true, history: [], log: [{ t: "x", k: 99 }] }));
    });

    it("rejects a history entry that is not a string", () => {
      reject(JSON.stringify({ v: SESSION_VERSION, open: true, history: [1, 2], log: [] }));
    });
  });
});
