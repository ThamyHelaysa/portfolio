import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PreviewContainer } from "../../../src/_helpers/previewContainer.ts";

/** Stubs getComputedStyle so the fallback timer has a known duration/delay. */
function stubTransition(el: HTMLElement, duration: string, delay = "0s") {
  const real = window.getComputedStyle;
  vi.spyOn(window, "getComputedStyle").mockImplementation((target) => {
    if (target === el) {
      return { transitionDuration: duration, transitionDelay: delay } as CSSStyleDeclaration;
    }
    return real(target as Element);
  });
}

describe("PreviewContainer", () => {
  let el: HTMLDivElement;

  beforeEach(() => {
    el = document.createElement("div");
    document.body.appendChild(el);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    el.remove();
  });

  it("show() adds is-visible and is idempotent", () => {
    const container = new PreviewContainer(el);

    container.show();
    expect(el.classList.contains("is-visible")).toBe(true);

    container.show();
    expect(el.classList.contains("is-visible")).toBe(true);
  });

  it("hide() resolves immediately when already hidden", async () => {
    const container = new PreviewContainer(el);
    const resolved = vi.fn();

    container.hide().then(resolved);
    await Promise.resolve();

    expect(resolved).toHaveBeenCalled();
  });

  it("hide() resolves on a dispatched transitionend for opacity", async () => {
    stubTransition(el, "150ms");
    const container = new PreviewContainer(el);
    container.show();

    const resolved = vi.fn();
    container.hide().then(resolved);

    expect(el.classList.contains("is-visible")).toBe(false);
    await Promise.resolve();
    expect(resolved).not.toHaveBeenCalled();

    // The other transitioned property must not resolve it (avoid double-fire).
    const scaleEvent = new Event("transitionend") as unknown as { propertyName: string };
    Object.defineProperty(scaleEvent, "propertyName", { value: "scale" });
    el.dispatchEvent(scaleEvent as unknown as Event);
    await Promise.resolve();
    expect(resolved).not.toHaveBeenCalled();

    const opacityEvent = new Event("transitionend") as unknown as { propertyName: string };
    Object.defineProperty(opacityEvent, "propertyName", { value: "opacity" });
    el.dispatchEvent(opacityEvent as unknown as Event);
    await Promise.resolve();

    expect(resolved).toHaveBeenCalled();
  });

  it("hide() resolves via the fallback timer when no event arrives", async () => {
    stubTransition(el, "150ms", "20ms");
    const container = new PreviewContainer(el);
    container.show();

    const resolved = vi.fn();
    container.hide().then(resolved);

    // duration 150 + delay 20 + slack 50 = 220ms
    await vi.advanceTimersByTimeAsync(219);
    expect(resolved).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(resolved).toHaveBeenCalled();
  });

  it("falls back to a conservative constant when the duration can't be parsed", async () => {
    stubTransition(el, "");
    const container = new PreviewContainer(el);
    container.show();

    const resolved = vi.fn();
    container.hide().then(resolved);

    await vi.advanceTimersByTimeAsync(349);
    expect(resolved).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(resolved).toHaveBeenCalled();
  });

  it("resolves without an event under reduced motion (transition: none)", async () => {
    stubTransition(el, "0s", "0s");
    const container = new PreviewContainer(el);
    container.show();

    const resolved = vi.fn();
    container.hide().then(resolved);

    await vi.advanceTimersByTimeAsync(49);
    expect(resolved).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(resolved).toHaveBeenCalled();
  });

  it("show() during a pending hide() settles it and cleans up the listener/timer", async () => {
    stubTransition(el, "150ms");
    const container = new PreviewContainer(el);
    container.show();

    const resolved = vi.fn();
    container.hide().then(resolved);

    // Re-showing mid-collapse must settle the pending hide, not leave it dangling.
    container.show();
    await Promise.resolve();
    expect(resolved).toHaveBeenCalled();
    expect(el.classList.contains("is-visible")).toBe(true);

    // A stray transitionend after the fact must not throw or double-resolve.
    const opacityEvent = new Event("transitionend") as unknown as { propertyName: string };
    Object.defineProperty(opacityEvent, "propertyName", { value: "opacity" });
    expect(() => el.dispatchEvent(opacityEvent as unknown as Event)).not.toThrow();
  });
});
