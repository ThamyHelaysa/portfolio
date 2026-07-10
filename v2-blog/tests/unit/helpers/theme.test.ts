import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  applyTheme,
  getTheme,
  setTheme,
  THEME_CHANGE_EVENT,
  THEME_STORAGE_KEY,
} from "../../../src/_helpers/theme.ts";

function stubSystemDark(enabled: boolean) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query.includes("prefers-color-scheme") ? enabled : false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  });
}

/**
 * Stubs document.startViewTransition with a controllable fake: the update
 * callback runs asynchronously (like the real API, so dataset.theme is stale
 * when same-tick echoes arrive) and `finished` resolves on demand.
 */
function stubViewTransition() {
  let resolveFinished!: () => void;
  const finished = new Promise<void>((r) => {
    resolveFinished = r;
  });
  const start = vi.fn((cb: () => void) => {
    const updateCallbackDone = Promise.resolve().then(() => cb());
    return {
      finished,
      ready: updateCallbackDone,
      updateCallbackDone,
      skipTransition: vi.fn(),
    };
  });
  document.startViewTransition = start as unknown as typeof document.startViewTransition;
  return { start, resolveFinished };
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
  document.documentElement.removeAttribute("data-theme-pending");
  document.documentElement.classList.remove("dark", "theme-vt");
});

afterEach(() => {
  delete (document as { startViewTransition?: unknown }).startViewTransition;
  vi.restoreAllMocks();
});

describe("theme helper", () => {
  it("applyTheme sets the document data-theme and dark class", () => {
    applyTheme("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);

    applyTheme("pinky");
    expect(document.documentElement.dataset.theme).toBe("pinky");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("setTheme persists, applies, and dispatches a theme-change event", () => {
    const seen: string[] = [];
    const listener = (e: Event) => seen.push((e as CustomEvent<{ theme: string }>).detail.theme);
    window.addEventListener(THEME_CHANGE_EVENT, listener);

    setTheme("dark");

    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(seen).toEqual(["dark"]);

    window.removeEventListener(THEME_CHANGE_EVENT, listener);
  });

  it("getTheme returns the saved theme when valid", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "dark");
    expect(getTheme()).toBe("dark");
  });

  it("getTheme falls back to the system preference when nothing is saved", () => {
    stubSystemDark(true);
    expect(getTheme()).toBe("dark");

    stubSystemDark(false);
    expect(getTheme()).toBe("pinky");
  });

  it("getTheme ignores an invalid saved value", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "neon");
    stubSystemDark(false);
    expect(getTheme()).toBe("pinky");
  });

  it("starts a single view transition when an echo repeats the in-flight theme", async () => {
    // The pending flag lives on the DOM because every component bundle gets
    // its own copy of this module — the guard must hold even when the echo
    // comes from another copy (terminal-overlay -> theme-change -> toggle).
    stubSystemDark(false);
    const { start, resolveFinished } = stubViewTransition();
    const root = document.documentElement;

    setTheme("dark");
    setTheme("dark"); // echo while the transition is still pending

    expect(start).toHaveBeenCalledTimes(1);
    expect(root.dataset.themePending).toBe("dark");
    expect(root.classList.contains("theme-vt")).toBe(true);

    resolveFinished();
    await vi.waitFor(() => {
      expect(root.classList.contains("theme-vt")).toBe(false);
    });
    expect(root.dataset.themePending).toBeUndefined();
    expect(root.dataset.theme).toBe("dark");
  });
});
