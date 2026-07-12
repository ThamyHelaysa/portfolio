/**
 * Pure scroll-frame policy for the media-preview bubble (ADR 0004).
 *
 * Extracted from the `SharedMediaPreview` singleton so the per-frame scroll
 * *decision* — touch anchored follow + stop-when-gone vs desktop
 * dismiss-on-scroll — is testable without a DOM, a real `window`, or
 * `matchMedia`. This module is a leaf: it never reads any of those. The
 * singleton gathers the frame's facts (visibility, pointer mode, live source
 * rect, scroll positions) into a {@link ScrollFrameInput}, and executes the
 * commands returned back; `scrollAnchor.ts` owns the listener/rAF mechanics
 * that decide *when* a frame happens at all.
 */

/**
 * Desktop dismiss-on-scroll (ADR 0004): once committed playback is scrolled
 * past this many pixels, it stops. A small threshold ignores trackpad jitter.
 */
export const DESKTOP_SCROLL_STOP_PX = 8;

/** The vertical extent of the tracked source card — all the policy needs. */
export interface SourceRectSlice {
  top: number;
  bottom: number;
}

/** Everything one throttled scroll frame gets to see, as plain data. */
export interface ScrollFrameInput {
  /** Whether the bubble is currently visible (Container's `is-visible`). */
  visible: boolean;
  /** Coarse pointer (touch): follow the card. Fine pointer: dismiss instead. */
  coarsePointer: boolean;
  /** True while playback is committed, not just a glimpse. */
  committed: boolean;
  /** Live rect of the tracked source card; null when nothing is tracked. */
  sourceRect: SourceRectSlice | null;
  viewportHeight: number;
  scrollY: number;
  /** Scroll position captured at desktop play time (the dismiss baseline). */
  playStartScrollY: number;
}

/** Commands the singleton must execute; the policy never performs them itself. */
export type ScrollFrameCommand =
  /** The bubble is gone — detach the scroll tracking. */
  | { type: 'stopTracking' }
  /** Reposition the bubble onto its live source rect (touch follow). */
  | { type: 'follow' }
  /** Stop committed playback and collapse (scroll-out / dismiss). */
  | { type: 'stop' };

/**
 * Decides what one throttled scroll frame does to the bubble. Touch: keep the
 * bubble glued to its source card, and stop committed playback once the card
 * has fully left the viewport (it still follows first, trailing off-screen).
 * Desktop: any real scroll past the jitter threshold dismisses committed
 * playback; glimpses are cursor-bound and never scroll-dismissed.
 */
export function decideScrollFrame(input: ScrollFrameInput): ScrollFrameCommand[] {
  if (!input.visible) return [{ type: 'stopTracking' }];

  if (input.coarsePointer) {
    const rect = input.sourceRect;
    if (!rect) return [];

    const commands: ScrollFrameCommand[] = [{ type: 'follow' }];
    const fullyGone = rect.bottom <= 0 || rect.top >= input.viewportHeight;
    if (input.committed && fullyGone) commands.push({ type: 'stop' });
    return commands;
  }

  const travelled = Math.abs(input.scrollY - input.playStartScrollY);
  if (input.committed && travelled > DESKTOP_SCROLL_STOP_PX) {
    return [{ type: 'stop' }];
  }
  return [];
}
