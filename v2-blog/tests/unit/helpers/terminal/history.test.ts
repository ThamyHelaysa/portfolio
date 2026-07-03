import { describe, expect, it } from "vitest";

import { CommandHistory } from "../../../../src/_helpers/terminal/history.ts";

describe("CommandHistory", () => {
  it("walks back to the most recent command with prev", () => {
    const history = new CommandHistory();

    history.push("list");
    history.push("book 5");

    expect(history.prev()).toBe("book 5");
    expect(history.prev()).toBe("list");
  });

  it("does not record the same command twice in a row", () => {
    const history = new CommandHistory();

    history.push("list");
    history.push("book 5");
    history.push("book 5");

    expect(history.prev()).toBe("book 5");
    expect(history.prev()).toBe("list");
  });

  it("clamps at the oldest entry when stepping past the beginning", () => {
    const history = new CommandHistory();

    history.push("list");

    expect(history.prev()).toBe("list");
    expect(history.prev()).toBe("list");
  });

  it("walks forward with next and yields empty string past the newest entry", () => {
    const history = new CommandHistory();

    history.push("list");
    history.push("book 5");
    history.prev();
    history.prev();

    expect(history.next()).toBe("book 5");
    expect(history.next()).toBe("");
    expect(history.next()).toBe("");
  });

  it("signals no movement on an empty history", () => {
    const history = new CommandHistory();

    expect(history.prev()).toBeUndefined();
    expect(history.next()).toBeUndefined();
  });

  describe("load", () => {
    it("rehydrates the buffer and parks the cursor past the newest entry", () => {
      const history = new CommandHistory();

      history.load(["list", "book 5"]);

      // cursor sits past the newest, so prev walks the loaded entries
      expect(history.prev()).toBe("book 5");
      expect(history.prev()).toBe("list");
    });

    it("replaces any prior entries rather than appending", () => {
      const history = new CommandHistory();
      history.push("stale");

      history.load(["fresh"]);

      expect(history.prev()).toBe("fresh");
      expect(history.prev()).toBe("fresh");
    });

    it("clones the input so later external mutation does not leak in", () => {
      const history = new CommandHistory();
      const entries = ["one"];

      history.load(entries);
      entries.push("two");

      expect(history.prev()).toBe("one");
      expect(history.prev()).toBe("one");
    });

    it("ignores non-array input and tolerates an empty list", () => {
      const history = new CommandHistory();
      history.push("kept");

      history.load([]);
      expect(history.prev()).toBeUndefined();

      // defensive against tampered storage
      history.load(undefined as unknown as string[]);
      expect(history.prev()).toBeUndefined();
    });
  });

  describe("snapshot", () => {
    it("returns the entries oldest-first as a defensive copy", () => {
      const history = new CommandHistory();
      history.push("list");
      history.push("book 5");

      const snap = history.snapshot();
      expect(snap).toEqual(["list", "book 5"]);

      // mutating the snapshot must not affect the buffer
      snap.push("hack");
      expect(history.snapshot()).toEqual(["list", "book 5"]);
    });

    it("round-trips through load", () => {
      const a = new CommandHistory();
      a.push("one");
      a.push("two");

      const b = new CommandHistory();
      b.load(a.snapshot());

      expect(b.prev()).toBe("two");
      expect(b.prev()).toBe("one");
    });
  });
});
