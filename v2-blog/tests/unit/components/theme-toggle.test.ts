import { describe, expect, it, vi } from "vitest";

vi.mock("../../../src/_helpers/styleLoader.ts", () => ({
  adoptTailwind: () => Promise.resolve(),
}));

import { ThemeToggle } from "../../../src/components/theme-toggle.ts";

function setSystemDarkMode(enabled: boolean) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: query.includes("prefers-color-scheme") ? enabled : false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

describe("theme-toggle", () => {
  it("initializes from saved theme and updates the document state", async () => {
    localStorage.setItem("theme", "dark");

    const element = new ThemeToggle();
    document.body.appendChild(element);
    await element.updateComplete;

    expect(element.theme).toBe("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("falls back to the system preference when there is no saved theme", async () => {
    setSystemDarkMode(true);

    const element = new ThemeToggle();
    document.body.appendChild(element);
    await element.updateComplete;

    expect(element.theme).toBe("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  it("toggles theme from the button without desynchronizing aria and storage", async () => {
    const element = new ThemeToggle();
    document.body.appendChild(element);
    await element.updateComplete;

    const button = element.shadowRoot?.querySelector("button");
    if (!button) {
      throw new Error("theme-toggle button was not rendered");
    }
    button.click();
    await element.updateComplete;

    expect(element.theme).toBe("dark");
    expect(localStorage.getItem("theme")).toBe("dark");
    expect(button?.getAttribute("aria-pressed")).toBe("true");
  });
});
