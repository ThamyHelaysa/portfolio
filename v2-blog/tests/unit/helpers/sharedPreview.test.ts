import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PreviewTrigger } from "../../../src/_helpers/sharedPreview.ts";

/** Builds a trigger descriptor; override placement/getRect/type/kind per test. */
function trigger(src: string, over: Partial<PreviewTrigger> = {}): PreviewTrigger {
  return {
    src,
    placement: "cursor",
    getRect: () => new DOMRect(0, 0, 40, 40),
    ...over,
  };
}

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

    preview.reveal(trigger("/assets/cover.webp"), { cursor: { x: 100, y: 100 } });

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
    const t = trigger("/assets/cover.webp");

    preview.reveal(t, { cursor: { x: 0, y: 0 } });

    // Cursor keeps travelling fast (50px per 100ms tick) — no intent.
    for (let i = 1; i <= 5; i++) {
      preview.move(t, { x: i * 50, y: 0 });
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

    preview.reveal(trigger("/assets/cover.webp"), { cursor: { x: 100, y: 100 }, immediate: true });

    expect(wrapper?.classList.contains("is-visible")).toBe(true);
  });

  it("stays warm across item gaps: lingers on hide and swaps siblings instantly", async () => {
    const { SharedMediaPreview } = await import("../../../src/_helpers/sharedPreview.ts");
    const preview = SharedMediaPreview.getInstance();
    const wrapper = document.querySelector<HTMLDivElement>("#mediaPreview");
    const image = wrapper?.querySelector("img");

    // Intent proven on item A.
    preview.reveal(trigger("/assets/a.webp"), { cursor: { x: 100, y: 100 } });
    vi.advanceTimersByTime(100);
    expect(wrapper?.classList.contains("is-visible")).toBe(true);

    // Crossing the gap to item B: hide() lingers instead of collapsing…
    preview.hide();
    expect(wrapper?.classList.contains("is-visible")).toBe(true);

    // …and the sibling swaps in with no re-proving of intent.
    preview.reveal(trigger("/assets/b.webp"), { cursor: { x: 120, y: 100 } });
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

    preview.reveal(trigger("/assets/cover.webp"), { cursor: { x: 100, y: 100 } });
    preview.hide();

    vi.advanceTimersByTime(1000);
    expect(wrapper?.classList.contains("is-visible")).toBe(false);
  });

  it("marks an image loaded once it decodes, and re-blurs on media swap", async () => {
    const { SharedMediaPreview } = await import("../../../src/_helpers/sharedPreview.ts");
    const preview = SharedMediaPreview.getInstance();
    const wrapper = document.querySelector<HTMLDivElement>("#mediaPreview");
    const image = wrapper?.querySelector("img");

    preview.reveal(trigger("/assets/a.webp"), { cursor: { x: 100, y: 100 }, immediate: true });

    // Fresh media: still loading → CSS keeps it blurred.
    expect(image?.classList.contains("is-loaded")).toBe(false);

    image?.dispatchEvent(new Event("load"));
    expect(image?.classList.contains("is-loaded")).toBe(true);

    // Swapping to different media starts blurred again.
    preview.reveal(trigger("/assets/b.webp"), { cursor: { x: 100, y: 100 }, immediate: true });
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

    preview.reveal(trigger("/assets/a.mp4", { type: "video" }), { cursor: { x: 100, y: 100 }, immediate: true });
    expect(video?.classList.contains("is-loaded")).toBe(false);

    video?.dispatchEvent(new Event("canplay"));
    expect(video?.classList.contains("is-loaded")).toBe(true);

    preview.reveal(trigger("/assets/b.mp4", { type: "video" }), { cursor: { x: 100, y: 100 }, immediate: true });
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
    expect(preview.inferType("/assets/example.mp3")).toBe("audio");
    expect(preview.inferType("/assets/example.txt")).toBeUndefined();
  });

  it("shows an image preview and positions it within the viewport bounds", async () => {
    const { SharedMediaPreview } = await import("../../../src/_helpers/sharedPreview.ts");
    const preview = SharedMediaPreview.getInstance();

    preview.reveal(trigger("/assets/example.webp"), { cursor: { x: -30, y: -10 } });
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

  it("reveals a video paused and plays only on commit, pausing on hide", async () => {
    const { SharedMediaPreview } = await import("../../../src/_helpers/sharedPreview.ts");
    const preview = SharedMediaPreview.getInstance();
    const wrapper = document.querySelector<HTMLDivElement>("#mediaPreview");
    const video = wrapper?.querySelector("video");

    const play = vi.fn().mockResolvedValue(undefined);
    const pause = vi.fn();
    Object.defineProperty(video!, "play", { configurable: true, value: play });
    Object.defineProperty(video!, "pause", { configurable: true, value: pause });
    Object.defineProperty(video!, "paused", { configurable: true, get: () => false });

    // Reveal shows the clip paused — reveal ≠ play (ADR 0004).
    preview.reveal(trigger("/assets/demo.mp4", { type: "video" }), { cursor: { x: 40, y: 50 } });
    vi.advanceTimersByTime(100);

    expect(video?.classList.contains("visible")).toBe(true);
    expect(play).not.toHaveBeenCalled();

    // Commit: playback starts, the bubble grows and anchors.
    preview.commit(trigger("/assets/demo.mp4", { type: "video", getRect: () => new DOMRect(0, 0, 40, 40) }));

    expect(play).toHaveBeenCalledTimes(1);
    expect(wrapper?.classList.contains("is-playing")).toBe(true);
    expect(wrapper?.classList.contains("is-grown")).toBe(true);

    // Leaving stops playback and hides.
    preview.hide();

    expect(pause).toHaveBeenCalled();
    expect(wrapper?.classList.contains("is-playing")).toBe(false);
    expect(wrapper?.classList.contains("is-visible")).toBe(false);
  });

  it("toggles committed playback off on a second commit", async () => {
    const { SharedMediaPreview } = await import("../../../src/_helpers/sharedPreview.ts");
    const preview = SharedMediaPreview.getInstance();
    const wrapper = document.querySelector<HTMLDivElement>("#mediaPreview");
    const video = wrapper?.querySelector("video");

    const play = vi.fn().mockResolvedValue(undefined);
    const pause = vi.fn();
    Object.defineProperty(video!, "play", { configurable: true, value: play });
    Object.defineProperty(video!, "pause", { configurable: true, value: pause });
    Object.defineProperty(video!, "paused", { configurable: true, get: () => false });

    const t = trigger("/assets/demo.mp4", { type: "video", getRect: () => new DOMRect(0, 0, 40, 40) });

    const first = preview.commit(t);
    expect(first).toBe(true);
    expect(play).toHaveBeenCalledTimes(1);
    expect(wrapper?.classList.contains("is-playing")).toBe(true);

    const second = preview.commit(t);
    expect(second).toBe(false);
    expect(pause).toHaveBeenCalled();
    expect(wrapper?.classList.contains("is-playing")).toBe(false);
  });

  it("plays audio on commit and reports the playing state", async () => {
    const { SharedMediaPreview } = await import("../../../src/_helpers/sharedPreview.ts");
    const preview = SharedMediaPreview.getInstance();
    const wrapper = document.querySelector<HTMLDivElement>("#mediaPreview");
    const audio = wrapper?.querySelector("audio");

    const play = vi.fn().mockResolvedValue(undefined);
    const pause = vi.fn();
    Object.defineProperty(audio!, "play", { configurable: true, value: play });
    Object.defineProperty(audio!, "pause", { configurable: true, value: pause });
    Object.defineProperty(audio!, "paused", { configurable: true, get: () => false });

    const playing = preview.commit(
      trigger("/assets/song.mp3", { type: "audio", kind: "album", getRect: () => new DOMRect(0, 0, 40, 40) })
    );

    expect(playing).toBe(true);
    expect(play).toHaveBeenCalledTimes(1);
    expect(preview.isPlaying("/assets/song.mp3")).toBe(true);
    expect(wrapper?.dataset.kind).toBe("album");
    // The album disc spins only while playing (CSS reads is-playing).
    expect(wrapper?.classList.contains("is-playing")).toBe(true);

    preview.stop();
    expect(pause).toHaveBeenCalled();
    expect(preview.isPlaying()).toBe(false);
  });

  it("album: shows the Cover presentation and keeps a fixed box (no circle-grow)", async () => {
    const { SharedMediaPreview } = await import("../../../src/_helpers/sharedPreview.ts");
    const preview = SharedMediaPreview.getInstance();
    const wrapper = document.querySelector<HTMLDivElement>("#mediaPreview");
    const audio = wrapper?.querySelector("audio");
    Object.defineProperty(audio!, "play", { configurable: true, value: vi.fn().mockResolvedValue(undefined) });
    Object.defineProperty(audio!, "paused", { configurable: true, get: () => false });

    const presentation = wrapper?.querySelector<HTMLElement>(".album-presentation");
    const cover = presentation?.querySelector<HTMLImageElement>("img.album-cover");

    // Reveal: the album box (not the 100 circle), Cover shown + loaded.
    preview.reveal(
      trigger("/assets/song.mp3", { type: "audio", kind: "album", cover: "/assets/art.jpeg" }),
      { cursor: { x: 200, y: 200 }, immediate: true }
    );
    expect(wrapper?.style.getPropertyValue("--preview-w")).toBe("212px");
    expect(wrapper?.style.getPropertyValue("--album-cover")).toBe("100px");
    expect(presentation?.classList.contains("visible")).toBe(true);
    expect(cover?.getAttribute("src")).toBe("/assets/art.jpeg");

    // Commit: still the fixed album box — album opts out of the 220 grow.
    preview.commit(
      trigger("/assets/song.mp3", {
        type: "audio",
        kind: "album",
        cover: "/assets/art.jpeg",
        getRect: () => new DOMRect(0, 0, 40, 40),
      })
    );
    expect(wrapper?.style.getPropertyValue("--preview-w")).toBe("212px");
    expect(wrapper?.classList.contains("is-playing")).toBe(true);
    expect(wrapper?.classList.contains("is-grown")).toBe(false);

    // Hide clears the presentation and the album sizing var.
    preview.stop();
    expect(presentation?.classList.contains("visible")).toBe(false);
    expect(wrapper?.style.getPropertyValue("--album-cover")).toBe("");
  });

  it("album → other: retracts fully before revealing, never morphing the shape", async () => {
    const { SharedMediaPreview } = await import("../../../src/_helpers/sharedPreview.ts");
    const preview = SharedMediaPreview.getInstance();
    const wrapper = document.querySelector<HTMLDivElement>("#mediaPreview");

    // Album glimpse up.
    preview.reveal(
      trigger("/assets/song.mp3", { type: "audio", kind: "album", cover: "/assets/art.jpeg" }),
      { immediate: true }
    );
    expect(wrapper?.dataset.kind).toBe("album");
    expect(wrapper?.classList.contains("is-visible")).toBe(true);

    // Hovering a round (image) card must NOT re-shape in place: the album is
    // still the shown kind and the bubble has begun retracting.
    preview.reveal(trigger("/assets/pic.webp"), { immediate: true });
    expect(wrapper?.classList.contains("is-visible")).toBe(false);
    expect(wrapper?.dataset.kind).toBe("album");

    // Once retracted, the round glimpse appears with geometry snapped (is-swapping)
    // so only the entrance animates.
    vi.advanceTimersByTime(200);
    expect(wrapper?.dataset.kind).toBeUndefined();
    expect(wrapper?.style.getPropertyValue("--preview-w")).toBe("100px");
    expect(wrapper?.classList.contains("is-visible")).toBe(true);
    expect(wrapper?.classList.contains("is-swapping")).toBe(true);

    // is-swapping is dropped after the entrance so future grows still ease.
    vi.advanceTimersByTime(200);
    expect(wrapper?.classList.contains("is-swapping")).toBe(false);
  });

  it("other → other: same round shape swaps instantly (no retract)", async () => {
    const { SharedMediaPreview } = await import("../../../src/_helpers/sharedPreview.ts");
    const preview = SharedMediaPreview.getInstance();
    const wrapper = document.querySelector<HTMLDivElement>("#mediaPreview");

    preview.reveal(trigger("/assets/a.webp"), { immediate: true });
    preview.reveal(trigger("/assets/b.webp"), { immediate: true });
    // No shape boundary crossed → warm instant swap, never a retract/defer.
    expect(wrapper?.classList.contains("is-visible")).toBe(true);
    expect(wrapper?.classList.contains("is-swapping")).toBe(false);
  });

  it("warns when committed playback is blocked", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { SharedMediaPreview } = await import("../../../src/_helpers/sharedPreview.ts");
    const preview = SharedMediaPreview.getInstance();
    const wrapper = document.querySelector<HTMLDivElement>("#mediaPreview");
    const video = wrapper?.querySelector("video");
    const blockedError = new Error("blocked");

    Object.defineProperty(video!, "play", {
      configurable: true,
      value: vi.fn().mockRejectedValue(blockedError),
    });

    preview.commit(trigger("/assets/demo.mp4", { type: "video", getRect: () => new DOMRect(0, 0, 40, 40) }));

    await Promise.resolve();

    expect(warn).toHaveBeenCalledWith(
      "[SharedMediaPreview] Preview playback failed",
      blockedError
    );
  });

  it("keeps every glimpse a 100x100 circle and grows to 220 on commit", async () => {
    const { SharedMediaPreview } = await import("../../../src/_helpers/sharedPreview.ts");
    const preview = SharedMediaPreview.getInstance();
    const wrapper = document.querySelector<HTMLDivElement>("#mediaPreview");
    const video = wrapper?.querySelector("video");

    Object.defineProperty(video!, "play", {
      configurable: true,
      value: vi.fn().mockResolvedValue(undefined),
    });
    Object.defineProperty(video!, "paused", { configurable: true, get: () => false });

    // Image glimpse: small circle.
    preview.reveal(trigger("/assets/example.webp"), { cursor: { x: 200, y: 200 } });
    expect(wrapper?.style.getPropertyValue("--preview-w")).toBe("100px");
    expect(wrapper?.style.getPropertyValue("--preview-h")).toBe("100px");
    expect(wrapper?.dataset.type).toBe("image");

    // Video glimpse is the SAME small circle — no more 16:9 rect.
    preview.reveal(trigger("/assets/demo.mp4", { type: "video" }), { cursor: { x: 400, y: 300 } });
    expect(wrapper?.style.getPropertyValue("--preview-w")).toBe("100px");
    expect(wrapper?.style.getPropertyValue("--preview-h")).toBe("100px");
    expect(wrapper?.dataset.type).toBe("video");

    // Committing grows it.
    preview.commit(trigger("/assets/demo.mp4", { type: "video", getRect: () => new DOMRect(0, 0, 40, 40) }));
    expect(wrapper?.style.getPropertyValue("--preview-w")).toBe("220px");
    expect(wrapper?.style.getPropertyValue("--preview-h")).toBe("220px");
  });

  it("reflects the media kind on the wrapper and clears it on hide", async () => {
    const { SharedMediaPreview } = await import("../../../src/_helpers/sharedPreview.ts");
    const preview = SharedMediaPreview.getInstance();
    const wrapper = document.querySelector<HTMLDivElement>("#mediaPreview");

    preview.reveal(trigger("/assets/cover.jpg", { kind: "album" }), { cursor: { x: 200, y: 200 } });
    expect(wrapper?.dataset.kind).toBe("album");

    preview.hide();
    expect(wrapper?.dataset.kind).toBeUndefined();

    // a kindless reveal never leaks the previous kind
    preview.reveal(trigger("/assets/cover.jpg", { kind: "album" }), { cursor: { x: 200, y: 200 } });
    preview.reveal(trigger("/assets/other.jpg"), { cursor: { x: 200, y: 200 } });
    expect(wrapper?.dataset.kind).toBeUndefined();
  });

  it("hideIfCurrent only hides when the given src still owns the bubble", async () => {
    const { SharedMediaPreview } = await import("../../../src/_helpers/sharedPreview.ts");
    const preview = SharedMediaPreview.getInstance();
    const wrapper = document.querySelector<HTMLDivElement>("#mediaPreview");

    preview.reveal(trigger("/assets/b.webp"), { cursor: { x: 100, y: 100 }, immediate: true });
    expect(wrapper?.classList.contains("is-visible")).toBe(true);

    // A card that no longer owns the bubble must not hide it.
    preview.hideIfCurrent("/assets/a.webp");
    expect(wrapper?.classList.contains("is-visible")).toBe(true);

    // The owning card can.
    preview.hideIfCurrent("/assets/b.webp");
    vi.advanceTimersByTime(100);
    expect(wrapper?.classList.contains("is-visible")).toBe(false);
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

    preview.reveal(
      trigger("/assets/example.jpg", { placement: "right", getRect: () => new DOMRect(20, 50, 40, 40) })
    );

    const wrapper = document.querySelector<HTMLDivElement>("#mediaPreview");

    expect(wrapper?.style.getPropertyValue("--preview-x")).toBe("72px");
    expect(wrapper?.style.getPropertyValue("--preview-y")).toBe("20px");
  });

  it("desktop: dismisses committed playback once scrolled past the threshold", async () => {
    const { SharedMediaPreview } = await import("../../../src/_helpers/sharedPreview.ts");
    const preview = SharedMediaPreview.getInstance();
    const wrapper = document.querySelector<HTMLDivElement>("#mediaPreview");
    const video = wrapper?.querySelector("video");

    const pause = vi.fn();
    Object.defineProperty(video!, "play", { configurable: true, value: vi.fn().mockResolvedValue(undefined) });
    Object.defineProperty(video!, "pause", { configurable: true, value: pause });
    Object.defineProperty(video!, "paused", { configurable: true, get: () => false });

    // matchMedia undefined here → coarse pointer false → desktop path.
    preview.commit(trigger("/assets/demo.mp4", { type: "video", getRect: () => new DOMRect(0, 100, 40, 40) }));
    expect(wrapper?.classList.contains("is-playing")).toBe(true);

    // A tiny jitter must not dismiss.
    Object.defineProperty(window, "scrollY", { configurable: true, value: 4 });
    (preview as unknown as { _onScrollFrame(): void })._onScrollFrame();
    expect(wrapper?.classList.contains("is-playing")).toBe(true);

    // Real scroll past the threshold dismisses.
    Object.defineProperty(window, "scrollY", { configurable: true, value: 40 });
    (preview as unknown as { _onScrollFrame(): void })._onScrollFrame();
    expect(wrapper?.classList.contains("is-playing")).toBe(false);
    expect(wrapper?.classList.contains("is-visible")).toBe(false);
    expect(pause).toHaveBeenCalled();

    Object.defineProperty(window, "scrollY", { configurable: true, value: 0 });
  });

  it("touch: stops committed playback when the source scrolls fully off-screen", async () => {
    const mm = vi.fn((q: string) => ({ matches: q.includes("hover: none") })) as unknown as typeof window.matchMedia;
    const prev = window.matchMedia;
    window.matchMedia = mm;
    try {
      const { SharedMediaPreview } = await import("../../../src/_helpers/sharedPreview.ts");
      const preview = SharedMediaPreview.getInstance();
      const wrapper = document.querySelector<HTMLDivElement>("#mediaPreview");
      const audio = wrapper?.querySelector("audio");

      const pause = vi.fn();
      Object.defineProperty(audio!, "play", { configurable: true, value: vi.fn().mockResolvedValue(undefined) });
      Object.defineProperty(audio!, "pause", { configurable: true, value: pause });
      Object.defineProperty(audio!, "paused", { configurable: true, get: () => false });

      let rect = new DOMRect(0, 300, 300, 80); // on-screen
      preview.commit(trigger("/assets/song.mp3", { type: "audio", kind: "album", getRect: () => rect }));
      expect(preview.isPlaying()).toBe(true);

      // Still partly visible → keeps playing.
      rect = new DOMRect(0, 10, 300, 80);
      (preview as unknown as { _onScrollFrame(): void })._onScrollFrame();
      expect(preview.isPlaying()).toBe(true);

      // Fully above the viewport → stop.
      rect = new DOMRect(0, -200, 300, 80);
      (preview as unknown as { _onScrollFrame(): void })._onScrollFrame();
      expect(preview.isPlaying()).toBe(false);
      expect(pause).toHaveBeenCalled();
    } finally {
      window.matchMedia = prev;
    }
  });

  it("touch: a tracked glimpse trails its source past the top edge (vertical unclamped)", async () => {
    const mm = vi.fn((q: string) => ({ matches: q.includes("hover: none") })) as unknown as typeof window.matchMedia;
    const prev = window.matchMedia;
    window.matchMedia = mm;
    try {
      const { SharedMediaPreview } = await import("../../../src/_helpers/sharedPreview.ts");
      const preview = SharedMediaPreview.getInstance();
      const wrapper = document.querySelector<HTMLDivElement>("#mediaPreview");

      let rect = new DOMRect(0, 400, 300, 40);
      preview.reveal(
        trigger("/assets/cover.jpg", { placement: "right", getRect: () => rect }),
        { immediate: true }
      );
      expect(wrapper?.classList.contains("is-visible")).toBe(true);

      // Card scrolled above the viewport: y follows it negative, not pinned.
      rect = new DOMRect(0, -100, 300, 40);
      (preview as unknown as { _onScrollFrame(): void })._onScrollFrame();

      // right placement, glimpse h=100: eixoY = -100 + (40 - 100) / 2 = -130.
      expect(wrapper?.style.getPropertyValue("--preview-y")).toBe("-130px");
      expect(wrapper?.classList.contains("is-tracking")).toBe(true);

      preview.hide();
    } finally {
      window.matchMedia = prev;
    }
  });
});
