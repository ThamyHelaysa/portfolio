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

  describe("render (structured blocks)", () => {
    it("renders a text block as a classed paragraph (with a badge for badged kinds)", async () => {
      const { core, logEl } = createCore();

      await core.render({ type: "text", text: "hi there", kind: CommandType.status });

      const p = logEl.querySelector("p.terminal-msg.status")!;
      expect(p.textContent).toBe("hi there");
      expect(p.getAttribute("data-badge")).toBe("OK");
    });

    it("renders a columns block as a grid with tone/align on cells, padding short rows", async () => {
      const { core, logEl } = createCore();

      await core.render({
        type: "columns",
        rows: [
          [{ text: "blog/" }, { text: "3", tone: "muted", align: "end" }],
          [{ text: "about" }],
        ],
      });

      const grid = logEl.querySelector(".terminal-cols") as HTMLElement;
      expect(grid).not.toBeNull();
      // 2 columns inferred from the widest row; short row padded to 2 cells.
      const cells = grid.querySelectorAll(".terminal-cell");
      expect(cells).toHaveLength(4);
      expect(grid.style.gridTemplateColumns).toContain("repeat(2");

      const count = cells[1] as HTMLElement;
      expect(count.textContent).toBe("3");
      expect(count.dataset.tone).toBe("muted");
      expect(count.dataset.align).toBe("end");
    });

    it("renders a section with a title, tone, and nested body", async () => {
      const { core, logEl } = createCore();

      await core.render({
        type: "section",
        title: "site",
        tone: "surface",
        body: [{ type: "text", text: "inside" }],
      });

      const section = logEl.querySelector("section.terminal-section") as HTMLElement;
      expect(section).not.toBeNull();
      expect(section.dataset.tone).toBe("surface");
      expect(section.querySelector(".terminal-section-title")!.textContent).toBe("site");
      expect(section.querySelector("p.terminal-msg")!.textContent).toBe("inside");
    });
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
    expect(error?.textContent).toBe("Command not found: frobnicate");
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
