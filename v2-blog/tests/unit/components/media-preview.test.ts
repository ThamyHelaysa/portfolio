import { beforeEach, describe, expect, it, vi } from "vitest";

const previewApi = {
  show: vi.fn(),
  move: vi.fn(),
  hide: vi.fn(),
  togglePlay: vi.fn(() => true),
  stop: vi.fn(),
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
    previewApi.togglePlay.mockReset();
    previewApi.togglePlay.mockReturnValue(true);
    previewApi.stop.mockReset();
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

  it("passes the media kind through to the shared preview", async () => {
    const element = new MediaPreview();
    element.previewSrc = "/assets/cover.jpg";
    element.previewType = "image";
    element.mediaKind = "album";

    vi.spyOn(element, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 0, 10, 10));

    document.body.appendChild(element);
    await element.updateComplete;

    const wrapper = element.shadowRoot?.querySelector(".wrapper");
    wrapper?.dispatchEvent(new MouseEvent("mouseenter", { clientX: 5, clientY: 5, bubbles: true }));

    expect(previewApi.show).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "album" })
    );
  });

  it("reads the media-kind attribute", async () => {
    const element = new MediaPreview();
    element.setAttribute("media-kind", "album");

    document.body.appendChild(element);
    await element.updateComplete;

    expect(element.mediaKind).toBe("album");
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
      immediate: true,
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

  it("commits playback on click for a playable type and reflects aria-pressed", async () => {
    const element = new MediaPreview();
    element.previewSrc = "/assets/song.mp3";
    element.previewType = "audio";
    element.mediaKind = "album";

    vi.spyOn(element, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 0, 40, 40));

    document.body.appendChild(element);
    await element.updateComplete;

    const wrapper = element.shadowRoot?.querySelector(".wrapper");
    // Playable types become a real button for assistive tech.
    expect(wrapper?.getAttribute("role")).toBe("button");
    expect(wrapper?.getAttribute("aria-pressed")).toBe("false");

    wrapper?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(previewApi.togglePlay).toHaveBeenCalledWith(
      expect.objectContaining({ src: "/assets/song.mp3", type: "audio", kind: "album" })
    );

    await element.updateComplete;
    expect(wrapper?.getAttribute("aria-pressed")).toBe("true");
  });

  it("commits playback on Enter/Space and stops on Escape", async () => {
    const element = new MediaPreview();
    element.previewSrc = "/assets/demo.mp4";
    element.previewType = "video";

    vi.spyOn(element, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 0, 40, 40));

    document.body.appendChild(element);
    await element.updateComplete;

    const wrapper = element.shadowRoot?.querySelector(".wrapper");

    wrapper?.dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true }));
    expect(previewApi.togglePlay).toHaveBeenCalledTimes(1);

    await element.updateComplete;
    wrapper?.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(previewApi.stop).toHaveBeenCalledTimes(1);
  });

  it("is reveal-only for images — no button role, no playback on click", async () => {
    const element = new MediaPreview();
    element.previewSrc = "/assets/cover.jpg";
    element.previewType = "image";

    document.body.appendChild(element);
    await element.updateComplete;

    const wrapper = element.shadowRoot?.querySelector(".wrapper");
    expect(wrapper?.getAttribute("role")).toBeNull();
    expect(wrapper?.getAttribute("aria-pressed")).toBeNull();

    wrapper?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(previewApi.togglePlay).not.toHaveBeenCalled();
  });
});
