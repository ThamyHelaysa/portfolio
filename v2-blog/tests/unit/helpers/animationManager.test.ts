import { beforeEach, describe, expect, it, vi } from "vitest";

let waitForVisualPromise: Promise<number>;
let releaseVisual!: () => void;

vi.mock("../../../src/_helpers/waitForVisuals.ts", () => ({
  default: () => waitForVisualPromise,
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
  beforeEach(() => {
    waitForVisualPromise = new Promise<number>((resolve) => {
      releaseVisual = () => resolve(0);
    });
  });

  it("cancels the previous animation before starting a new one", async () => {
    const animations = [createAnimationStub(), createAnimationStub()];
    const element = document.createElement("div");
    document.body.appendChild(element);

    element.animate = vi
      .fn()
      .mockImplementationOnce(() => animations[0])
      .mockImplementationOnce(() => animations[1]) as unknown as typeof element.animate;

    const { animator } = await import("../../../src/_helpers/animationManager.ts");

    const first = animator.animate(element, [{ opacity: "0" }, { opacity: "1" }], { duration: 200 });
    releaseVisual();
    await Promise.resolve();
    const second = animator.animate(element, [{ opacity: "1" }, { opacity: "0" }], { duration: 200 });
    releaseVisual();
    await Promise.resolve();

    expect(animations[0].cancel).toHaveBeenCalledTimes(1);

    animations[1].finish();
    await Promise.all([first, second]);
  });

  it("applies the final keyframe styles when the animation finishes", async () => {
    const animation = createAnimationStub();
    const element = document.createElement("div");
    document.body.appendChild(element);

    element.animate = vi.fn(() => animation) as unknown as typeof element.animate;

    const { animator } = await import("../../../src/_helpers/animationManager.ts");

    const pending = animator.animate(
      element,
      [{ transform: "translateX(0px)", opacity: "0" }, { transform: "translateX(10px)", opacity: "1" }],
      { duration: 120 }
    );

    releaseVisual();
    await Promise.resolve();
    animation.finish();
    await pending;

    expect(element.style.transform).toBe("translateX(10px)");
    expect(element.style.opacity).toBe("1");
  });

  it("does not start a new animation if the element disconnects before paint readiness", async () => {
    const element = document.createElement("div");
    const animate = vi.fn();
    element.animate = animate as unknown as typeof element.animate;

    document.body.appendChild(element);

    const { animator } = await import("../../../src/_helpers/animationManager.ts");
    const pending = animator.animate(
      element,
      [{ opacity: "0" }, { opacity: "1" }],
      { duration: 120 }
    );

    element.remove();
    releaseVisual();
    await pending;

    expect(animate).not.toHaveBeenCalled();
  });
});
