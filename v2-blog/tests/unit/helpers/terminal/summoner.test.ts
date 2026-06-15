import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createSummoner } from "../../../../src/_helpers/terminal/summon.ts";
import { TerminalSession } from "../../../../src/_helpers/terminal/session.ts";

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
  sessionStorage.clear();
  // Run idle callbacks synchronously so auto-restore is observable in tests.
  (window as unknown as { requestIdleCallback: (cb: () => void) => number }).requestIdleCallback =
    (cb: () => void) => {
      cb();
      return 0;
    };
});

afterEach(() => {
  dispose?.();
  dispose = undefined;
  delete (window as unknown as { requestIdleCallback?: unknown }).requestIdleCallback;
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

  describe("click summon (header button / mobile)", () => {
    it("opens the overlay when an element with [data-terminal-summon] is clicked", () => {
      const btn = document.createElement("button");
      btn.setAttribute("data-terminal-summon", "");
      const icon = document.createElement("span"); // click can land on a child
      btn.appendChild(icon);
      document.body.appendChild(btn);

      dispose = createSummoner(window);
      icon.dispatchEvent(new MouseEvent("click", { bubbles: true }));

      const overlay = document.querySelector("terminal-overlay");
      expect(overlay).not.toBeNull();
      expect(overlay?.hasAttribute("open")).toBe(true);
    });

    it("ignores clicks outside a summon trigger", () => {
      const other = document.createElement("button");
      document.body.appendChild(other);

      dispose = createSummoner(window);
      other.dispatchEvent(new MouseEvent("click", { bubbles: true }));

      expect(document.querySelector("terminal-overlay")).toBeNull();
    });
  });

  describe("session restore", () => {
    it("auto-mounts the overlay (and its bundle) on idle when a session was left open", () => {
      new TerminalSession().setOpen(true);

      dispose = createSummoner(window);

      // mounted without any keypress; the overlay self-opens during restore,
      // so the summoner must NOT force the open attribute itself.
      const overlay = document.querySelector("terminal-overlay");
      expect(overlay).not.toBeNull();
      expect(overlay?.hasAttribute("open")).toBe(false);
      expect(document.head.querySelector('script[src="/components/terminal-overlay.js"]')).not.toBeNull();
    });

    it("does not auto-mount when there is no session", () => {
      dispose = createSummoner(window);

      expect(document.querySelector("terminal-overlay")).toBeNull();
      expect(document.head.querySelector('script[src="/components/terminal-overlay.js"]')).toBeNull();
    });

    it("does not auto-mount when the stored session is closed", () => {
      const s = new TerminalSession();
      s.setOpen(true);
      s.setOpen(false);

      dispose = createSummoner(window);

      expect(document.querySelector("terminal-overlay")).toBeNull();
    });
  });
});
