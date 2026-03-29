type DeferredWorkHandle = number | ReturnType<typeof globalThis.setTimeout>;

/**
 * Schedules non-critical browser work after the initial render opportunity.
 * Prefers `requestIdleCallback` when available and falls back to a zero-delay timeout.
 *
 * @param callback - The work to run after the current critical rendering work has settled.
 * @returns The scheduled task handle from the underlying browser API.
 */
export function deferNonCriticalWork(callback: () => void): DeferredWorkHandle {
  if (typeof globalThis.requestIdleCallback === "function") {
    return globalThis.requestIdleCallback(() => {
      callback();
    });
  }

  return globalThis.setTimeout(() => {
    callback();
  }, 0);
}
