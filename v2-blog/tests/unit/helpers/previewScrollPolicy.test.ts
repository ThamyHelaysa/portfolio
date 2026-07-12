import { describe, expect, it } from "vitest";
import {
  decideScrollFrame,
  DESKTOP_SCROLL_STOP_PX,
  type ScrollFrameInput,
} from "../../../src/_helpers/previewScrollPolicy.ts";

/** A frame with quiet defaults; each case overrides only what it exercises. */
function frame(over: Partial<ScrollFrameInput> = {}): ScrollFrameInput {
  return {
    visible: true,
    coarsePointer: false,
    committed: false,
    sourceRect: null,
    viewportHeight: 768,
    scrollY: 0,
    playStartScrollY: 0,
    ...over,
  };
}

describe("previewScrollPolicy — hidden bubble", () => {
  it("detaches tracking when the bubble is no longer visible", () => {
    expect(decideScrollFrame(frame({ visible: false }))).toEqual([{ type: "stopTracking" }]);
  });

  it("detaches even mid-playback on touch — nothing else runs on a hidden bubble", () => {
    const input = frame({
      visible: false,
      coarsePointer: true,
      committed: true,
      sourceRect: { top: 100, bottom: 180 },
    });
    expect(decideScrollFrame(input)).toEqual([{ type: "stopTracking" }]);
  });
});

describe("previewScrollPolicy — desktop dismiss-on-scroll (ADR 0004)", () => {
  it("keeps playing within the jitter threshold", () => {
    const input = frame({ committed: true, scrollY: 4, playStartScrollY: 0 });
    expect(decideScrollFrame(input)).toEqual([]);
  });

  it("keeps playing at exactly the threshold — only real travel dismisses", () => {
    const input = frame({ committed: true, scrollY: DESKTOP_SCROLL_STOP_PX, playStartScrollY: 0 });
    expect(decideScrollFrame(input)).toEqual([]);
  });

  it("stops committed playback once scrolled past the threshold", () => {
    const input = frame({ committed: true, scrollY: 40, playStartScrollY: 0 });
    expect(decideScrollFrame(input)).toEqual([{ type: "stop" }]);
  });

  it("dismisses on upward scroll too — the threshold is a distance, not a direction", () => {
    const input = frame({ committed: true, scrollY: 100, playStartScrollY: 200 });
    expect(decideScrollFrame(input)).toEqual([{ type: "stop" }]);
  });

  it("never dismisses an uncommitted glimpse, however far the page scrolls", () => {
    const input = frame({ committed: false, scrollY: 5000, playStartScrollY: 0 });
    expect(decideScrollFrame(input)).toEqual([]);
  });
});

describe("previewScrollPolicy — touch anchored follow (ADR 0004)", () => {
  it("a tracked glimpse follows its source card", () => {
    const input = frame({ coarsePointer: true, sourceRect: { top: 400, bottom: 440 } });
    expect(decideScrollFrame(input)).toEqual([{ type: "follow" }]);
  });

  it("committed playback keeps following while the card is even partly visible", () => {
    const input = frame({
      coarsePointer: true,
      committed: true,
      sourceRect: { top: -30, bottom: 10 },
    });
    expect(decideScrollFrame(input)).toEqual([{ type: "follow" }]);
  });

  it("follows then stops once the card is fully above the viewport", () => {
    const input = frame({
      coarsePointer: true,
      committed: true,
      sourceRect: { top: -280, bottom: -200 },
    });
    expect(decideScrollFrame(input)).toEqual([{ type: "follow" }, { type: "stop" }]);
  });

  it("follows then stops once the card is fully below the viewport", () => {
    const input = frame({
      coarsePointer: true,
      committed: true,
      viewportHeight: 768,
      sourceRect: { top: 768, bottom: 848 },
    });
    expect(decideScrollFrame(input)).toEqual([{ type: "follow" }, { type: "stop" }]);
  });

  it("a card grazing the top edge (bottom exactly 0) counts as gone", () => {
    const input = frame({
      coarsePointer: true,
      committed: true,
      sourceRect: { top: -80, bottom: 0 },
    });
    expect(decideScrollFrame(input)).toEqual([{ type: "follow" }, { type: "stop" }]);
  });

  it("an uncommitted glimpse trails its card off-screen without ever stopping", () => {
    const input = frame({
      coarsePointer: true,
      committed: false,
      sourceRect: { top: -280, bottom: -200 },
    });
    expect(decideScrollFrame(input)).toEqual([{ type: "follow" }]);
  });

  it("touch never uses the desktop scroll threshold", () => {
    const input = frame({
      coarsePointer: true,
      committed: true,
      sourceRect: { top: 300, bottom: 380 },
      scrollY: 5000,
      playStartScrollY: 0,
    });
    expect(decideScrollFrame(input)).toEqual([{ type: "follow" }]);
  });

  it("does nothing on touch when no source rect is tracked", () => {
    const input = frame({ coarsePointer: true, committed: true, sourceRect: null });
    expect(decideScrollFrame(input)).toEqual([]);
  });
});
