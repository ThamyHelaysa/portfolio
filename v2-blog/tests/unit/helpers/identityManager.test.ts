import { beforeEach, describe, expect, it, vi } from "vitest";

import { IDMode, IdentityManager } from "../../../src/_helpers/identityManager.ts";

describe("identityManager", () => {
  beforeEach(() => {
    sessionStorage.clear();

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

  it("uses one explicit random salt per random identity generation", () => {
    const manager = IdentityManager.getInstance();
    const originalCrypto = globalThis.crypto;
    const getRandomValues = vi.fn((values: Uint32Array) => {
      values[0] = 123456;
      return values;
    });

    Object.defineProperty(globalThis, "crypto", {
      configurable: true,
      value: { getRandomValues },
    });

    try {
      const first = manager.getFullIdentity(IDMode.random);
      const second = manager.getFullIdentity(IDMode.random);

      expect(first).toBe(second);
      expect(getRandomValues).toHaveBeenCalledTimes(2);
      expect(getRandomValues).toHaveBeenNthCalledWith(1, expect.any(Uint32Array));
    } finally {
      Object.defineProperty(globalThis, "crypto", {
        configurable: true,
        value: originalCrypto,
      });
    }
  });

  it("changes the random identity when the explicit salt changes", () => {
    const manager = IdentityManager.getInstance();
    const originalCrypto = globalThis.crypto;
    let salt = 111;
    const getRandomValues = vi.fn((values: Uint32Array) => {
      values[0] = salt;
      return values;
    });

    Object.defineProperty(globalThis, "crypto", {
      configurable: true,
      value: { getRandomValues },
    });

    try {
      const first = manager.getFullIdentity(IDMode.random);
      salt = 222;
      const second = manager.getFullIdentity(IDMode.random);

      expect(first).not.toBe(second);
    } finally {
      Object.defineProperty(globalThis, "crypto", {
        configurable: true,
        value: originalCrypto,
      });
    }
  });

  it("snaps to the final text if reveal work continues after disconnect", () => {
    const manager = IdentityManager.getInstance();
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
      manager.animateReveal(element, "echo_shell::1111");
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
    const manager = IdentityManager.getInstance();
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
      manager.animateReveal(element, "echo_shell::1111");
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

  it("returns a stable default identity once a seed is cached", () => {
    const manager = IdentityManager.getInstance();

    const first = manager.getFullIdentity(IDMode.default);
    const second = manager.getFullIdentity(IDMode.default);

    expect(first).toBe(second);
    expect(sessionStorage.getItem("usr_identity_seed")).toBeTruthy();
  });

  it("caches and returns a chosen name", () => {
    const manager = IdentityManager.getInstance();

    manager.cacheName("echo_shell::1111");

    expect(manager.getCachedName()).toBe("echo_shell::1111");
  });
});
