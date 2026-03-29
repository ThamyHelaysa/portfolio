import { beforeEach, describe, expect, it, vi } from "vitest";

const previewApi = {
  show: vi.fn(),
  move: vi.fn(),
  hide: vi.fn(),
};

vi.mock("../../../src/_helpers/sharedPreview.ts", () => ({
  SharedMediaPreview: {
    getInstance: () => previewApi,
  },
}));

import { MediaPreview } from "../../../src/components/media-preview.ts";

describe("media-preview", () => {
  beforeEach(() => {
    previewApi.show.mockReset();
    previewApi.move.mockReset();
    previewApi.hide.mockReset();
  });

  it("delegates mouseenter to the shared preview with component positioning", async () => {
    const element = new MediaPreview();
    element.previewSrc = "/assets/example.webp";
    element.previewType = "image";
    element.previewPosition = "right";

    vi.spyOn(element, "getBoundingClientRect").mockReturnValue(new DOMRect(10, 20, 30, 40));

    document.body.appendChild(element);
    await element.updateComplete;

    const wrapper = element.shadowRoot?.querySelector(".wrapper");
    wrapper?.dispatchEvent(new MouseEvent("mouseenter", { clientX: 15, clientY: 25, bubbles: true }));

    expect(previewApi.show).toHaveBeenCalledWith({
      src: "/assets/example.webp",
      type: "image",
      x: 15,
      y: 25,
      placement: "right",
      triggerRect: expect.any(DOMRect),
    });
  });

  it("does not call show when previewSrc is missing", async () => {
    const element = new MediaPreview();
    document.body.appendChild(element);
    await element.updateComplete;

    const wrapper = element.shadowRoot?.querySelector(".wrapper");
    wrapper?.dispatchEvent(new MouseEvent("mouseenter", { clientX: 10, clientY: 20, bubbles: true }));
    wrapper?.dispatchEvent(new MouseEvent("mousemove", { clientX: 30, clientY: 40, bubbles: true }));

    expect(previewApi.show).not.toHaveBeenCalled();
    expect(previewApi.move).not.toHaveBeenCalled();
  });

  it("shows the preview on keyboard focus when the content has meaning", async () => {
    const element = new MediaPreview();
    element.previewSrc = "/assets/example.webp";
    element.previewType = "image";
    element.previewPosition = "bottom";

    vi.spyOn(element, "getBoundingClientRect").mockReturnValue(new DOMRect(20, 30, 40, 50));

    document.body.appendChild(element);
    await element.updateComplete;

    const wrapper = element.shadowRoot?.querySelector(".wrapper");
    expect(wrapper?.getAttribute("tabindex")).toBe("0");

    wrapper?.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));

    expect(previewApi.show).toHaveBeenCalledWith({
      src: "/assets/example.webp",
      type: "image",
      x: 40,
      y: 55,
      placement: "bottom",
      triggerRect: expect.any(DOMRect),
    });
  });

  it("hides the preview when focus leaves the component", async () => {
    const element = new MediaPreview();
    element.previewSrc = "/assets/example.webp";

    document.body.appendChild(element);
    await element.updateComplete;

    const wrapper = element.shadowRoot?.querySelector(".wrapper");
    wrapper?.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));

    expect(previewApi.hide).toHaveBeenCalledTimes(1);
  });

  it("delegates mousemove and mouseleave to the shared preview", async () => {
    const element = new MediaPreview();
    element.previewSrc = "/assets/example.webp";

    vi.spyOn(element, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 0, 20, 20));

    document.body.appendChild(element);
    await element.updateComplete;

    const wrapper = element.shadowRoot?.querySelector(".wrapper");
    wrapper?.dispatchEvent(new MouseEvent("mousemove", { clientX: 50, clientY: 60, bubbles: true }));
    wrapper?.dispatchEvent(new MouseEvent("mouseleave", { bubbles: true }));

    expect(previewApi.move).toHaveBeenCalledWith({
      x: 50,
      y: 60,
      placement: "cursor",
      triggerRect: expect.any(DOMRect),
    });
    expect(previewApi.hide).toHaveBeenCalledTimes(1);
  });
});
