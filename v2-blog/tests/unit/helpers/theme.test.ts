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

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
  document.documentElement.classList.remove("dark");
});

afterEach(() => {
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
});
