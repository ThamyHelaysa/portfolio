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
