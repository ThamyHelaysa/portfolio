import { beforeEach, describe, expect, it, vi } from "vitest";

describe("sharedPreview", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    vi.resetModules();
  });

  it("creates a single shared preview instance and appends one wrapper", async () => {
    const { SharedMediaPreview } = await import("../../../src/_helpers/sharedPreview.ts");

    const first = SharedMediaPreview.getInstance();
    const second = SharedMediaPreview.getInstance();

    expect(first).toBe(second);
    expect(document.querySelectorAll("#mediaPreview")).toHaveLength(1);
  });

  it("infers image and video types from file extensions", async () => {
    const { SharedMediaPreview } = await import("../../../src/_helpers/sharedPreview.ts");
    const preview = SharedMediaPreview.getInstance();

    expect(preview.inferType("/assets/example.webp")).toBe("image");
    expect(preview.inferType("/assets/example.mp4")).toBe("video");
    expect(preview.inferType("/assets/example.txt")).toBeUndefined();
  });

  it("shows an image preview and positions it within the viewport bounds", async () => {
    const { SharedMediaPreview } = await import("../../../src/_helpers/sharedPreview.ts");
    const preview = SharedMediaPreview.getInstance();

    preview.show({
      src: "/assets/example.webp",
      x: -30,
      y: -10,
    });

    const wrapper = document.querySelector<HTMLDivElement>("#mediaPreview");
    const image = wrapper?.querySelector("img");
    const video = wrapper?.querySelector("video");

    expect(wrapper?.classList.contains("is-visible")).toBe(true);
    expect(wrapper?.style.getPropertyValue("--preview-x")).toBe("12px");
    expect(wrapper?.style.getPropertyValue("--preview-y")).toBe("12px");
    expect(image?.classList.contains("visible")).toBe(true);
    expect(video?.classList.contains("visible")).toBe(false);
    expect(image?.getAttribute("src")).toContain("/assets/example.webp");
  });

  it("shows a video preview and pauses it when hidden", async () => {
    const { SharedMediaPreview } = await import("../../../src/_helpers/sharedPreview.ts");
    const preview = SharedMediaPreview.getInstance();
    const wrapper = document.querySelector<HTMLDivElement>("#mediaPreview");
    const video = wrapper?.querySelector("video");

    const play = vi.fn().mockResolvedValue(undefined);
    const pause = vi.fn();
    Object.defineProperty(video!, "play", {
      configurable: true,
      value: play,
    });
    Object.defineProperty(video!, "pause", {
      configurable: true,
      value: pause,
    });
    Object.defineProperty(video!, "paused", {
      configurable: true,
      get: () => false,
    });

    preview.show({
      src: "/assets/demo.mp4",
      x: 40,
      y: 50,
      type: "video",
    });

    expect(video?.classList.contains("visible")).toBe(true);
    expect(play).toHaveBeenCalledTimes(1);

    preview.hide();

    expect(wrapper?.classList.contains("is-visible")).toBe(false);
    expect(video?.classList.contains("visible")).toBe(false);
    expect(pause).toHaveBeenCalledTimes(1);
  });

  it("does not replay the same visible video repeatedly", async () => {
    const { SharedMediaPreview } = await import("../../../src/_helpers/sharedPreview.ts");
    const preview = SharedMediaPreview.getInstance();
    const wrapper = document.querySelector<HTMLDivElement>("#mediaPreview");
    const video = wrapper?.querySelector("video");

    const play = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(video!, "play", {
      configurable: true,
      value: play,
    });
    Object.defineProperty(video!, "paused", {
      configurable: true,
      get: () => false,
    });

    preview.show({
      src: "/assets/demo.mp4",
      x: 40,
      y: 50,
      type: "video",
    });

    preview.show({
      src: "/assets/demo.mp4",
      x: 90,
      y: 100,
      type: "video",
    });

    expect(play).toHaveBeenCalledTimes(1);
    expect(wrapper?.style.getPropertyValue("--preview-x")).toBe("40px");
    expect(wrapper?.style.getPropertyValue("--preview-y")).toBe("50px");
  });

  it("positions relative to the trigger for non-cursor placements", async () => {
    const { SharedMediaPreview } = await import("../../../src/_helpers/sharedPreview.ts");
    const preview = SharedMediaPreview.getInstance();

    preview.show({
      src: "/assets/example.jpg",
      x: 0,
      y: 0,
      placement: "right",
      triggerRect: new DOMRect(20, 50, 40, 40),
    });

    const wrapper = document.querySelector<HTMLDivElement>("#mediaPreview");

    expect(wrapper?.style.getPropertyValue("--preview-x")).toBe("72px");
    expect(wrapper?.style.getPropertyValue("--preview-y")).toBe("20px");
  });
});
