import { describe, expect, it } from "vitest";

import { CommandType, commandBadge, commandGlyph } from "../../../../src/_helpers/terminal/core.ts";

describe("commandBadge", () => {
  it("labels title, error, status, and info lines", () => {
    expect(commandBadge(CommandType.title)).toBe("TITLE");
    expect(commandBadge(CommandType.error)).toBe("ERR");
    expect(commandBadge(CommandType.status)).toBe("OK");
    expect(commandBadge(CommandType.info)).toBe("INFO");
  });

  it("gives no badge to command, log, and logdata lines", () => {
    expect(commandBadge(CommandType.command)).toBeUndefined();
    expect(commandBadge(CommandType.log)).toBeUndefined();
    expect(commandBadge(CommandType.logdata)).toBeUndefined();
  });
});

describe("commandGlyph", () => {
  it("marks title, error, status, and info lines", () => {
    expect(commandGlyph(CommandType.title)).toBe("▮");
    expect(commandGlyph(CommandType.error)).toBe("✗");
    expect(commandGlyph(CommandType.status)).toBe("✓");
    expect(commandGlyph(CommandType.info)).toBe("▸");
  });

  it("badge and glyph cover exactly the same kinds", () => {
    for (const kind of [
      CommandType.log,
      CommandType.logdata,
      CommandType.command,
      CommandType.title,
      CommandType.error,
      CommandType.status,
      CommandType.info,
    ]) {
      expect(commandGlyph(kind) === undefined).toBe(commandBadge(kind) === undefined);
    }
  });
});
