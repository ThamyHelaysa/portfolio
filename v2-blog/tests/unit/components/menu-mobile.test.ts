import { describe, expect, it, vi } from "vitest";

vi.mock("../../../src/_helpers/styleLoader.ts", () => ({
  adoptTailwind: () => Promise.resolve(),
}));

vi.mock("../../../src/_helpers/animationManager.ts", () => ({
  animator: {
    cancel: vi.fn(),
    animate: vi.fn(() => Promise.resolve()),
  },
}));

import { MenuMobile } from "../../../src/components/menu-mobile.ts";

describe("menu-mobile", () => {
  it("toggles open state and aria-expanded from the menu button", async () => {
    const element = new MenuMobile();
    document.body.appendChild(element);
    await element.updateComplete;

    const button = element.shadowRoot?.querySelector("button");
    button?.click();
    await element.updateComplete;

    expect(element.isOpen).toBe(true);
    expect(button?.getAttribute("aria-expanded")).toBe("true");
    expect(document.body.style.overflow).toBe("hidden");
  });

  it("remains consistent across repeated open and close cycles", async () => {
    const element = new MenuMobile();
    document.body.appendChild(element);
    await element.updateComplete;

    const button = element.shadowRoot?.querySelector("button");

    button?.click();
    await element.updateComplete;
    await Promise.resolve();
    button?.click();
    await element.updateComplete;
    await Promise.resolve();

    expect(element.isOpen).toBe(false);
    expect(document.body.style.overflow).toBe("initial");
  });
});
