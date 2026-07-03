import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("sharedPreview", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    vi.resetModules();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("defers reveal until the cursor settles over the trigger (hover intent)", async () => {
    const { SharedMediaPreview } = await import("../../../src/_helpers/sharedPreview.ts");
    const preview = SharedMediaPreview.getInstance();
    const wrapper = document.querySelector<HTMLDivElement>("#mediaPreview");

    preview.show({ src: "/assets/cover.webp", x: 100, y: 100 });

    // A sweep-through hover must not flash the bubble.
    expect(wrapper?.classList.contains("is-visible")).toBe(false);

    // Cursor holds still for one intent tick → intent proven.
    vi.advanceTimersByTime(100);
    expect(wrapper?.classList.contains("is-visible")).toBe(true);
  });

  it("never reveals while the cursor keeps sweeping, then reveals once it settles", async () => {
    const { SharedMediaPreview } = await import("../../../src/_helpers/sharedPreview.ts");
    const preview = SharedMediaPreview.getInstance();
    const wrapper = document.querySelector<HTMLDivElement>("#mediaPreview");

    preview.show({ src: "/assets/cover.webp", x: 0, y: 0 });

    // Cursor keeps travelling fast (50px per 100ms tick) — no intent.
    for (let i = 1; i <= 5; i++) {
      preview.move({ x: i * 50, y: 0 });
      vi.advanceTimersByTime(100);
    }
    expect(wrapper?.classList.contains("is-visible")).toBe(false);

    // Cursor settles → intent proven on the next tick.
    vi.advanceTimersByTime(100);
    expect(wrapper?.classList.contains("is-visible")).toBe(true);
  });

  it("reveals immediately when intent is already proven (keyboard focus)", async () => {
    const { SharedMediaPreview } = await import("../../../src/_helpers/sharedPreview.ts");
    const preview = SharedMediaPreview.getInstance();
    const wrapper = document.querySelector<HTMLDivElement>("#mediaPreview");

    preview.show({ src: "/assets/cover.webp", x: 100, y: 100, immediate: true });

    expect(wrapper?.classList.contains("is-visible")).toBe(true);
  });

  it("stays warm across item gaps: lingers on hide and swaps siblings instantly", async () => {
    const { SharedMediaPreview } = await import("../../../src/_helpers/sharedPreview.ts");
    const preview = SharedMediaPreview.getInstance();
    const wrapper = document.querySelector<HTMLDivElement>("#mediaPreview");
    const image = wrapper?.querySelector("img");

    // Intent proven on item A.
    preview.show({ src: "/assets/a.webp", x: 100, y: 100 });
    vi.advanceTimersByTime(100);
    expect(wrapper?.classList.contains("is-visible")).toBe(true);

    // Crossing the gap to item B: hide() lingers instead of collapsing…
    preview.hide();
    expect(wrapper?.classList.contains("is-visible")).toBe(true);

    // …and the sibling swaps in with no re-proving of intent.
    preview.show({ src: "/assets/b.webp", x: 120, y: 100 });
    expect(wrapper?.classList.contains("is-visible")).toBe(true);
    expect(image?.getAttribute("src")).toContain("/assets/b.webp");

    // Leaving for good: linger expires and the bubble hides.
    preview.hide();
    vi.advanceTimersByTime(100);
    expect(wrapper?.classList.contains("is-visible")).toBe(false);
  });

  it("drops a pending preview when the cursor leaves before intent is proven", async () => {
    const { SharedMediaPreview } = await import("../../../src/_helpers/sharedPreview.ts");
    const preview = SharedMediaPreview.getInstance();
    const wrapper = document.querySelector<HTMLDivElement>("#mediaPreview");

    preview.show({ src: "/assets/cover.webp", x: 100, y: 100 });
    preview.hide();

    vi.advanceTimersByTime(1000);
    expect(wrapper?.classList.contains("is-visible")).toBe(false);
  });

  it("marks an image loaded once it decodes, and re-blurs on media swap", async () => {
    const { SharedMediaPreview } = await import("../../../src/_helpers/sharedPreview.ts");
    const preview = SharedMediaPreview.getInstance();
    const wrapper = document.querySelector<HTMLDivElement>("#mediaPreview");
    const image = wrapper?.querySelector("img");

    preview.show({ src: "/assets/a.webp", x: 100, y: 100, immediate: true });

    // Fresh media: still loading → CSS keeps it blurred.
    expect(image?.classList.contains("is-loaded")).toBe(false);

    image?.dispatchEvent(new Event("load"));
    expect(image?.classList.contains("is-loaded")).toBe(true);

    // Swapping to different media starts blurred again.
    preview.show({ src: "/assets/b.webp", x: 100, y: 100, immediate: true });
    expect(image?.classList.contains("is-loaded")).toBe(false);
  });

  it("marks a video loaded once it can play, and re-blurs on media swap", async () => {
    const { SharedMediaPreview } = await import("../../../src/_helpers/sharedPreview.ts");
    const preview = SharedMediaPreview.getInstance();
    const wrapper = document.querySelector<HTMLDivElement>("#mediaPreview");
    const video = wrapper?.querySelector("video");

    Object.defineProperty(video!, "play", {
      configurable: true,
      value: vi.fn().mockResolvedValue(undefined),
    });

    preview.show({ src: "/assets/a.mp4", x: 100, y: 100, type: "video", immediate: true });
    expect(video?.classList.contains("is-loaded")).toBe(false);

    video?.dispatchEvent(new Event("canplay"));
    expect(video?.classList.contains("is-loaded")).toBe(true);

    preview.show({ src: "/assets/b.mp4", x: 100, y: 100, type: "video", immediate: true });
    expect(video?.classList.contains("is-loaded")).toBe(false);
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
    vi.advanceTimersByTime(100);

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
    vi.advanceTimersByTime(100);

    expect(video?.classList.contains("visible")).toBe(true);
    expect(play).toHaveBeenCalledTimes(1);

    preview.hide();
    vi.advanceTimersByTime(100);

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
    vi.advanceTimersByTime(100);

    preview.show({
      src: "/assets/demo.mp4",
      x: 400,
      y: 300,
      type: "video",
    });
    vi.advanceTimersByTime(100);

    expect(play).toHaveBeenCalledTimes(1);
    // video box is 240x135, centered on the cursor
    expect(wrapper?.style.getPropertyValue("--preview-x")).toBe("280px");
    expect(wrapper?.style.getPropertyValue("--preview-y")).toBe("232.5px");
  });

  it("warns when video autoplay is blocked", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { SharedMediaPreview } = await import("../../../src/_helpers/sharedPreview.ts");
    const preview = SharedMediaPreview.getInstance();
    const wrapper = document.querySelector<HTMLDivElement>("#mediaPreview");
    const video = wrapper?.querySelector("video");
    const autoplayError = new Error("blocked");

    Object.defineProperty(video!, "play", {
      configurable: true,
      value: vi.fn().mockRejectedValue(autoplayError),
    });

    preview.show({
      src: "/assets/demo.mp4",
      x: 40,
      y: 50,
      type: "video",
    });
    vi.advanceTimersByTime(100);

    await Promise.resolve();

    expect(warn).toHaveBeenCalledWith(
      "[SharedMediaPreview] Video preview autoplay failed",
      autoplayError
    );
  });

  it("sizes the bubble per preview type and exposes it to CSS", async () => {
    const { SharedMediaPreview } = await import("../../../src/_helpers/sharedPreview.ts");
    const preview = SharedMediaPreview.getInstance();
    const wrapper = document.querySelector<HTMLDivElement>("#mediaPreview");
    const video = wrapper?.querySelector("video");

    Object.defineProperty(video!, "play", {
      configurable: true,
      value: vi.fn().mockResolvedValue(undefined),
    });

    preview.show({ src: "/assets/example.webp", x: 200, y: 200 });

    expect(wrapper?.style.getPropertyValue("--preview-w")).toBe("100px");
    expect(wrapper?.style.getPropertyValue("--preview-h")).toBe("100px");
    expect(wrapper?.dataset.type).toBe("image");

    preview.show({ src: "/assets/demo.mp4", x: 400, y: 300, type: "video" });

    expect(wrapper?.style.getPropertyValue("--preview-w")).toBe("240px");
    expect(wrapper?.style.getPropertyValue("--preview-h")).toBe("135px");
    expect(wrapper?.dataset.type).toBe("video");
    // cursor placement centers on the video box, not the image box
    expect(wrapper?.style.getPropertyValue("--preview-x")).toBe("280px");
    expect(wrapper?.style.getPropertyValue("--preview-y")).toBe("232.5px");
  });

  it("reflects the media kind on the wrapper and clears it on hide", async () => {
    const { SharedMediaPreview } = await import("../../../src/_helpers/sharedPreview.ts");
    const preview = SharedMediaPreview.getInstance();
    const wrapper = document.querySelector<HTMLDivElement>("#mediaPreview");

    preview.show({ src: "/assets/cover.jpg", x: 200, y: 200, kind: "album" });
    expect(wrapper?.dataset.kind).toBe("album");

    preview.hide();
    expect(wrapper?.dataset.kind).toBeUndefined();

    // a kindless show never leaks the previous kind
    preview.show({ src: "/assets/cover.jpg", x: 200, y: 200, kind: "album" });
    preview.show({ src: "/assets/other.jpg", x: 200, y: 200 });
    expect(wrapper?.dataset.kind).toBeUndefined();
  });

  it("marks the bubble as decorative for assistive tech", async () => {
    const { SharedMediaPreview } = await import("../../../src/_helpers/sharedPreview.ts");
    SharedMediaPreview.getInstance();

    const wrapper = document.querySelector<HTMLDivElement>("#mediaPreview");
    expect(wrapper?.getAttribute("aria-hidden")).toBe("true");
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
