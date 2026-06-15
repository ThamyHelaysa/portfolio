import { beforeEach, describe, expect, it, vi } from "vitest";

const { animatorMock, gsapMock } = vi.hoisted(() => ({
  animatorMock: {
    cancel: vi.fn(),
    animate: vi.fn(() => Promise.resolve()),
  },
  gsapMock: {
    to: vi.fn((_t, o?: { onUpdate?: () => void; onComplete?: () => void }) => {
      o?.onUpdate?.();
      o?.onComplete?.();
      return {};
    }),
  },
}));

vi.mock("gsap", () => ({ gsap: gsapMock }));
vi.mock("../../../src/_helpers/styleLoader.ts", () => ({
  adoptTailwind: () => Promise.resolve(),
}));
vi.mock("../../../src/_helpers/animationManager.ts", () => ({
  animator: animatorMock,
}));

import { TerminalOverlay } from "../../../src/components/terminal-overlay.ts";
import { TerminalSession } from "../../../src/_helpers/terminal/session.ts";

async function mountOverlay() {
  const el = new TerminalOverlay();
  document.body.appendChild(el);
  await el.updateComplete;
  return el;
}

function submit(el: TerminalOverlay, value: string) {
  const input = el.shadowRoot!.querySelector<HTMLTextAreaElement>("#overlay-input")!;
  input.value = value;
  const form = el.shadowRoot!.querySelector<HTMLFormElement>("#overlay-form")!;
  form.requestSubmit();
}

beforeEach(() => {
  document.body.innerHTML = "";
  sessionStorage.clear();
  animatorMock.cancel.mockClear();
  animatorMock.animate.mockClear();
});

describe("terminal-overlay", () => {
  it("exposes a dialog and moves focus to the input when opened", async () => {
    const el = await mountOverlay();

    el.open = true;
    await el.updateComplete;

    const dialog = el.shadowRoot!.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    expect(el.shadowRoot!.activeElement).toBe(el.shadowRoot!.querySelector("#overlay-input"));
  });

  it("runs the help command and appends output to the log", async () => {
    const el = await mountOverlay();
    el.open = true;
    await el.updateComplete;

    submit(el, "help");
    await el.updateComplete;
    await Promise.resolve();

    const log = el.shadowRoot!.querySelector("#overlay-log")!;
    expect(log.textContent).toContain("help - list commands");
  });

  it("submits the command when Enter is pressed in the input", async () => {
    const el = await mountOverlay();
    el.open = true;
    await el.updateComplete;

    const input = el.shadowRoot!.querySelector<HTMLTextAreaElement>("#overlay-input")!;
    input.value = "help";
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    await el.updateComplete;
    await Promise.resolve();

    expect(el.shadowRoot!.querySelector("#overlay-log")!.textContent).toContain("help - list commands");
    expect(input.value).toBe("");
  });

  it("inserts a newline (does not submit) on Shift+Enter", async () => {
    const el = await mountOverlay();
    el.open = true;
    await el.updateComplete;

    const input = el.shadowRoot!.querySelector<HTMLTextAreaElement>("#overlay-input")!;
    input.value = "hel";
    const event = new KeyboardEvent("keydown", { key: "Enter", shiftKey: true, bubbles: true, cancelable: true });
    input.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
  });

  it("closes when Escape is pressed", async () => {
    const el = await mountOverlay();
    el.open = true;
    await el.updateComplete;

    const panel = el.shadowRoot!.querySelector("#overlay-panel")!;
    panel.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await el.updateComplete;

    expect(el.open).toBe(false);
  });

  it("restores focus to the previously focused element on close", async () => {
    const trigger = document.createElement("button");
    document.body.appendChild(trigger);
    trigger.focus();

    const el = await mountOverlay();
    el.open = true;
    await el.updateComplete;
    el.open = false;
    await el.updateComplete;

    expect(document.activeElement).toBe(trigger);
  });

  it("slides the panel in via the animator on open", async () => {
    const el = await mountOverlay();
    el.open = true;
    await el.updateComplete;

    expect(animatorMock.animate).toHaveBeenCalledTimes(1);
  });

  describe("history recall", () => {
    async function pressArrow(el: TerminalOverlay, key: "ArrowUp" | "ArrowDown") {
      const input = el.shadowRoot!.querySelector<HTMLTextAreaElement>("#overlay-input")!;
      const event = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true });
      input.dispatchEvent(event);
      await el.updateComplete;
      return event;
    }

    it("recalls the previous command into the input on ArrowUp and prevents the default", async () => {
      const el = await mountOverlay();
      el.open = true;
      await el.updateComplete;

      submit(el, "help");
      await el.updateComplete;
      await Promise.resolve();

      const event = await pressArrow(el, "ArrowUp");

      const input = el.shadowRoot!.querySelector<HTMLTextAreaElement>("#overlay-input")!;
      expect(input.value).toBe("help");
      expect(event.defaultPrevented).toBe(true);
    });

    it("steps back through several commands and forward again with ArrowDown", async () => {
      const el = await mountOverlay();
      el.open = true;
      await el.updateComplete;

      submit(el, "help");
      await el.updateComplete;
      await Promise.resolve();
      submit(el, "ls");
      await el.updateComplete;
      await Promise.resolve();

      const input = el.shadowRoot!.querySelector<HTMLTextAreaElement>("#overlay-input")!;

      await pressArrow(el, "ArrowUp");
      expect(input.value).toBe("ls");
      await pressArrow(el, "ArrowUp");
      expect(input.value).toBe("help");

      await pressArrow(el, "ArrowDown");
      expect(input.value).toBe("ls");
      await pressArrow(el, "ArrowDown");
      expect(input.value).toBe("");
    });
  });

  describe("session continuity", () => {
    it("persists the open flag while open and clears the session on close", async () => {
      const el = await mountOverlay();

      el.open = true;
      await el.updateComplete;
      expect(new TerminalSession().read()?.open).toBe(true);

      el.open = false;
      await el.updateComplete;
      expect(new TerminalSession().read()).toBeNull();
    });

    it("does not clear the session on the initial (never-opened) render", async () => {
      new TerminalSession().setOpen(true);

      await mountOverlay(); // open defaults to false; must not wipe an existing session

      // a restore will have re-asserted open:true; the key must still exist
      expect(new TerminalSession().read()).not.toBeNull();
    });

    it("mirrors written log lines and command history into the session", async () => {
      const el = await mountOverlay();
      el.open = true;
      await el.updateComplete;

      submit(el, "help");
      // help appends several lines sequentially; persistence (onLineWritten)
      // trails the synchronous DOM write by a microtask per line — drain them.
      for (let i = 0; i < 12; i++) await Promise.resolve();

      const snap = new TerminalSession().read()!;
      expect(snap.log.some((l) => l.t.includes("help - list commands"))).toBe(true);
      expect(snap.history).toContain("help");
    });

    it("restores scrollback, history and an arrival line, opening without a slide", async () => {
      const seed = new TerminalSession();
      seed.setOpen(true);
      seed.appendLine("$ ls", 2);
      seed.appendLine("blog/   3", 0);
      seed.setHistory(["ls"]);

      const el = new TerminalOverlay();
      document.body.appendChild(el);
      await el.updateComplete;
      await el.restoreComplete;
      await el.updateComplete;

      // reopened
      expect(el.open).toBe(true);
      // scrollback replayed
      const log = el.shadowRoot!.querySelector("#overlay-log")!;
      expect(log.textContent).toContain("blog/   3");
      // arrival line (status-kind cd ~<path>)
      expect(log.textContent).toContain("cd ~");
      // history rehydrated → ArrowUp recalls the pre-jump command
      const input = el.shadowRoot!.querySelector<HTMLTextAreaElement>("#overlay-input")!;
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true }));
      await el.updateComplete;
      expect(input.value).toBe("ls");
      // opened instantly: no slide animation on a restore
      expect(animatorMock.animate).not.toHaveBeenCalled();
    });

    it("does not restore when the stored session is closed", async () => {
      const seed = new TerminalSession();
      seed.setOpen(false);
      seed.appendLine("stale", 0);

      const el = new TerminalOverlay();
      document.body.appendChild(el);
      await el.updateComplete;
      await el.restoreComplete;

      expect(el.open).toBe(false);
      expect(el.shadowRoot!.querySelector("#overlay-log")!.textContent).toBe("");
    });
  });
});
