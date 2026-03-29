import { describe, expect, it, vi } from "vitest";

import { deferNonCriticalWork } from "../../../src/_helpers/deferNonCriticalWork.ts";

describe("deferNonCriticalWork", () => {
  it("uses requestIdleCallback when available", () => {
    const callback = vi.fn();
    const requestIdleCallback = vi.fn((cb: IdleRequestCallback) => {
      cb({
        didTimeout: false,
        timeRemaining: () => 10,
      });
      return 1;
    });

    Object.defineProperty(globalThis, "requestIdleCallback", {
      configurable: true,
      value: requestIdleCallback,
    });

    deferNonCriticalWork(callback);

    expect(requestIdleCallback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("falls back to a timeout when requestIdleCallback is unavailable", () => {
    const callback = vi.fn();
    const setTimeoutSpy = vi
      .spyOn(globalThis, "setTimeout")
      .mockImplementation(((fn: TimerHandler) => {
        if (typeof fn === "function") {
          fn();
        }
        return 1;
      }) as typeof setTimeout);

    Object.defineProperty(globalThis, "requestIdleCallback", {
      configurable: true,
      value: undefined,
    });

    deferNonCriticalWork(callback);

    expect(setTimeoutSpy).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledTimes(1);

    setTimeoutSpy.mockRestore();
  });
});
