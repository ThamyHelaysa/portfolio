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
          "author": "Jane Harper"
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

    expect(revealSpy).not.toHaveBeenCalled();
    expect(element.booted).toBe(true);
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
    const logSpy = vi.spyOn(element as any, "appendToLog");
    logSpy.mockResolvedValue(undefined);

    await (element as any).displayNextBatch();

    expect(renderSpy).not.toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith("\n[012] A seca", 0.15, 1);
    expect(logSpy).toHaveBeenCalledWith("      Jane Harper", 0.15, 1);

    const callbacks = rafQueue.splice(0);
    callbacks.forEach((cb) => cb(16));
    await Promise.resolve();

    expect(renderSpy).toHaveBeenCalledTimes(1);
  });
});
