import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createSummoner } from "../../../../src/_helpers/terminal/summon.ts";

let dispose: (() => void) | undefined;

function pressCombo(overrides: Partial<KeyboardEvent> = {}) {
  const event = new KeyboardEvent("keydown", {
    ctrlKey: true,
    shiftKey: true,
    cancelable: true,
    bubbles: true,
    ...overrides,
  });
  // jsdom KeyboardEvent ignores `code` from init in some versions; force it.
  Object.defineProperty(event, "code", { value: overrides.code ?? "KeyC" });
  window.dispatchEvent(event);
  return event;
}

beforeEach(() => {
  document.body.innerHTML = "";
  document.head.querySelectorAll("script").forEach((s) => s.remove());
});

afterEach(() => {
  dispose?.();
  dispose = undefined;
});

describe("createSummoner", () => {
  it("opens a terminal-overlay element when the summon combo is pressed", () => {
    dispose = createSummoner(window);

    pressCombo();

    const overlay = document.querySelector("terminal-overlay");
    expect(overlay).not.toBeNull();
    expect(overlay?.hasAttribute("open")).toBe(true);
  });

  it("never calls preventDefault on the combo (DevTools must still open)", () => {
    dispose = createSummoner(window);

    const event = pressCombo();

    expect(event.defaultPrevented).toBe(false);
  });

  it("lazy-loads the overlay bundle exactly once across repeated summons", () => {
    dispose = createSummoner(window);

    pressCombo();
    pressCombo();

    const scripts = document.head.querySelectorAll('script[src="/components/terminal-overlay.js"]');
    const overlays = document.querySelectorAll("terminal-overlay");
    expect(scripts).toHaveLength(1);
    expect(overlays).toHaveLength(1);
  });

  it("ignores non-matching keys", () => {
    dispose = createSummoner(window);

    pressCombo({ code: "KeyX" });

    expect(document.querySelector("terminal-overlay")).toBeNull();
    expect(document.head.querySelector('script[src="/components/terminal-overlay.js"]')).toBeNull();
  });

  it("stops responding after the disposer runs", () => {
    const localDispose = createSummoner(window);
    localDispose();

    pressCombo();

    expect(document.querySelector("terminal-overlay")).toBeNull();
  });
});
