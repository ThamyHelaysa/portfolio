import { beforeEach, describe, expect, it, vi } from "vitest";

const previewApi = {
  reveal: vi.fn(),
  move: vi.fn(),
  hide: vi.fn(),
  commit: vi.fn(() => true),
  stop: vi.fn(),
};

vi.mock("../../../src/_helpers/sharedPreview.ts", () => ({
  SharedMediaPreview: {
    getInstance: () => previewApi,
    STOPPED_EVENT: "sharedpreview:stopped",
  },
}));

import { MediaPreview } from "../../../src/components/media-preview.ts";

describe("media-preview", () => {
  beforeEach(() => {
    previewApi.reveal.mockReset();
    previewApi.move.mockReset();
    previewApi.hide.mockReset();
    previewApi.commit.mockReset();
    previewApi.commit.mockReturnValue(true);
    previewApi.stop.mockReset();
  });

  it("reveals on mouseenter, handing over a trigger + the cursor point", async () => {
    const element = new MediaPreview();
    element.previewSrc = "/assets/example.webp";
    element.previewType = "image";
    element.previewPosition = "right";

    vi.spyOn(element, "getBoundingClientRect").mockReturnValue(new DOMRect(10, 20, 30, 40));

    document.body.appendChild(element);
    await element.updateComplete;

    const wrapper = element.shadowRoot?.querySelector(".wrapper");
    wrapper?.dispatchEvent(new MouseEvent("mouseenter", { clientX: 15, clientY: 25, bubbles: true }));

    expect(previewApi.reveal).toHaveBeenCalledWith(
      expect.objectContaining({
        src: "/assets/example.webp",
        type: "image",
        placement: "right",
        getRect: expect.any(Function),
      }),
      { cursor: { x: 15, y: 25 } }
    );
  });

  it("passes the media kind through on the trigger", async () => {
    const element = new MediaPreview();
    element.previewSrc = "/assets/cover.jpg";
    element.previewType = "image";
    element.mediaKind = "album";

    vi.spyOn(element, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 0, 10, 10));

    document.body.appendChild(element);
    await element.updateComplete;

    const wrapper = element.shadowRoot?.querySelector(".wrapper");
    wrapper?.dispatchEvent(new MouseEvent("mouseenter", { clientX: 5, clientY: 5, bubbles: true }));

    expect(previewApi.reveal).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "album" }),
      expect.anything()
    );
  });

  it("reads the media-kind attribute", async () => {
    const element = new MediaPreview();
    element.setAttribute("media-kind", "album");

    document.body.appendChild(element);
    await element.updateComplete;

    expect(element.mediaKind).toBe("album");
  });

  it("does not touch the bubble when previewSrc is missing", async () => {
    const element = new MediaPreview();
    document.body.appendChild(element);
    await element.updateComplete;

    const wrapper = element.shadowRoot?.querySelector(".wrapper");
    wrapper?.dispatchEvent(new MouseEvent("mouseenter", { clientX: 10, clientY: 20, bubbles: true }));
    wrapper?.dispatchEvent(new MouseEvent("mousemove", { clientX: 30, clientY: 40, bubbles: true }));

    expect(previewApi.reveal).not.toHaveBeenCalled();
    expect(previewApi.move).not.toHaveBeenCalled();
  });

  it("reveals immediately on keyboard focus (no cursor)", async () => {
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

    expect(previewApi.reveal).toHaveBeenCalledWith(
      expect.objectContaining({ src: "/assets/example.webp", placement: "bottom", getRect: expect.any(Function) }),
      { immediate: true }
    );
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

  it("repositions on mousemove and hides on mouseleave", async () => {
    const element = new MediaPreview();
    element.previewSrc = "/assets/example.webp";

    vi.spyOn(element, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 0, 20, 20));

    document.body.appendChild(element);
    await element.updateComplete;

    const wrapper = element.shadowRoot?.querySelector(".wrapper");
    wrapper?.dispatchEvent(new MouseEvent("mousemove", { clientX: 50, clientY: 60, bubbles: true }));
    wrapper?.dispatchEvent(new MouseEvent("mouseleave", { bubbles: true }));

    expect(previewApi.move).toHaveBeenCalledWith(
      expect.objectContaining({ getRect: expect.any(Function) }),
      { x: 50, y: 60 }
    );
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

    wrapper?.dispatchEvent(new MouseEvent("click", { bubbles: true, clientX: 12, clientY: 34 }));

    // The click cursor rides along so playback grows the bubble where the user
    // clicked, not at the card's edge.
    expect(previewApi.commit).toHaveBeenCalledWith(
      expect.objectContaining({ src: "/assets/song.mp3", type: "audio", kind: "album" }),
      { cursor: { x: 12, y: 34 } }
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
    expect(previewApi.commit).toHaveBeenCalledTimes(1);

    await element.updateComplete;
    wrapper?.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(previewApi.stop).toHaveBeenCalledTimes(1);
  });

  it("clears aria-pressed when the shared bubble reports our media stopped", async () => {
    const element = new MediaPreview();
    element.previewSrc = "/assets/song.mp3";
    element.previewType = "audio";

    vi.spyOn(element, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 0, 40, 40));

    document.body.appendChild(element);
    await element.updateComplete;

    const wrapper = element.shadowRoot?.querySelector(".wrapper");
    wrapper?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await element.updateComplete;
    expect(wrapper?.getAttribute("aria-pressed")).toBe("true");

    // The singleton stopped this src (scroll-out / dismiss / retarget).
    window.dispatchEvent(new CustomEvent("sharedpreview:stopped", { detail: { src: "/assets/song.mp3" } }));
    await element.updateComplete;
    expect(wrapper?.getAttribute("aria-pressed")).toBe("false");
  });

  it("is reveal-only for images — no button role, no commit on click", async () => {
    const element = new MediaPreview();
    element.previewSrc = "/assets/cover.jpg";
    element.previewType = "image";

    document.body.appendChild(element);
    await element.updateComplete;

    const wrapper = element.shadowRoot?.querySelector(".wrapper");
    expect(wrapper?.getAttribute("role")).toBeNull();
    expect(wrapper?.getAttribute("aria-pressed")).toBeNull();

    wrapper?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(previewApi.commit).not.toHaveBeenCalled();
  });
});
