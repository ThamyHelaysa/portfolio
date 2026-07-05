import { describe, expect, it } from "vitest";
import {
  PREVIEW_OFFSET,
  computePreviewPosition,
  type PositionInput,
} from "../../../src/_helpers/previewGeometry.ts";

/** A large viewport so nothing clamps unless the test wants it to. */
const VIEWPORT = { width: 1000, height: 800 };
const SIZE = { w: 100, h: 100 };

function pos(overrides: Partial<PositionInput> = {}) {
  return computePreviewPosition({
    placement: "cursor",
    triggerRect: null,
    cursor: { x: 0, y: 0 },
    size: SIZE,
    viewport: VIEWPORT,
    ...overrides,
  });
}

/** Minimal DOMRect-shaped stub — the geometry only reads the box fields. */
function rect(left: number, top: number, width: number, height: number): DOMRect {
  return {
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
    x: left,
    y: top,
    toJSON: () => ({}),
  } as DOMRect;
}

describe("computePreviewPosition", () => {
  it("centers on the cursor for cursor placement", () => {
    expect(pos({ placement: "cursor", cursor: { x: 400, y: 300 } })).toEqual({
      x: 400 - SIZE.w / 2,
      y: 300 - SIZE.h / 2,
    });
  });

  it("anchors to the right of the trigger rect, vertically centered", () => {
    const r = rect(200, 300, 60, 40);
    expect(pos({ placement: "right", triggerRect: r })).toEqual({
      x: r.right + PREVIEW_OFFSET,
      y: r.top + (r.height - SIZE.h) / 2,
    });
  });

  it("anchors to the left of the trigger rect", () => {
    const r = rect(400, 300, 60, 40);
    expect(pos({ placement: "left", triggerRect: r })).toEqual({
      x: r.left - SIZE.w - PREVIEW_OFFSET,
      y: r.top + (r.height - SIZE.h) / 2,
    });
  });

  it("anchors above the trigger rect, horizontally centered", () => {
    const r = rect(400, 300, 60, 40);
    expect(pos({ placement: "top", triggerRect: r })).toEqual({
      x: r.left + (r.width - SIZE.w) / 2,
      y: r.top - SIZE.h - PREVIEW_OFFSET,
    });
  });

  it("anchors below the trigger rect", () => {
    const r = rect(400, 300, 60, 40);
    expect(pos({ placement: "bottom", triggerRect: r })).toEqual({
      x: r.left + (r.width - SIZE.w) / 2,
      y: r.bottom + PREVIEW_OFFSET,
    });
  });

  it("clamps horizontally at the right edge", () => {
    // Right-anchor a rect flush against the viewport's right side.
    const r = rect(980, 300, 20, 40);
    const { x } = pos({ placement: "right", triggerRect: r });
    expect(x).toBe(VIEWPORT.width - SIZE.w - PREVIEW_OFFSET);
  });

  it("clamps horizontally at the left edge", () => {
    const { x } = pos({ placement: "cursor", cursor: { x: -50, y: 300 } });
    expect(x).toBe(PREVIEW_OFFSET);
  });

  it("clamps vertically by default", () => {
    const { y } = pos({ placement: "cursor", cursor: { x: 400, y: 5000 } });
    expect(y).toBe(VIEWPORT.height - SIZE.h - PREVIEW_OFFSET);
  });

  it("does NOT clamp vertically when unclampY is set (trailing off-screen)", () => {
    // A rect scrolled far below the viewport should trail off, not pin to the edge.
    const r = rect(400, 5000, 60, 40);
    const { y } = pos({ placement: "right", triggerRect: r, unclampY: true });
    expect(y).toBe(r.top + (r.height - SIZE.h) / 2); // 5000 - 30 = 4970, un-clamped
    expect(y).toBeGreaterThan(VIEWPORT.height);
  });

  it("centers in the viewport for an anchored placement with no rect (commit fallback)", () => {
    // Unclamped, ignores the cursor — matches the old _positionAnchored fallback.
    expect(pos({ placement: "right", triggerRect: null, cursor: { x: 999, y: 999 } })).toEqual({
      x: (VIEWPORT.width - SIZE.w) / 2,
      y: (VIEWPORT.height - SIZE.h) / 2,
    });
  });

  it("centers on the cursor for cursor placement with no rect", () => {
    expect(pos({ placement: "cursor", triggerRect: null, cursor: { x: 300, y: 200 } })).toEqual({
      x: 300 - SIZE.w / 2,
      y: 200 - SIZE.h / 2,
    });
  });
});
