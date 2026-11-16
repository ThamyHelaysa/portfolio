import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  bindHoverScramble,
  isScrambleable,
  scrambleFrame,
  scrambleIn,
} from "../../../src/_helpers/scramble.ts";

function h1(html: string): HTMLElement {
  document.body.innerHTML = `<h1 data-scramble>${html}</h1>`;
  return document.querySelector("h1")!;
}

function navLink(label: string): HTMLAnchorElement {
  document.body.innerHTML = `<nav><a href="/blog/" data-scramble="hover">${label}</a></nav>`;
  return document.querySelector("a")!;
}

/** Media mock: reduced motion and fine pointer answered separately. */
function setMedia({ reduce = false, fine = true }: { reduce?: boolean; fine?: boolean }) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: vi
      .fn()
      .mockImplementation((query: string) => ({ matches: query.includes("reduce") ? reduce : fine })),
  });
}

/** rAF queue that honours cancelAnimationFrame. */
let frames: Map<number, FrameRequestCallback>;
let nextId: number;
let now: number;

function step() {
  const [id, cb] = frames.entries().next().value!;
  frames.delete(id);
  cb((now += 100));
}

function drain() {
  while (frames.size) step();
}

beforeEach(() => {
  frames = new Map();
  nextId = 0;
  now = 0;
  setMedia({});
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
    frames.set(++nextId, cb);
    return nextId;
  });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => frames.delete(id));
});

describe("scrambleFrame", () => {
  const chars = Array.from("ab cd");

  it("keeps whitespace and scrambles everything else at t=0", () => {
    const out = scrambleFrame(chars, 0);
    expect(out).toHaveLength(5);
    expect(out[2]).toBe(" ");
  });

  it("returns the final text at t=1", () => {
    expect(scrambleFrame(chars, 1)).toBe("ab cd");
  });
});

describe("isScrambleable", () => {
  it("accepts a heading with plain text only", () => {
    expect(isScrambleable(h1("About me"))).toBe(true);
  });

  it("rejects a heading with element children", () => {
    expect(isScrambleable(h1("Hello <em>you</em>"))).toBe(false);
  });

  it("accepts text containing < or &", () => {
    expect(isScrambleable(h1("a &lt; b"))).toBe(true);
    expect(isScrambleable(h1("Tom &amp; Jerry"))).toBe(true);
  });

  it("rejects empty text", () => {
    expect(isScrambleable(h1("   "))).toBe(false);
  });
});

describe("scrambleIn", () => {
  it("does nothing under reduced motion", () => {
    setMedia({ reduce: true });
    const el = h1("About me");
    const before = el.outerHTML;

    scrambleIn(el);

    expect(el.outerHTML).toBe(before);
    expect(frames.size).toBe(0);
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
    step();
    step();

    const layer = el.querySelector("[aria-hidden='true']");
    expect(layer).not.toBeNull();
    expect(el.firstChild?.nodeType).toBe(Node.TEXT_NODE);
    expect(el.firstChild?.textContent).toBe("About me");
  });

  it("settles on the original markup for text with & and <", () => {
    const el = h1("Tom &amp; Jerry &lt;3");
    const before = el.outerHTML;

    scrambleIn(el);
    drain();

    expect(el.outerHTML).toBe(before);
  });

  it("settles on the exact original markup when done", () => {
    const el = h1("About me");
    const before = el.outerHTML;

    scrambleIn(el);
    drain();

    expect(el.outerHTML).toBe(before);
  });

  it("restarts cleanly when re-triggered mid-run", () => {
    const el = h1("About me");
    const before = el.outerHTML;

    scrambleIn(el);
    step();
    scrambleIn(el);
    scrambleIn(el);

    expect(el.querySelectorAll(".scramble-layer")).toHaveLength(1);
    expect(frames.size).toBe(1);
    drain();
    expect(el.outerHTML).toBe(before);
  });
});

describe("bindHoverScramble", () => {
  it("scrambles on hover with a fine pointer and keeps the label", () => {
    const a = navLink("Blog");
    const before = a.outerHTML;
    bindHoverScramble(a);

    a.dispatchEvent(new Event("pointerenter"));
    step();

    expect(a.querySelector(".scramble-layer")?.getAttribute("aria-hidden")).toBe("true");
    expect(a.firstChild?.textContent).toBe("Blog");
    drain();
    expect(a.outerHTML).toBe(before);
  });

  it("does nothing on touch (no fine pointer)", () => {
    setMedia({ fine: false });
    const a = navLink("Blog");
    bindHoverScramble(a);

    a.dispatchEvent(new Event("pointerenter"));
    a.dispatchEvent(new Event("focus"));

    expect(frames.size).toBe(0);
  });

  it("scrambles on keyboard focus only when :focus-visible matches", () => {
    const a = navLink("Blog");
    bindHoverScramble(a);
    const matches = vi.spyOn(a, "matches").mockReturnValue(false);

    a.dispatchEvent(new Event("focus"));
    expect(frames.size).toBe(0);

    matches.mockReturnValue(true);
    a.dispatchEvent(new Event("focus"));
    expect(matches).toHaveBeenCalledWith(":focus-visible");
    expect(frames.size).toBe(1);
  });

  it("ends on the exact label after rapid hover in and out", () => {
    const a = navLink("Blog");
    const before = a.outerHTML;
    bindHoverScramble(a);

    for (let i = 0; i < 5; i++) {
      a.dispatchEvent(new Event("pointerenter"));
      step();
      a.dispatchEvent(new Event("pointerleave"));
    }
    drain();

    expect(a.outerHTML).toBe(before);
  });
});
