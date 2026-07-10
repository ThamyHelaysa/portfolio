import { describe, expect, it } from "vitest";

import { CommandType, commandBadge } from "../../../../src/_helpers/terminal/core.ts";

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
