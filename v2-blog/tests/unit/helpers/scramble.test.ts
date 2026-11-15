import { beforeEach, describe, expect, it, vi } from "vitest";

import { isScrambleable, scrambleIn } from "../../../src/_helpers/scramble.ts";

function h1(html: string): HTMLElement {
  document.body.innerHTML = `<h1 data-scramble>${html}</h1>`;
  return document.querySelector("h1")!;
}

function setReducedMotion(matches: boolean) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: vi.fn().mockImplementation(() => ({ matches })),
  });
}

describe("isScrambleable", () => {
  it("accepts a heading with plain text only", () => {
    expect(isScrambleable(h1("About me"))).toBe(true);
  });

  it("rejects a heading with element children", () => {
    expect(isScrambleable(h1("Hello <em>you</em>"))).toBe(false);
  });

  it("rejects text containing < or &", () => {
    expect(isScrambleable(h1("a &lt; b"))).toBe(false);
    expect(isScrambleable(h1("Tom &amp; Jerry"))).toBe(false);
  });

  it("rejects empty text", () => {
    expect(isScrambleable(h1("   "))).toBe(false);
  });
});

describe("scrambleIn", () => {
  let frames: FrameRequestCallback[];

  beforeEach(() => {
    frames = [];
    setReducedMotion(false);
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => frames.push(cb));
  });

  it("does nothing under reduced motion", () => {
    setReducedMotion(true);
    const el = h1("About me");
    const before = el.outerHTML;

    scrambleIn(el);

    expect(el.outerHTML).toBe(before);
    expect(frames).toHaveLength(0);
  });

  it("does nothing for an element the guard rejects", () => {
    const el = h1("Hello <em>you</em>");
    const before = el.outerHTML;

    scrambleIn(el);

    expect(el.outerHTML).toBe(before);
  });

  it("scrambles in an aria-hidden layer while the real text keeps its place", () => {
    const el = h1("About me");

    scrambleIn(el);
    frames.shift()!(0);
    frames.shift()!(100);

    const layer = el.querySelector("[aria-hidden='true']");
    expect(layer).not.toBeNull();
    expect(el.firstChild?.nodeType).toBe(Node.TEXT_NODE);
    expect(el.firstChild?.textContent).toBe("About me");
  });

  it("settles on the exact original markup when done", () => {
    const el = h1("About me");
    const before = el.outerHTML;

    scrambleIn(el);
    let now = 0;
    while (frames.length) frames.shift()!((now += 100));

    expect(el.outerHTML).toBe(before);
  });
});
