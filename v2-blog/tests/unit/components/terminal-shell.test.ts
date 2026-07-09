import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  gsapMock,
  getCachedNameMock,
  getFullIdentityMock,
  cacheNameMock,
  resizeObserveMock,
  resizeDisconnectMock,
} = vi.hoisted(() => ({
  gsapMock: {
    to: vi.fn((_target, options?: { onUpdate?: () => void; onComplete?: () => void }) => {
      options?.onUpdate?.();
      options?.onComplete?.();
      return {};
    }),
  },
  getCachedNameMock: vi.fn(() => null),
  getFullIdentityMock: vi.fn(() => "echo_shell::1111"),
  cacheNameMock: vi.fn(),
  resizeObserveMock: vi.fn(),
  resizeDisconnectMock: vi.fn(),
}));

vi.mock("gsap", () => ({
  gsap: gsapMock,
}));

const { getThemeMock, setThemeMock } = vi.hoisted(() => ({
  getThemeMock: vi.fn(() => "pinky"),
  setThemeMock: vi.fn(),
}));

vi.mock("../../../src/_helpers/theme.ts", () => ({
  getTheme: getThemeMock,
  setTheme: setThemeMock,
}));

vi.mock("../../../src/_helpers/identityManager.ts", () => {
  const identityInstance = {
    getCachedName: getCachedNameMock,
    getFullIdentity: getFullIdentityMock,
    cacheName: cacheNameMock,
  };

  return {
    IDMode: {
      default: 0,
      random: 1,
    },
    IdentityManager: class {
      static getInstance() {
        return identityInstance;
      }
    },
  };
});

import { TerminalShell } from "../../../src/components/terminal-shell.ts";
import { isUnlocked } from "../../../src/_helpers/terminal/unlock.ts";

function listingMarkup() {
  return `
    <header class="terminal-header">
      <span>Time:</span>
    </header>
    <div id="results-area">
      <pre id="ascii-area" class="ascii-art-container"></pre>
      <script id="raw-book-data" type="application/json">[
        {
          "id": "012",
          "title": "A seca",
          "author": "Jane Harper",
          "url": "/books/a-seca/"
        }
      ]</script>
    </div>
  `;
}

function detailMarkup() {
  return `
    <header class="terminal-header">
      <span>Time:</span>
    </header>
    <div id="results-area">
      <pre id="ascii-area" class="ascii-art-container"></pre>
      <div class="book-template" data-title="A seca">
        <div class="book-info">
          <h2 class="title-placeholder"></h2>
          <p>AUTHOR: Jane Harper</p>
          <div class="book-content">
            <p>A federal agent returns to his hometown.</p>
          </div>
        </div>
      </div>
    </div>
  `;
}

function mountTerminalShell(markup: string) {
  const element = new TerminalShell();
  element.innerHTML = markup;
  document.body.appendChild(element);
  return element;
}

describe("terminal-shell startup phases", () => {
  let rafQueue: FrameRequestCallback[] = [];

  beforeEach(() => {
    rafQueue = [];
    getCachedNameMock.mockReset();
    getCachedNameMock.mockReturnValue(null);
    getFullIdentityMock.mockReset();
    getFullIdentityMock.mockReturnValue("echo_shell::1111");
    cacheNameMock.mockReset();
    getThemeMock.mockReset();
    getThemeMock.mockReturnValue("pinky");
    setThemeMock.mockReset();
    resizeObserveMock.mockReset();
    resizeDisconnectMock.mockReset();
    gsapMock.to.mockClear();

    Object.defineProperty(globalThis, "ResizeObserver", {
      configurable: true,
      writable: true,
      value: class {
        observe = resizeObserveMock;
        disconnect = resizeDisconnectMock;
      },
    });

    globalThis.requestAnimationFrame = vi.fn((cb: FrameRequestCallback) => {
      rafQueue.push(cb);
      return rafQueue.length;
    }) as typeof requestAnimationFrame;

    globalThis.cancelAnimationFrame = vi.fn((id: number) => {
      const index = id - 1;
      if (index >= 0 && index < rafQueue.length) {
        rafQueue[index] = () => 0;
      }
    }) as typeof cancelAnimationFrame;
  });

  it("defers the boot sequence until the post-paint phase", async () => {
    const startSpy = vi
      .spyOn(TerminalShell.prototype, "startBootSequence")
      .mockResolvedValue(undefined);

    const element = mountTerminalShell(listingMarkup());
    await element.updateComplete;

    expect(startSpy).not.toHaveBeenCalled();

    while (rafQueue.length) {
      const callbacks = rafQueue.splice(0);
      callbacks.forEach((cb) => cb(16));
      await Promise.resolve();
    }

    expect(startSpy).toHaveBeenCalledTimes(1);

    startSpy.mockRestore();
  });

  it("does not treat the listing route as a direct-book reveal", async () => {
    const element = mountTerminalShell(listingMarkup());
    await element.updateComplete;

    const revealSpy = vi.spyOn(element as any, "handleDirectAccessReveal");
    revealSpy.mockResolvedValue(undefined);

    const appendSpy = vi.spyOn(element as any, "appendToLog");
    appendSpy.mockResolvedValue(undefined);

    await element.startBootSequence();
    await element.updateComplete;

    expect(revealSpy).not.toHaveBeenCalled();
    // booted is now internal state; assert its observable effect: input is enabled.
    expect(element.querySelector("#terminal-input")?.hasAttribute("disabled")).toBe(false);
    expect(appendSpy).toHaveBeenCalled();
  });

  it("keeps boot copy immediate instead of waiting on long typing delays", async () => {
    const element = mountTerminalShell(listingMarkup());
    await element.updateComplete;

    const appendSpy = vi.spyOn(element as any, "appendToLog");
    appendSpy.mockResolvedValue(undefined);

    await element.startBootSequence();

    expect(appendSpy).toHaveBeenNthCalledWith(1, "Welcome to book_os", 0, 3);
    expect(appendSpy).toHaveBeenNthCalledWith(
      2,
      "Its raining outside, and you find shelter inside my library, make yourself at home and explore around.",
      0,
      0
    );
    expect(appendSpy).toHaveBeenNthCalledWith(3, "TYPE 'HELP' FOR COMMANDS.", 0, 0);
  });

  it("loads hidden listing data only when the interaction phase needs it", async () => {
    const element = mountTerminalShell(listingMarkup());
    await element.updateComplete;

    expect(element.querySelector("#raw-book-data")).not.toBeNull();
    expect((element as any).bookData).toEqual([]);

    (element as any)._ensureBookDataLoaded();

    expect((element as any).bookData).toEqual([
      {
        id: "012",
        title: "A seca",
        author: "Jane Harper",
        url: "/books/a-seca/",
      },
    ]);
    expect(element.querySelector("#raw-book-data")).toBeNull();
  });

  it("falls back safely when the embedded listing payload is invalid", async () => {
    const element = mountTerminalShell(`
      <div id="results-area">
        <pre id="ascii-area" class="ascii-art-container"></pre>
        <script id="raw-book-data" type="application/json">{not json</script>
      </div>
    `);
    await element.updateComplete;

    (element as any)._ensureBookDataLoaded();

    expect((element as any).bookData).toEqual([]);
    expect(element.querySelector("#raw-book-data")).toBeNull();
  });

  it("hydrates identity and caret observer only during interaction startup", async () => {
    const element = mountTerminalShell(detailMarkup());
    await element.updateComplete;

    expect(getFullIdentityMock).not.toHaveBeenCalled();
    expect(cacheNameMock).not.toHaveBeenCalled();
    expect(resizeObserveMock).not.toHaveBeenCalled();
    expect(element.userID).toBe("reader");

    (element as any)._ensureInteractionStartup();

    expect(getFullIdentityMock).toHaveBeenCalledTimes(1);
    expect(cacheNameMock).toHaveBeenCalledWith("echo_shell::1111");
    expect(resizeObserveMock).toHaveBeenCalledTimes(1);
    expect(element.userID).toBe("echo_shell::1111");
  });

  it("renders direct-book titles immediately without title animation setup", async () => {
    const element = mountTerminalShell(detailMarkup());
    await element.updateComplete;

    await (element as any).handleDirectAccessReveal();

    const title = element.querySelector(".title-placeholder");
    expect(title?.textContent).toBe("A seca");
  });

  it("queues ascii rendering so listing output does not wait on art generation", async () => {
    const element = mountTerminalShell(listingMarkup());
    await element.updateComplete;
    (element as any)._ensureBookDataLoaded();

    const renderSpy = vi
      .spyOn(element as any, "_renderAsciiForBook")
      .mockImplementation(() => new Promise<void>(() => undefined));

    await (element as any).displayNextBatch();

    expect(renderSpy).not.toHaveBeenCalled();
    expect(element.querySelector("#boot-log .terminal-cols")).not.toBeNull();

    const callbacks = rafQueue.splice(0);
    callbacks.forEach((cb) => cb(16));
    await Promise.resolve();

    expect(renderSpy).toHaveBeenCalledTimes(1);
  });

  it("lists books as structured rows: muted id, linked title, author", async () => {
    const element = mountTerminalShell(listingMarkup());
    await element.updateComplete;
    (element as any)._ensureBookDataLoaded();
    vi.spyOn(element as any, "_renderAsciiForBook").mockResolvedValue(undefined);

    await (element as any).displayNextBatch();

    const log = element.querySelector("#boot-log")!;
    const row = log.querySelector(".terminal-cols")!;
    const cells = row.querySelectorAll(".terminal-cell");
    expect((cells[0] as HTMLElement).textContent).toBe("[012]");
    expect((cells[0] as HTMLElement).dataset.tone).toBe("muted");

    const title = row.querySelector("a.terminal-cell") as HTMLAnchorElement;
    expect(title.textContent).toBe("A seca");
    expect(title.getAttribute("href")).toBe("/books/a-seca/");

    expect((cells[2] as HTMLElement).textContent).toBe("Jane Harper");
  });

  it("opens the listing with a Bookshelf title only on the first batch", async () => {
    const element = mountTerminalShell(listingMarkup());
    await element.updateComplete;
    (element as any)._ensureBookDataLoaded();
    vi.spyOn(element as any, "_renderAsciiForBook").mockResolvedValue(undefined);

    await (element as any).displayNextBatch();

    const log = element.querySelector("#boot-log")!;
    const titles = log.querySelectorAll("p.terminal-msg.title");
    expect(titles).toHaveLength(1);
    expect(titles[0].textContent).toBe("Bookshelf — 1 record");
    expect(titles[0].getAttribute("data-badge")).toBe("TITLE");
  });

  it("open <id> errs with the no-book message for unknown ids", async () => {
    const element = mountTerminalShell(listingMarkup());
    await element.updateComplete;

    await (element as any)._executeCommand("open 999");

    const error = element.querySelector("#boot-log p.terminal-msg.error")!;
    expect(error.textContent).toBe("no book #999 >.<");
    expect(error.getAttribute("data-badge")).toBe("ERR");
  });

  it("open <id> navigates to the matching book's page (lenient about leading zeros)", async () => {
    const element = mountTerminalShell(listingMarkup());
    await element.updateComplete;

    const navSpy = vi.spyOn(element as any, "_navigateTo").mockImplementation(() => undefined);

    await (element as any)._executeCommand("open 12");

    expect(element.querySelector("#boot-log p.terminal-msg.status")?.textContent)
      .toBe("opening [012] A seca...");
    expect(navSpy).toHaveBeenCalledWith("/books/a-seca/");
  });

  it("book <id> stays as an alias of open", async () => {
    const element = mountTerminalShell(listingMarkup());
    await element.updateComplete;

    const navSpy = vi.spyOn(element as any, "_navigateTo").mockImplementation(() => undefined);

    await (element as any)._executeCommand("book 012");

    expect(navSpy).toHaveBeenCalledWith("/books/a-seca/");
  });

  it("theme <value> sets the theme and confirms with an OK line", async () => {
    const element = mountTerminalShell(listingMarkup());
    await element.updateComplete;

    await (element as any)._executeCommand("theme dark");

    expect(setThemeMock).toHaveBeenCalledWith("dark");
    expect(element.querySelector("#boot-log p.terminal-msg.status")?.textContent)
      .toBe("theme → dark");
  });

  it("bare theme toggles away from the current theme", async () => {
    const element = mountTerminalShell(listingMarkup());
    await element.updateComplete;
    getThemeMock.mockReturnValue("pinky");

    await (element as any)._executeCommand("theme");

    expect(setThemeMock).toHaveBeenCalledWith("dark");
  });

  it("theme rejects unknown values with an ERR line", async () => {
    const element = mountTerminalShell(listingMarkup());
    await element.updateComplete;

    await (element as any)._executeCommand("theme neon");

    expect(setThemeMock).not.toHaveBeenCalled();
    expect(element.querySelector("#boot-log p.terminal-msg.error")?.textContent)
      .toBe('theme: unknown "neon" — try: dark, pinky');
  });

  it("whoami answers with an INFO identity line", async () => {
    const element = mountTerminalShell(listingMarkup());
    await element.updateComplete;
    (element as any)._ensureInteractionStartup();

    await (element as any)._executeCommand("whoami");

    const info = element.querySelector("#boot-log p.terminal-msg.info")!;
    expect(info.textContent).toBe("you are echo_shell::1111 — guest of book_os υ.υ");
    expect(info.getAttribute("data-badge")).toBe("INFO");
  });

  it("help prints the command palette as one INFO line on desktop", async () => {
    const element = mountTerminalShell(listingMarkup());
    await element.updateComplete;

    await (element as any)._executeCommand("help");

    const info = element.querySelector("#boot-log p.terminal-msg.info")!;
    expect(info.textContent).toBe("help · list · open <id> · theme · whoami υ.υ");
  });

  it("ends the final batch with the open-a-card hint", async () => {
    const element = mountTerminalShell(listingMarkup());
    await element.updateComplete;
    (element as any)._ensureBookDataLoaded();
    vi.spyOn(element as any, "_renderAsciiForBook").mockResolvedValue(undefined);

    await (element as any).displayNextBatch();

    const status = element.querySelector("#boot-log p.terminal-msg.status")!;
    expect(status.textContent).toBe("type 'open <id>' to read a card :)))");
    expect(status.getAttribute("data-badge")).toBe("OK");
  });
});

describe("terminal-shell unlock", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("unlocks the site-wide cheat console on connect (visiting the books page)", () => {
    expect(isUnlocked()).toBe(false);

    mountTerminalShell(listingMarkup());

    expect(isUnlocked()).toBe(true);
  });
});
