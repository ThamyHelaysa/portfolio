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
import { setIdentity } from "../../../src/_helpers/identity.ts";

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
  localStorage.clear();
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

  describe("delight package (#81)", () => {
    it("shows the boot flavour on the first summon of the session", async () => {
      const el = await mountOverlay();
      el.open = true;
      await el.updateComplete;
      await flush();

      expect($(el, "#overlay-log")!.textContent).toContain("reticulating splines");
    });

    it("does not boot again on a later summon in the same session", async () => {
      // First element consumes the per-session boot flag.
      const first = await mountOverlay();
      first.open = true;
      await first.updateComplete;
      await flush();

      // A fresh element (e.g. after navigation) must not re-boot.
      document.body.innerHTML = "";
      const second = await mountOverlay();
      second.open = true;
      await second.updateComplete;
      await flush();

      expect($(second, "#overlay-log")!.textContent).not.toContain("reticulating splines");
    });

    it("help hints that cheats exist without listing them", async () => {
      const el = await mountOverlay();
      el.open = true;
      await el.updateComplete;
      submit(el, "help");
      await flush();

      const text = $(el, "#overlay-log")!.textContent!;
      expect(text).toContain("cheat console");
      expect(text).not.toContain("rosebud");
    });

    it("theme switches and persists, and toggles with no argument", async () => {
      const el = await mountOverlay();
      el.open = true;
      await el.updateComplete;

      submit(el, "theme dark");
      await flush();
      expect(document.documentElement.classList.contains("dark")).toBe(true);
      expect(localStorage.getItem("theme")).toBe("dark");

      submit(el, "theme");
      await flush();
      expect(document.documentElement.classList.contains("dark")).toBe(false);
      expect(localStorage.getItem("theme")).toBe("pinky");
    });

    it("rejects an unknown theme argument", async () => {
      const el = await mountOverlay();
      el.open = true;
      await el.updateComplete;

      submit(el, "theme neon");
      await flush();
      expect($(el, "#overlay-log")!.textContent).toMatch(/neon|unknown|usage/i);
      expect(localStorage.getItem("theme")).not.toBe("neon");
    });

    // Drift guard: theme is a shared Command — the light alias must behave the
    // same on this surface as on the books shell (see _helpers/terminal/commands.ts).
    it("theme accepts light as an alias for pinky (shared Command contract)", async () => {
      const el = await mountOverlay();
      el.open = true;
      await el.updateComplete;

      submit(el, "theme light");
      await flush();
      expect(localStorage.getItem("theme")).toBe("pinky");
    });

    it("whoami prints the generated identity", async () => {
      const el = await mountOverlay();
      el.open = true;
      await el.updateComplete;

      submit(el, "whoami");
      await flush();
      expect($(el, "#overlay-log")!.textContent).toMatch(/::/);
    });

    it("whoami reflects an identity chosen elsewhere (not the seed default)", async () => {
      setIdentity("ghost_reader::4242");

      const el = await mountOverlay();
      el.open = true;
      await el.updateComplete;

      submit(el, "whoami");
      await flush();
      expect($(el, "#overlay-log")!.textContent).toContain("ghost_reader::4242");
    });

    it("responds to the rosebud and motherlode easter eggs", async () => {
      const el = await mountOverlay();
      el.open = true;
      await el.updateComplete;

      submit(el, "rosebud");
      await flush();
      expect($(el, "#overlay-log")!.textContent).toContain("TBR");

      submit(el, "motherlode");
      await flush();
      expect($(el, "#overlay-log")!.textContent).toContain("not enough time");
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
      // Simulate a prior page in the same tab having run a command (and booted).
      new TerminalSession().writeHistory(["open ring"]);
      sessionStorage.setItem("book_os:booted", "1"); // suppress the boot flavour

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
