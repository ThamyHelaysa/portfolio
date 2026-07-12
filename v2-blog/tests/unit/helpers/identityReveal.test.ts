import { beforeEach, describe, expect, it, vi } from "vitest";

import { animateIdentityReveal } from "../../../src/_helpers/identityReveal.ts";

describe("identityReveal", () => {
  beforeEach(() => {
    document.body.innerHTML = "";

    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      writable: true,
      value: vi.fn().mockImplementation(() => ({
        matches: false,
        media: "",
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  it("snaps to the final text if reveal work continues after disconnect", () => {
    const element = document.createElement("span");
    document.body.appendChild(element);

    const rafQueue: FrameRequestCallback[] = [];
    const originalRaf = globalThis.requestAnimationFrame;
    const originalCancel = globalThis.cancelAnimationFrame;

    globalThis.requestAnimationFrame = vi.fn((cb: FrameRequestCallback) => {
      rafQueue.push(cb);
      return rafQueue.length;
    }) as typeof requestAnimationFrame;
    globalThis.cancelAnimationFrame = vi.fn() as typeof cancelAnimationFrame;

    try {
      animateIdentityReveal(element, "echo_shell::1111");
      element.remove();

      const firstFrame = rafQueue.shift();
      firstFrame?.(16);

      expect(element.textContent).toBe("echo_shell::1111");
    } finally {
      globalThis.requestAnimationFrame = originalRaf;
      globalThis.cancelAnimationFrame = originalCancel;
    }
  });

  it("does not start glitch animation for a disconnected element after reveal snaps final text", () => {
    const element = document.createElement("span");
    document.body.appendChild(element);

    const animate = vi.fn();
    element.animate = animate as unknown as typeof element.animate;

    const rafQueue: FrameRequestCallback[] = [];
    const originalRaf = globalThis.requestAnimationFrame;
    const originalCancel = globalThis.cancelAnimationFrame;

    globalThis.requestAnimationFrame = vi.fn((cb: FrameRequestCallback) => {
      rafQueue.push(cb);
      return rafQueue.length;
    }) as typeof requestAnimationFrame;
    globalThis.cancelAnimationFrame = vi.fn() as typeof cancelAnimationFrame;

    try {
      animateIdentityReveal(element, "echo_shell::1111");
      element.remove();

      const firstFrame = rafQueue.shift();
      firstFrame?.(16);

      expect(animate).not.toHaveBeenCalled();
      expect(element.textContent).toBe("echo_shell::1111");
    } finally {
      globalThis.requestAnimationFrame = originalRaf;
      globalThis.cancelAnimationFrame = originalCancel;
    }
  });
});
