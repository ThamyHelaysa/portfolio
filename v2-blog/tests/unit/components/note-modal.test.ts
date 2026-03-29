import { beforeEach, describe, expect, it, vi } from "vitest";

const { animatorMock } = vi.hoisted(() => ({
  animatorMock: {
    cancel: vi.fn(),
    animate: vi.fn(() => Promise.resolve()),
  },
}));

vi.mock("../../../src/_helpers/styleLoader.ts", () => ({
  adoptTailwind: () => Promise.resolve(),
}));

vi.mock("../../../src/_helpers/animationManager.ts", () => ({
  animator: animatorMock,
}));

import { NoteModal } from "../../../src/components/note-modal.ts";

describe("note-modal", () => {
  beforeEach(() => {
    animatorMock.cancel.mockReset();
    animatorMock.animate.mockReset();
    animatorMock.animate.mockResolvedValue(undefined);

    Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
      configurable: true,
      value: vi.fn(function (this: HTMLDialogElement) {
        this.setAttribute("open", "");
      }),
    });

    Object.defineProperty(HTMLDialogElement.prototype, "close", {
      configurable: true,
      value: vi.fn(function (this: HTMLDialogElement) {
        this.removeAttribute("open");
      }),
    });
  });

  it("uses the shared animator when loading content into the modal", async () => {
    const template = document.createElement("template");
    template.id = "note-template";
    template.innerHTML = `<div slot="content">${"hello world ".repeat(80)}</div>`;
    document.body.appendChild(template);

    const element = new NoteModal();
    document.body.appendChild(element);
    await element.updateComplete;

    element.setAttribute("node-tmpl", "note-template");
    await element.updateComplete;
    await Promise.resolve();
    await Promise.resolve();

    expect(animatorMock.cancel).toHaveBeenCalled();
    expect(animatorMock.animate).toHaveBeenCalled();
  });
});
