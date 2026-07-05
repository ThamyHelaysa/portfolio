/**
 * Owns the window scroll/resize listener lifecycle for the media-preview bubble
 * (ADR 0004). It attaches once (idempotent), rAF-throttles scroll into a single
 * `onScrollFrame` per frame, forwards resize to `onResize`, and detaches +
 * cancels the pending frame symmetrically on `stop()`.
 *
 * It holds **no policy**: the caller decides what each frame does (touch
 * reposition / off-screen stop / desktop dismiss). This is the mechanical part
 * — the bug-prone attach/cancel/cleanup — pulled out so it can be verified in
 * isolation with a fake `window` and synthetic scroll events.
 */
export interface ScrollAnchorHooks {
  /** Called at most once per animation frame while scrolling. */
  onScrollFrame(): void;
  /** Called on every resize (not throttled — resize fires far less often). */
  onResize(): void;
}

export class ScrollAnchor {
  private _on = false;
  private _raf: number | null = null;

  private _onScroll = (): void => {
    if (this._raf !== null) return;
    this._raf = requestAnimationFrame(() => {
      this._raf = null;
      this._hooks.onScrollFrame();
    });
  };

  private _onResize = (): void => this._hooks.onResize();

  constructor(private _hooks: ScrollAnchorHooks) {}

  /** Attaches the window listeners. Idempotent — a second call is a no-op. */
  start(): void {
    if (this._on || typeof window === 'undefined') return;
    window.addEventListener('scroll', this._onScroll, { passive: true });
    window.addEventListener('resize', this._onResize, { passive: true });
    this._on = true;
  }

  /** Detaches the listeners and cancels any pending animation frame. */
  stop(): void {
    if (this._on && typeof window !== 'undefined') {
      window.removeEventListener('scroll', this._onScroll);
      window.removeEventListener('resize', this._onResize);
    }
    this._on = false;
    if (this._raf !== null) {
      cancelAnimationFrame(this._raf);
      this._raf = null;
    }
  }
}
