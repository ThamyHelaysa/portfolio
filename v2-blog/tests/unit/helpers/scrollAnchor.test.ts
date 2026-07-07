import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ScrollAnchor } from "../../../src/_helpers/scrollAnchor.ts";

/** A manual animation-frame queue so we control exactly when frames flush. */
let rafCbs: Array<FrameRequestCallback | undefined>;

function flushRaf() {
  const cbs = rafCbs;
  rafCbs = [];
  cbs.forEach((cb) => cb?.(0));
}

beforeEach(() => {
  rafCbs = [];
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => rafCbs.push(cb));
  vi.stubGlobal("cancelAnimationFrame", (id: number) => {
    rafCbs[id - 1] = undefined;
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ScrollAnchor", () => {
  it("rAF-throttles multiple scrolls in one frame into a single onScrollFrame", () => {
    const onScrollFrame = vi.fn();
    const anchor = new ScrollAnchor({ onScrollFrame, onResize: vi.fn() });
    anchor.start();

    window.dispatchEvent(new Event("scroll"));
    window.dispatchEvent(new Event("scroll"));
    window.dispatchEvent(new Event("scroll"));
    // Nothing fires until the frame flushes.
    expect(onScrollFrame).not.toHaveBeenCalled();

    flushRaf();
    expect(onScrollFrame).toHaveBeenCalledTimes(1);

    // A fresh scroll after the frame schedules the next one.
    window.dispatchEvent(new Event("scroll"));
    flushRaf();
    expect(onScrollFrame).toHaveBeenCalledTimes(2);
  });

  it("forwards resize immediately, un-throttled", () => {
    const onResize = vi.fn();
    const anchor = new ScrollAnchor({ onScrollFrame: vi.fn(), onResize });
    anchor.start();

    window.dispatchEvent(new Event("resize"));
    window.dispatchEvent(new Event("resize"));
    expect(onResize).toHaveBeenCalledTimes(2);
  });

  it("detaches on stop and cancels the pending frame", () => {
    const onScrollFrame = vi.fn();
    const anchor = new ScrollAnchor({ onScrollFrame, onResize: vi.fn() });
    anchor.start();

    // Queue a frame, then stop before it flushes.
    window.dispatchEvent(new Event("scroll"));
    anchor.stop();
    flushRaf();
    expect(onScrollFrame).not.toHaveBeenCalled();

    // Further events after stop are ignored.
    window.dispatchEvent(new Event("scroll"));
    flushRaf();
    expect(onScrollFrame).not.toHaveBeenCalled();
  });

  it("is idempotent: a second start does not double-subscribe", () => {
    const onScrollFrame = vi.fn();
    const anchor = new ScrollAnchor({ onScrollFrame, onResize: vi.fn() });
    anchor.start();
    anchor.start();

    window.dispatchEvent(new Event("scroll"));
    flushRaf();
    expect(onScrollFrame).toHaveBeenCalledTimes(1);
  });

  it("can restart after stop", () => {
    const onScrollFrame = vi.fn();
    const anchor = new ScrollAnchor({ onScrollFrame, onResize: vi.fn() });

    anchor.start();
    anchor.stop();
    anchor.start();

    window.dispatchEvent(new Event("scroll"));
    flushRaf();
    expect(onScrollFrame).toHaveBeenCalledTimes(1);
  });
});
