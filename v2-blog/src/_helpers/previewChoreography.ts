/**
 * Pure show/hide choreography for the media-preview bubble (ADR 0006).
 *
 * Extracted from the `SharedMediaPreview` singleton so the interaction
 * *policy* — Hover intent, Warm state, the album shape-swap defer, and
 * generation superseding (see CONTEXT.md) — is testable without a DOM, a
 * real `window`, real timers, or `matchMedia`. This module is a leaf: it
 * never touches any of those. The singleton owns the real `setInterval`/
 * `setTimeout` handles and the `PreviewContainer` promise, forwards their
 * completions in as events, and executes the commands returned back.
 */

export type MediaType = 'image' | 'video' | 'audio';
export type MediaKind = 'album' | 'book' | 'game' | 'project';

/** What the bubble is currently (or about to be) showing. */
export interface PreviewTarget {
  src: string;
  type: MediaType;
  kind?: MediaKind;
  cover?: string;
}

export type ChoreographyState =
  | 'hidden'
  | 'pending-intent'
  | 'visible'
  | 'lingering'
  | 'collapsing'
  | 'deferring';

export interface RevealEvent {
  target: PreviewTarget;
  /** Cursor at reveal time — the intent sampler's baseline. */
  cursor: { x: number; y: number };
  /** Skips the intent sampler (keyboard focus, touch scroll-in). */
  immediate?: boolean;
  /** Skips the shape-swap defer — the swap happens in place instead. */
  reducedMotion?: boolean;
}

/** Commands the singleton must execute; the machine never performs them itself. */
export type ChoreographyCommand =
  | { type: 'show'; target: PreviewTarget }
  | { type: 'startIntentSampler'; cursor: { x: number; y: number } }
  | { type: 'stopIntentSampler' }
  | { type: 'startLinger' }
  | { type: 'cancelLinger' }
  | { type: 'stopPlayback' }
  | { type: 'startCollapse'; gen: number }
  | { type: 'teardown' }
  | { type: 'revealDeferred'; target: PreviewTarget; opts: { immediate: boolean; reducedMotion: boolean } };

/**
 * Hover intent (see CONTEXT.md): the preview only appears once the cursor
 * *settles* over a trigger — a fast sweep across the page never flashes it.
 * Intent is judged from velocity: every tick the cursor's travel since the
 * previous tick is compared against a threshold.
 */
export const INTENT_TICK_MS = 100;
export const INTENT_MAX_TRAVEL_PX = 7;

/**
 * Warm state (see CONTEXT.md): once intent is proven the bubble survives a
 * short linger after leave, so crossing the gap to a sibling trigger swaps
 * the preview instead of collapsing and re-proving intent.
 */
export const LINGER_MS = 100;

/**
 * Decides the media-preview bubble's show/hide choreography. Fed real events
 * by the singleton (reveal/commit/hide/stop, cursor ticks, timer/transition
 * completions); returns commands for the singleton to execute. Holds no DOM
 * reference, timer handle, or `window` access of its own.
 */
export class PreviewChoreography {
  private _state: ChoreographyState = 'hidden';
  private _target: PreviewTarget | null = null;
  private _committed = false;
  private _lastSample: { x: number; y: number } | null = null;
  private _gen = 0;
  private _deferredReveal: {
    target: PreviewTarget;
    opts: { immediate: boolean; reducedMotion: boolean };
  } | null = null;

  get state(): ChoreographyState {
    return this._state;
  }

  get target(): PreviewTarget | null {
    return this._target;
  }

  /** True while the current target is committed playback, not just a glimpse. */
  get isCommitted(): boolean {
    return this._committed;
  }

  /**
   * A trigger asks to be shown. Reveal ≠ play (ADR 0004) — this never marks
   * the target committed. While warm (visible/lingering) a sibling swaps in
   * at once; crossing the album↔round boundary defers behind a full collapse
   * instead (skipped under reduced motion). The card already owning a
   * committed bubble re-revealing itself is a no-op.
   */
  reveal(event: RevealEvent): ChoreographyCommand[] {
    const { target, cursor, immediate = false, reducedMotion = false } = event;

    if (this._committed && this._target?.src === target.src) return [];

    this._gen++;
    const commands: ChoreographyCommand[] = [];

    if (this._state === 'pending-intent') commands.push({ type: 'stopIntentSampler' });
    if (this._state === 'lingering') commands.push({ type: 'cancelLinger' });

    const wasVisible = this._state === 'visible' || this._state === 'lingering';
    const shapeSwap = wasVisible && (this._target?.kind === 'album') !== (target.kind === 'album');

    if (this._committed) {
      commands.push({ type: 'stopPlayback' });
      this._committed = false;
    }

    if (wasVisible && shapeSwap && !reducedMotion) {
      const gen = this._gen;
      this._deferredReveal = { target, opts: { immediate: true, reducedMotion } };
      this._state = 'deferring';
      commands.push({ type: 'startCollapse', gen });
      return commands;
    }

    this._deferredReveal = null;
    this._target = target;

    if (wasVisible || immediate) {
      this._state = 'visible';
      commands.push({ type: 'show', target });
      return commands;
    }

    this._state = 'pending-intent';
    this._lastSample = cursor;
    commands.push({ type: 'startIntentSampler', cursor });
    return commands;
  }

  /** One intent-sampler tick, forwarded with the live cursor. */
  intentTick(cursor: { x: number; y: number }): ChoreographyCommand[] {
    if (this._state !== 'pending-intent' || !this._target) return [];

    const last = this._lastSample ?? cursor;
    const travelled = Math.hypot(cursor.x - last.x, cursor.y - last.y);

    if (travelled < INTENT_MAX_TRAVEL_PX) {
      this._state = 'visible';
      return [{ type: 'stopIntentSampler' }, { type: 'show', target: this._target }];
    }

    this._lastSample = cursor;
    return [];
  }

  /**
   * Commits to (or ends) playback for a target. The target already committed
   * re-committing toggles off (delegates to {@link stop}); otherwise stops
   * whatever was committed and shows the new target committed. No shape-swap
   * defer here — commit never retracts in place.
   */
  commit(target: PreviewTarget): ChoreographyCommand[] {
    this._gen++;

    if (this._committed && this._target?.src === target.src) {
      return this.stop();
    }

    const commands: ChoreographyCommand[] = [];
    if (this._state === 'pending-intent') commands.push({ type: 'stopIntentSampler' });
    if (this._state === 'lingering') commands.push({ type: 'cancelLinger' });
    if (this._committed) commands.push({ type: 'stopPlayback' });

    this._deferredReveal = null;
    this._target = target;
    this._committed = true;
    this._state = 'visible';
    commands.push({ type: 'show', target });
    return commands;
  }

  /**
   * Requests a hide. Committed playback collapses at once; an uncommitted
   * glimpse lingers first (Warm state) so a sibling can swap in without
   * re-proving intent; a not-yet-shown or already-collapsing bubble just
   * drops.
   */
  hide(): ChoreographyCommand[] {
    const commands: ChoreographyCommand[] = [];
    if (this._state === 'pending-intent') commands.push({ type: 'stopIntentSampler' });

    if (this._committed) {
      commands.push({ type: 'stopPlayback' });
      this._committed = false;
      return [...commands, ...this._collapseNow()];
    }

    if (this._state === 'visible') {
      this._state = 'lingering';
      commands.push({ type: 'startLinger' });
      return commands;
    }

    if (this._state === 'lingering') return commands;

    return [...commands, ...this._collapseNow()];
  }

  /** Explicit stop: always collapses at once, never lingers. */
  stop(): ChoreographyCommand[] {
    const commands: ChoreographyCommand[] = [];
    if (this._state === 'pending-intent') commands.push({ type: 'stopIntentSampler' });
    if (this._state === 'lingering') commands.push({ type: 'cancelLinger' });
    commands.push({ type: 'stopPlayback' });
    this._committed = false;
    return [...commands, ...this._collapseNow()];
  }

  /** The Warm-state linger timer ran out without a sibling rescuing it. */
  lingerElapsed(): ChoreographyCommand[] {
    if (this._state !== 'lingering') return [];
    return this._collapseNow();
  }

  /**
   * The real collapse (Container's `hide()` promise) finished. A stale
   * completion from a superseded collapse (generation moved on since) yields
   * nothing. Otherwise tears down, and — if this collapse was the shape-swap
   * defer — reveals the deferred target.
   */
  collapseFinished(gen: number): ChoreographyCommand[] {
    if (gen !== this._gen) return [];

    const deferred = this._deferredReveal;
    this._deferredReveal = null;
    this._target = null;
    this._committed = false;
    this._state = 'hidden';

    if (deferred) {
      return [{ type: 'teardown' }, { type: 'revealDeferred', target: deferred.target, opts: deferred.opts }];
    }
    return [{ type: 'teardown' }];
  }

  private _collapseNow(): ChoreographyCommand[] {
    this._gen++;
    const gen = this._gen;
    this._deferredReveal = null;
    this._state = 'collapsing';
    return [{ type: 'startCollapse', gen }];
  }
}
