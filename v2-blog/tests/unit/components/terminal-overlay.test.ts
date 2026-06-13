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
});
