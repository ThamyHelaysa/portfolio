/**
 * Pure positioning geometry for the media-preview bubble (ADR 0004).
 *
 * Extracted from the `SharedMediaPreview` singleton so the subtlest logic — the
 * 4-way anchor switch and the horizontal-clamp / vertical-unclamp trailing rule
 * — is testable without a DOM, a real `window`, or a full playback scenario.
 * This module is a leaf: it never touches `window`, the singleton, or the DOM.
 * Callers pass the viewport in and write the returned `{x, y}` to CSS vars.
 */

/**
 * Offset in pixels between the bubble and its anchor (cursor or trigger rect).
 * Keeps the cursor visible and the bubble off the viewport edges.
 */
export const PREVIEW_OFFSET = 12;

export type PreviewPlacement = 'cursor' | 'top' | 'bottom' | 'left' | 'right';

export interface PreviewSize {
  w: number;
  h: number;
}

export interface Viewport {
  width: number;
  height: number;
}

export interface PositionInput {
  placement: PreviewPlacement;
  /** Trigger rect to anchor beside. Null → cursor-center (cursor placement) or
   *  viewport-center (anchored placement). */
  triggerRect: DOMRect | null;
  cursor: { x: number; y: number };
  size: PreviewSize;
  viewport: Viewport;
  /** Skip the vertical clamp so the bubble can trail its source off-screen. */
  unclampY?: boolean;
}

/**
 * Computes the top-left `{x, y}` for the preview bubble.
 *
 * Contract, disambiguated by `placement`:
 * - `placement: 'cursor'` → centered on the cursor (clamped to the viewport).
 * - anchored placement (`top`/`bottom`/`left`/`right`) **with** a rect → offset
 *   beside that rect, clamped.
 * - anchored placement **without** a rect → centered in the viewport, *unclamped*
 *   (the play-commit fallback when no trigger rect was captured).
 *
 * Horizontal is always clamped so a right-anchored bubble never flies off a
 * full-width mobile card; vertical is clamped unless `unclampY`, which lets the
 * bubble trail its source card off-screen 1:1 during touch scroll-follow.
 */
export function computePreviewPosition({
  placement,
  triggerRect,
  cursor,
  size,
  viewport,
  unclampY = false,
}: PositionInput): { x: number; y: number } {
  const { w, h } = size;
  const { width: vw, height: vh } = viewport;

  // Anchored placement but no rect: center in the viewport, unclamped — matches
  // the singleton's old `_positionAnchored` fallback exactly.
  if (!triggerRect && placement !== 'cursor') {
    return { x: (vw - w) / 2, y: (vh - h) / 2 };
  }

  let x = 0;
  let y = 0;

  if (placement === 'cursor' || !triggerRect) {
    // Center the bubble on the cursor.
    x = cursor.x - w / 2;
    y = cursor.y - h / 2;
  } else {
    const rect = triggerRect;
    switch (placement) {
      case 'right':
        x = rect.right + PREVIEW_OFFSET;
        y = rect.top + (rect.height - h) / 2;
        break;
      case 'left':
        x = rect.left - w - PREVIEW_OFFSET;
        y = rect.top + (rect.height - h) / 2;
        break;
      case 'top':
        x = rect.left + (rect.width - w) / 2;
        y = rect.top - h - PREVIEW_OFFSET;
        break;
      case 'bottom':
        x = rect.left + (rect.width - w) / 2;
        y = rect.bottom + PREVIEW_OFFSET;
        break;
    }
  }

  // Clamp so it doesn't overflow the viewport too badly. Horizontal always;
  // vertical unless the caller is trailing the bubble off-screen.
  const maxX = vw - w - PREVIEW_OFFSET;
  const maxY = vh - h - PREVIEW_OFFSET;

  x = Math.max(PREVIEW_OFFSET, Math.min(x, maxX));
  if (!unclampY) {
    y = Math.max(PREVIEW_OFFSET, Math.min(y, maxY));
  }

  return { x, y };
}
