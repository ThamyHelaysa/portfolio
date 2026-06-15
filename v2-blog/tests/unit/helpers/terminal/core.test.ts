import { beforeEach, describe, expect, it, vi } from "vitest";

import { CommandType, TerminalCore } from "../../../../src/_helpers/terminal/core.ts";

function createCore(overrides?: Partial<ConstructorParameters<typeof TerminalCore>[0]>) {
  const logEl = document.createElement("pre");
  document.body.appendChild(logEl);

  const core = new TerminalCore({
    commands: {},
    logEl: () => logEl,
    skipAnimations: () => true,
    ...overrides,
  });

  return { core, logEl };
}

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("TerminalCore", () => {
  it("runs the matching command handler with the parsed context", async () => {
    const list = vi.fn();
    const { core } = createCore({ commands: { list } });

    await core.run("list --all");

    expect(list).toHaveBeenCalledTimes(1);
    expect(list).toHaveBeenCalledWith(
      expect.objectContaining({ cmd: "list", raw: "list --all", flags: { all: true } })
    );
  });

  it("appends one classed paragraph per line, instantly, when animations are skipped", async () => {
    const { core, logEl } = createCore();

    await core.append("first\r\nsecond", 0.2, CommandType.logdata);

    const lines = logEl.querySelectorAll("p.terminal-msg.logdata");
    expect(lines).toHaveLength(2);
    expect(lines[0].textContent).toBe("first");
    expect(lines[1].textContent).toBe("second");
  });

  it("types each line through the injected animation when animations are on", async () => {
    const typeText = vi.fn(async (el: HTMLElement, text: string) => {
      el.textContent = text;
    });
    const { core, logEl } = createCore({ skipAnimations: () => false, typeText });

    await core.append("first\nsecond", 0.5, CommandType.log);

    expect(typeText).toHaveBeenCalledTimes(2);
    expect(typeText).toHaveBeenNthCalledWith(1, expect.any(HTMLElement), "first", 0.5);
    expect(typeText).toHaveBeenNthCalledWith(2, expect.any(HTMLElement), "second", 0.5);
    expect(logEl.querySelectorAll("p.terminal-msg.log")[1].textContent).toBe("second");
  });

  it("stamps a data-badge on badged kinds and omits it on plain kinds", async () => {
    const { core, logEl } = createCore();

    await core.append("uh oh", 0, CommandType.error);
    await core.append("just info", 0, CommandType.log);

    expect(logEl.querySelector("p.error")?.getAttribute("data-badge")).toBe("ERR");
    expect(logEl.querySelector("p.log")?.hasAttribute("data-badge")).toBe(false);
  });

  it("notifies onLineWritten after each appended line", async () => {
    const onLineWritten = vi.fn();
    const { core, logEl } = createCore({ onLineWritten });

    await core.append("first\nsecond", 0, CommandType.log);

    expect(onLineWritten).toHaveBeenCalledTimes(2);
    expect(logEl.querySelectorAll("p")).toHaveLength(2);
  });

  it("passes each written line's text and kind to onLineWritten", async () => {
    const onLineWritten = vi.fn();
    const { core } = createCore({ onLineWritten });

    await core.append("first\nsecond", 0, CommandType.error);

    expect(onLineWritten).toHaveBeenNthCalledWith(1, { text: "first", kind: CommandType.error });
    expect(onLineWritten).toHaveBeenNthCalledWith(2, { text: "second", kind: CommandType.error });
  });

  it("records executed commands in history", async () => {
    const { core } = createCore({ commands: { list: vi.fn() } });

    await core.run("list");

    expect(core.history.prev()).toBe("list");
  });

  it("logs an error line for unrecognized commands and still records them", async () => {
    const { core, logEl } = createCore();

    await core.run("frobnicate");

    const error = logEl.querySelector("p.terminal-msg.error");
    expect(error?.textContent).toBe("COMMAND NOT RECOGNIZED: frobnicate");
    expect(core.history.prev()).toBe("frobnicate");
  });

  it("ignores empty input entirely: no handler, no history, no log", async () => {
    const list = vi.fn();
    const { core, logEl } = createCore({ commands: { list } });

    await core.run("   ");

    expect(list).not.toHaveBeenCalled();
    expect(core.history.prev()).toBeUndefined();
    expect(logEl.children).toHaveLength(0);
  });
});
