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

const fixtureEntries = vi.hoisted(() => [
  { section: "pages", title: "About me", url: "/about/", description: "Who I am" },
  { section: "blog", title: "Spinning vinyl", url: "/blog/2025/spinning-vinyl/", description: "A CSS record player" },
  { section: "books", title: "The Dispossessed", url: "/books/the-dispossessed/", description: "Le Guin on walls" },
]);

vi.mock("../../../../src/_helpers/terminal/site-index.ts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../../src/_helpers/terminal/site-index.ts")>();
  return { ...actual, fetchSiteIndex: () => Promise.resolve(fixtureEntries) };
});

import { createSharedCommands } from "../../../../src/_helpers/terminal/commands.ts";
import { setIdentity } from "../../../../src/_helpers/identity.ts";
import { CommandType } from "../../../../src/_helpers/terminal/core.ts";
import { parseCommand } from "../../../../src/_helpers/terminal/parser.ts";
import { flattenBlock, type Block } from "../../../../src/_helpers/terminal/blocks.ts";

type Line = { text: string; kind: CommandType | undefined };

function makeIo() {
  const lines: Line[] = [];
  const blocks: Block[] = [];
  return {
    lines,
    blocks,
    io: {
      append: async (text: string, _duration?: number, kind?: CommandType) => {
        lines.push({ text, kind });
      },
      render: async (block: Block) => {
        blocks.push(block);
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
    expect(Object.keys(createSharedCommands(io)).sort()).toEqual([
      "cat",
      "grep",
      "ls",
      "theme",
      "whoami",
    ]);
  });
});

describe("ls (shared Command)", () => {
  it("echoes the raw input as a command line first", async () => {
    const { io, lines } = makeIo();
    await run(createSharedCommands(io), "ls");
    expect(lines[0]).toEqual({ text: "ls", kind: CommandType.command });
  });

  it("renders the root listing as a section block on bare ls", async () => {
    const { io, blocks } = makeIo();
    await run(createSharedCommands(io), "ls");
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe("section");
    const flat = flattenBlock(blocks[0]);
    expect(flat).toContain("~/book_os");
    expect(flat).toContain("blog/");
    expect(flat).toContain("about");
  });

  it("prints a tree for a folder target", async () => {
    const { io, lines } = makeIo();
    await run(createSharedCommands(io), "ls blog");
    expect(lines[1].text).toBe("blog/");
    expect(lines.some((l) => l.text.includes("spinning-vinyl"))).toBe(true);
  });

  it("prints title and description for a leaf target", async () => {
    const { io, lines } = makeIo();
    await run(createSharedCommands(io), "ls spinning-vinyl");
    expect(lines[1]).toEqual({ text: "Spinning vinyl", kind: CommandType.title });
    expect(lines[2]).toEqual({ text: "A CSS record player", kind: CommandType.logdata });
  });

  it("errors on an unknown target", async () => {
    const { io, lines } = makeIo();
    await run(createSharedCommands(io), "ls nope");
    expect(lines.at(-1)).toEqual({ text: "ls: nope: no such page", kind: CommandType.error });
  });
});

describe("grep (shared Command)", () => {
  it("prints usage without a term", async () => {
    const { io, lines } = makeIo();
    await run(createSharedCommands(io), "grep");
    expect(lines.at(-1)).toEqual({ text: "usage: grep <term>", kind: CommandType.info });
  });

  it("matches titles case-insensitively and renders linked results", async () => {
    const { io, blocks } = makeIo();
    await run(createSharedCommands(io), "grep VINYL");
    expect(blocks).toHaveLength(1);
    const flat = flattenBlock(blocks[0]);
    expect(flat).toContain("Spinning vinyl");
    expect(flat).not.toContain("About me");
  });

  it("matches descriptions too", async () => {
    const { io, blocks } = makeIo();
    await run(createSharedCommands(io), "grep guin");
    expect(flattenBlock(blocks[0])).toContain("The Dispossessed");
  });

  it("errors when nothing matches", async () => {
    const { io, lines, blocks } = makeIo();
    await run(createSharedCommands(io), "grep zzz");
    expect(blocks).toHaveLength(0);
    expect(lines.at(-1)).toEqual({ text: 'grep: no matches for "zzz"', kind: CommandType.error });
  });
});

describe("cat (shared Command)", () => {
  it("prints usage without a target", async () => {
    const { io, lines } = makeIo();
    await run(createSharedCommands(io), "cat");
    expect(lines.at(-1)).toEqual({ text: "usage: cat <page>", kind: CommandType.info });
  });

  it("prints title and description for a page", async () => {
    const { io, lines } = makeIo();
    await run(createSharedCommands(io), "cat about");
    expect(lines[1]).toEqual({ text: "About me", kind: CommandType.title });
    expect(lines[2]).toEqual({ text: "Who I am", kind: CommandType.logdata });
  });

  it("refuses folders and points at ls", async () => {
    const { io, lines } = makeIo();
    await run(createSharedCommands(io), "cat blog");
    expect(lines.at(-1)).toEqual({
      text: "cat: blog: is a folder — try: ls blog",
      kind: CommandType.error,
    });
  });

  it("errors on an unknown target", async () => {
    const { io, lines } = makeIo();
    await run(createSharedCommands(io), "cat nope");
    expect(lines.at(-1)).toEqual({ text: "cat: nope: no such page", kind: CommandType.error });
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
