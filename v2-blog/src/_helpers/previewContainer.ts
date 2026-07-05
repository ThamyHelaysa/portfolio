/**
 * Conservative fallback when the computed transition duration can't be
 * parsed at all (missing/garbled style) — big enough to never race a real
 * transition, small enough to never feel stuck.
 */
const FALLBACK_MS = 300;
/** Slack added on top of the parsed (or fallback) duration. */
const SLACK_MS = 50;

/** Parses a CSS `<time>` list (`"150ms"`, `"0.15s, 0.15s"`) into the max, in ms. */
function parseCssTimeMs(value: string): number | null {
  let max: number | null = null;

  for (const part of value.split(',')) {
    const match = /^\s*(-?[\d.]+)(m?s)\s*$/.exec(part);
    if (!match) continue;

    const amount = Number.parseFloat(match[1]);
    if (Number.isNaN(amount)) continue;

    const ms = match[2] === 'ms' ? amount : amount * 1000;
    if (max === null || ms > max) max = ms;
  }

  return max;
}

/**
 * Owns the preview Container's `is-visible` class (ADR 0006's show/hide).
 * `show()` is a synchronous, idempotent CSS-transition trigger; `hide()`
 * returns a promise that settles once the collapse has actually finished —
 * resolved by `transitionend`, with a computed-style fallback timer so a
 * missed event (reduced motion, display change, tab hidden) can never wedge
 * a caller awaiting it.
 */
export class PreviewContainer {
  private _el: HTMLElement;
  /** Settles (and cleans up) the in-flight hide(), if any. */
  private _pendingCleanup: (() => void) | null = null;

  constructor(el: HTMLElement) {
    this._el = el;
  }

  get isVisible(): boolean {
    return this._el.classList.contains('is-visible');
  }

  /** Adding the class while already visible is a no-op warm swap. */
  show(): void {
    this._settlePending();
    this._el.classList.add('is-visible');
  }

  /** Removes `is-visible`; resolves once the collapse transition finishes. */
  hide(): Promise<void> {
    if (!this.isVisible) return Promise.resolve();

    this._settlePending();
    this._el.classList.remove('is-visible');

    return new Promise((resolve) => {
      const onTransitionEnd = (event: Event) => {
        if ((event as TransitionEvent).propertyName !== 'opacity') return;
        cleanup();
      };
      const cleanup = () => {
        this._el.removeEventListener('transitionend', onTransitionEnd);
        clearTimeout(fallback);
        this._pendingCleanup = null;
        resolve();
      };

      this._el.addEventListener('transitionend', onTransitionEnd);
      const fallback = setTimeout(cleanup, this._fallbackDelayMs());
      this._pendingCleanup = cleanup;
    });
  }

  /**
   * Settles any hide() still in flight (its promise resolves; supersede is
   * fine — callers re-check their own generation guard) and tears down its
   * listener/timer.
   */
  private _settlePending(): void {
    this._pendingCleanup?.();
  }

  private _fallbackDelayMs(): number {
    const style = getComputedStyle(this._el);
    const duration = parseCssTimeMs(style.transitionDuration);
    if (duration === null) return FALLBACK_MS + SLACK_MS;

    const delay = parseCssTimeMs(style.transitionDelay) ?? 0;
    return duration + delay + SLACK_MS;
  }
}
