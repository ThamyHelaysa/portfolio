import { describe, expect, it } from "vitest";

import { parseCommand } from "../../../../src/_helpers/terminal/parser.ts";

describe("parseCommand", () => {
  it("lowercases the command and normalizes surrounding whitespace", () => {
    const parsed = parseCommand("  LIST  ");

    expect(parsed.cmd).toBe("list");
    expect(parsed.raw).toBe("LIST");
    expect(parsed.flags).toEqual({});
    expect(parsed.positionals).toEqual([]);
  });

  it("collects bare tokens after the command as positionals", () => {
    const parsed = parseCommand("book id 5");

    expect(parsed.cmd).toBe("book");
    expect(parsed.positionals).toEqual(["id", "5"]);
  });

  it("treats a trailing --flag as boolean true", () => {
    const parsed = parseCommand("list --all");

    expect(parsed.flags).toEqual({ all: true });
    expect(parsed.positionals).toEqual([]);
  });

  it("pairs --flag with the following bare token, preserving the value casing", () => {
    const parsed = parseCommand("book --ART Book5 7");

    expect(parsed.flags).toEqual({ art: "Book5" });
    expect(parsed.positionals).toEqual(["7"]);
  });

  it("returns empty raw and cmd for whitespace-only input", () => {
    const parsed = parseCommand("   ");

    expect(parsed.raw).toBe("");
    expect(parsed.cmd).toBe("");
    expect(parsed.flags).toEqual({});
    expect(parsed.positionals).toEqual([]);
  });
});
