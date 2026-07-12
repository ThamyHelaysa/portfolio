import { beforeEach, describe, expect, it, vi } from "vitest";

const gsapMock = vi.hoisted(() => ({
  to: vi.fn(),
  timeline: vi.fn(),
}));

vi.mock("gsap", () => ({ gsap: gsapMock }));

const { getThemeMock, setThemeMock } = vi.hoisted(() => ({
  getThemeMock: vi.fn(() => "pinky"),
  setThemeMock: vi.fn(),
}));

vi.mock("../../../../src/_helpers/theme.ts", () => ({
  getTheme: getThemeMock,
  setTheme: setThemeMock,
}));

import { createSharedCommands } from "../../../../src/_helpers/terminal/commands.ts";
import { setIdentity } from "../../../../src/_helpers/identity.ts";
import { CommandType } from "../../../../src/_helpers/terminal/core.ts";
import { parseCommand } from "../../../../src/_helpers/terminal/parser.ts";

type Line = { text: string; kind: CommandType | undefined };

function makeIo() {
  const lines: Line[] = [];
  return {
    lines,
    io: {
      append: async (text: string, _duration?: number, kind?: CommandType) => {
        lines.push({ text, kind });
      },
    },
  };
}

async function run(
  commands: ReturnType<typeof createSharedCommands>,
  input: string
): Promise<void> {
  const parsed = parseCommand(input);
  await commands[parsed.cmd]!(parsed);
}

beforeEach(() => {
  sessionStorage.clear();
  getThemeMock.mockClear();
  setThemeMock.mockClear();
  getThemeMock.mockReturnValue("pinky");
});

describe("createSharedCommands registry", () => {
  it("exposes exactly the shared Commands", () => {
    const { io } = makeIo();
    expect(Object.keys(createSharedCommands(io)).sort()).toEqual(["theme", "whoami"]);
  });
});

describe("theme (shared Command)", () => {
  it("echoes the raw input as a command line first", async () => {
    const { io, lines } = makeIo();
    await run(createSharedCommands(io), "theme dark");
    expect(lines[0]).toEqual({ text: "theme dark", kind: CommandType.command });
  });

  it("bare theme toggles away from the current theme", async () => {
    const { io, lines } = makeIo();
    await run(createSharedCommands(io), "theme");
    expect(setThemeMock).toHaveBeenCalledWith("dark");
    expect(lines.at(-1)).toEqual({ text: "theme → dark", kind: CommandType.status });
  });

  it("toggles back to pinky when the current theme is dark", async () => {
    getThemeMock.mockReturnValue("dark");
    const { io } = makeIo();
    await run(createSharedCommands(io), "theme");
    expect(setThemeMock).toHaveBeenCalledWith("pinky");
  });

  it("sets an explicit theme", async () => {
    const { io, lines } = makeIo();
    await run(createSharedCommands(io), "theme dark");
    expect(setThemeMock).toHaveBeenCalledWith("dark");
    expect(lines.at(-1)).toEqual({ text: "theme → dark", kind: CommandType.status });
  });

  it("accepts light as an alias for pinky on every surface", async () => {
    const { io, lines } = makeIo();
    await run(createSharedCommands(io), "theme light");
    expect(setThemeMock).toHaveBeenCalledWith("pinky");
    expect(lines.at(-1)).toEqual({ text: "theme → pinky", kind: CommandType.status });
  });

  it("rejects unknown values without touching the theme", async () => {
    const { io, lines } = makeIo();
    await run(createSharedCommands(io), "theme neon");
    expect(setThemeMock).not.toHaveBeenCalled();
    expect(lines.at(-1)).toEqual({
      text: 'theme: unknown "neon" — try: dark, pinky',
      kind: CommandType.error,
    });
  });
});

describe("whoami (shared Command)", () => {
  it("prints the identity from the shared identity seam", async () => {
    setIdentity("ghost_reader::4242");
    const { io, lines } = makeIo();
    await run(createSharedCommands(io), "whoami");
    expect(lines[0]).toEqual({ text: "whoami", kind: CommandType.command });
    expect(lines.at(-1)).toEqual({ text: "ghost_reader::4242", kind: CommandType.info });
  });

  it("wraps the identity with the surface's flavor when provided", async () => {
    setIdentity("ghost_reader::4242");
    const { io, lines } = makeIo();
    const commands = createSharedCommands(io, {
      whoamiFlavor: (id) => `you are ${id} — guest of book_os υ.υ`,
    });
    await run(commands, "whoami");
    expect(lines.at(-1)).toEqual({
      text: "you are ghost_reader::4242 — guest of book_os υ.υ",
      kind: CommandType.info,
    });
  });

  it("reads the identity fresh on each run", async () => {
    const { io, lines } = makeIo();
    const commands = createSharedCommands(io);
    setIdentity("first_name::0001");
    await run(commands, "whoami");
    setIdentity("second_name::0002");
    await run(commands, "whoami");
    expect(lines[1].text).toBe("first_name::0001");
    expect(lines[3].text).toBe("second_name::0002");
  });
});
