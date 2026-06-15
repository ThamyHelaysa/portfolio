import { beforeEach, describe, expect, it, vi } from "vitest";

const { gsapMock } = vi.hoisted(() => ({
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

import { TerminalOverlay } from "../../../src/components/terminal-overlay.ts";
import { TerminalSession } from "../../../src/_helpers/terminal/session.ts";

async function mountOverlay() {
  const el = new TerminalOverlay();
  document.body.appendChild(el);
  await el.updateComplete;
  return el;
}

function $(el: TerminalOverlay, selector: string) {
  return el.shadowRoot!.querySelector(selector);
}

function submit(el: TerminalOverlay, value: string) {
  const input = el.shadowRoot!.querySelector<HTMLTextAreaElement>("#overlay-input")!;
  input.value = value;
  el.shadowRoot!.querySelector<HTMLFormElement>("#overlay-form")!.requestSubmit();
}

async function flush() {
  for (let i = 0; i < 12; i++) await Promise.resolve();
}

beforeEach(() => {
  document.body.innerHTML = "";
  sessionStorage.clear();
});

describe("terminal-overlay", () => {
  it("is a modal dialog and focuses the input when opened", async () => {
    const el = await mountOverlay();

    el.open = true;
    await el.updateComplete;

    const dialog = $(el, "#overlay-dialog") as HTMLDialogElement;
    expect(dialog).not.toBeNull();
    expect(dialog.getAttribute("aria-label")).toBe("Terminal");
    expect(dialog.hasAttribute("open")).toBe(true);
    expect(el.shadowRoot!.activeElement).toBe($(el, "#overlay-input"));
  });

  it("runs the help command and lists the close commands", async () => {
    const el = await mountOverlay();
    el.open = true;
    await el.updateComplete;

    submit(el, "help");
    await flush();

    const log = $(el, "#overlay-log")!;
    expect(log.textContent).toContain("help - list commands");
    expect(log.textContent).toContain("exit / q - close the terminal");
  });

  it("submits on Enter and inserts a newline on Shift+Enter", async () => {
    const el = await mountOverlay();
    el.open = true;
    await el.updateComplete;

    const input = el.shadowRoot!.querySelector<HTMLTextAreaElement>("#overlay-input")!;
    input.value = "help";
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    await flush();
    expect($(el, "#overlay-log")!.textContent).toContain("help - list commands");
    expect(input.value).toBe("");

    const shiftEnter = new KeyboardEvent("keydown", { key: "Enter", shiftKey: true, bubbles: true, cancelable: true });
    input.dispatchEvent(shiftEnter);
    expect(shiftEnter.defaultPrevented).toBe(false);
  });

  describe("closing", () => {
    it("closes when the ✕ button is clicked", async () => {
      const el = await mountOverlay();
      el.open = true;
      await el.updateComplete;

      ($(el, "#overlay-close") as HTMLButtonElement).click();
      await el.updateComplete;

      expect(el.open).toBe(false);
    });

    it("closes via the exit and q commands", async () => {
      const el = await mountOverlay();

      el.open = true;
      await el.updateComplete;
      submit(el, "exit");
      await flush();
      expect(el.open).toBe(false);

      el.open = true;
      await el.updateComplete;
      submit(el, "q");
      await flush();
      expect(el.open).toBe(false);
    });

    it("closes on a backdrop click (target is the dialog itself)", async () => {
      const el = await mountOverlay();
      el.open = true;
      await el.updateComplete;

      const dialog = $(el, "#overlay-dialog")!;
      dialog.dispatchEvent(new MouseEvent("click", { bubbles: true })); // target === dialog
      await el.updateComplete;

      expect(el.open).toBe(false);
    });

    it("does not close when inner content is clicked", async () => {
      const el = await mountOverlay();
      el.open = true;
      await el.updateComplete;

      $(el, "#overlay-log")!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await el.updateComplete;

      expect(el.open).toBe(true);
    });

    it("syncs open=false when the dialog emits a native close (Escape)", async () => {
      const el = await mountOverlay();
      el.open = true;
      await el.updateComplete;

      $(el, "#overlay-dialog")!.dispatchEvent(new Event("close"));
      await el.updateComplete;

      expect(el.open).toBe(false);
    });
  });

  describe("command history (persists across navigations, not scrollback)", () => {
    it("recalls prior commands with ArrowUp/ArrowDown", async () => {
      const el = await mountOverlay();
      el.open = true;
      await el.updateComplete;

      submit(el, "help");
      await flush();
      submit(el, "ls");
      await flush();

      const input = el.shadowRoot!.querySelector<HTMLTextAreaElement>("#overlay-input")!;
      const arrow = (key: string) =>
        input.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));

      arrow("ArrowUp");
      expect(input.value).toBe("ls");
      arrow("ArrowUp");
      expect(input.value).toBe("help");
      arrow("ArrowDown");
      expect(input.value).toBe("ls");
    });

    it("persists history to the session on submit", async () => {
      const el = await mountOverlay();
      el.open = true;
      await el.updateComplete;

      submit(el, "help");
      await flush();

      expect(new TerminalSession().readHistory()).toContain("help");
    });

    it("rehydrates history from the session on mount, but starts with an empty log", async () => {
      // Simulate a prior page in the same tab having run a command.
      new TerminalSession().writeHistory(["open ring"]);

      const el = await mountOverlay();
      el.open = true;
      await el.updateComplete;

      // Fresh panel: no scrollback restored.
      expect($(el, "#overlay-log")!.textContent).toBe("");

      // ... but arrow-up recalls the earlier command.
      const input = el.shadowRoot!.querySelector<HTMLTextAreaElement>("#overlay-input")!;
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true }));
      expect(input.value).toBe("open ring");
    });
  });
});
