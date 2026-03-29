import { describe, expect, it, vi } from "vitest";

vi.mock("../../../src/_helpers/waitForVisuals.ts", () => ({
  default: () => Promise.resolve(0),
}));

function createAnimationStub() {
  const listeners = {
    finish: [] as Array<() => void>,
    cancel: [] as Array<() => void>,
  };

  return {
    onfinish: null as null | (() => void),
    oncancel: null as null | (() => void),
    addEventListener: vi.fn((type: "finish" | "cancel", cb: () => void) => {
      listeners[type].push(cb);
    }),
    cancel: vi.fn(function (this: { oncancel: null | (() => void) }) {
      this.oncancel?.();
      for (const cb of listeners.cancel) cb();
    }),
    finish() {
      this.onfinish?.();
      for (const cb of listeners.finish) cb();
    },
  };
}

describe("animationManager", () => {
  it("cancels the previous animation before starting a new one", async () => {
    const animations = [createAnimationStub(), createAnimationStub()];
    const element = document.createElement("div");

    element.animate = vi
      .fn()
      .mockImplementationOnce(() => animations[0])
      .mockImplementationOnce(() => animations[1]) as unknown as typeof element.animate;

    const { animator } = await import("../../../src/_helpers/animationManager.ts");

    const first = animator.animate(element, [{ opacity: "0" }, { opacity: "1" }], { duration: 200 });
    await Promise.resolve();
    const second = animator.animate(element, [{ opacity: "1" }, { opacity: "0" }], { duration: 200 });
    await Promise.resolve();

    expect(animations[0].cancel).toHaveBeenCalledTimes(1);

    animations[1].finish();
    await Promise.all([first, second]);
  });

  it("applies the final keyframe styles when the animation finishes", async () => {
    const animation = createAnimationStub();
    const element = document.createElement("div");

    element.animate = vi.fn(() => animation) as unknown as typeof element.animate;

    const { animator } = await import("../../../src/_helpers/animationManager.ts");

    const pending = animator.animate(
      element,
      [{ transform: "translateX(0px)", opacity: "0" }, { transform: "translateX(10px)", opacity: "1" }],
      { duration: 120 }
    );

    await Promise.resolve();
    animation.finish();
    await pending;

    expect(element.style.transform).toBe("translateX(10px)");
    expect(element.style.opacity).toBe("1");
  });
});
