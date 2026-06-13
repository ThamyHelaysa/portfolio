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
});
