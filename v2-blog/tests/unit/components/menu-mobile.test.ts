import { beforeEach, describe, expect, it, vi } from "vitest";

const { animatorMock } = vi.hoisted(() => ({
  animatorMock: {
    cancel: vi.fn(),
    animate: vi.fn(() => Promise.resolve()),
  },
}));

vi.mock("../../../src/_helpers/styleLoader.ts", () => ({
  adoptTailwind: () => Promise.resolve(),
}));

vi.mock("../../../src/_helpers/animationManager.ts", () => ({
  animator: animatorMock,
}));

import { MenuMobile } from "../../../src/components/menu-mobile.ts";

describe("menu-mobile", () => {
  beforeEach(() => {
    animatorMock.cancel.mockReset();
    animatorMock.animate.mockReset();
    animatorMock.animate.mockResolvedValue(undefined);
  });

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
    expect(animatorMock.cancel).toHaveBeenCalledTimes(1);
    expect(animatorMock.animate).toHaveBeenCalledTimes(1);
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
    expect(animatorMock.animate).toHaveBeenCalledTimes(2);
  });

  it("closes the drawer when a terminal summon trigger is clicked", async () => {
    const element = new MenuMobile();
    const summon = document.createElement("button");
    summon.setAttribute("data-terminal-summon", "");
    summon.setAttribute("slot", "content");
    element.appendChild(summon);
    document.body.appendChild(element);
    await element.updateComplete;

    // open the drawer
    element.shadowRoot?.querySelector("button")?.click();
    await element.updateComplete;
    await Promise.resolve();
    expect(element.isOpen).toBe(true);

    // clicking the summon trigger closes it (the summoner opens the modal)
    summon.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await element.updateComplete;
    await Promise.resolve();

    expect(element.isOpen).toBe(false);
    expect(document.body.style.overflow).toBe("initial");
  });
});
