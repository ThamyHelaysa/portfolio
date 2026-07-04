import { LitElement, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { MediaKind, MediaType, PreviewPlacement, SharedMediaPreview } from "../_helpers/sharedPreview.ts";

/**
 * Touch scroll-reveal is coordinated across ALL <media-preview> cards by a
 * single shared observer — never one observer per card. With per-card
 * observers a fast scroll fires several callbacks in one tick and the last one
 * processed wins the single shared bubble, so a far-off card can reveal out of
 * order. Here, any crossing triggers ONE recompute over live geometry that
 * picks the card nearest the viewport centre, so the result is order- and
 * speed-independent.
 */
class TouchRevealCoordinator {
  private static _instance: TouchRevealCoordinator | null = null;
  private _observer: IntersectionObserver;
  private _cards = new Set<MediaPreview>();
  private _current: MediaPreview | null = null;

  static get(): TouchRevealCoordinator | null {
    if (typeof IntersectionObserver === 'undefined') return null;
    if (!this._instance) this._instance = new TouchRevealCoordinator();
    return this._instance;
  }

  private constructor() {
    this._observer = new IntersectionObserver(() => this._recompute(), {
      // Reveal zone is the central half of the viewport; any crossing in or out
      // of it is enough to trigger a fresh recompute.
      rootMargin: '-25% 0px -25% 0px',
      threshold: [0, 0.5, 1],
    });
  }

  add(card: MediaPreview): void {
    this._cards.add(card);
    this._observer.observe(card);
  }

  remove(card: MediaPreview): void {
    this._cards.delete(card);
    this._observer.unobserve(card);
    if (this._current === card) this._current = null;
  }

  /**
   * Picks the card whose centre is closest to the viewport centre among those
   * at least half inside the central band, and reveals it. Reads live rects, so
   * it is immune to stale entry snapshots and callback ordering.
   */
  private _recompute(): void {
    const preview = SharedMediaPreview.getInstance();
    // A committed, playing card owns the bubble — scrolling must not steal it.
    if (preview.isPlaying()) return;

    const vh = window.innerHeight;
    const mid = vh / 2;
    const bandTop = vh * 0.25;
    const bandBottom = vh * 0.75;

    let best: MediaPreview | null = null;
    let bestDist = Infinity;

    for (const card of this._cards) {
      if (!card.previewSrc) continue;
      const rect = card.getBoundingClientRect();
      if (rect.height <= 0) continue;

      const overlap = Math.max(0, Math.min(rect.bottom, bandBottom) - Math.max(rect.top, bandTop));
      // Card must be at least half inside the central band to qualify.
      if (overlap / rect.height < 0.5) continue;

      const dist = Math.abs(rect.top + rect.height / 2 - mid);
      if (dist < bestDist) {
        bestDist = dist;
        best = card;
      }
    }

    if (best) {
      if (best !== this._current) {
        this._current = best;
        best.revealFromScroll();
      }
    } else if (this._current) {
      this._current = null;
      preview.hide();
    }
  }
}

/**
 * A Custom Element that triggers a floating media preview when the user
 * approaches the slotted content.
 *
 * Interaction model (ADR 0004): the shared bubble is decorative — the trigger
 * card *is* the control. Approaching (hover on desktop, scroll-into-view on
 * touch) reveals a paused glimpse; an explicit commit (click / Enter / Space /
 * tap) plays the media, growing and anchoring the bubble. Images have no
 * playback — they are reveal-only.
 *
 * @element media-preview
 * @attr {string} preview-src - The source URL for the media to be previewed.
 * @attr {string} preview-type - The playback mechanism ('image' | 'video' | 'audio'). Defaults to 'image'.
 * @attr {string} media-kind - The semantic kind ('album' | 'book' | 'game' | 'project'). Drives presentation — 'album' renders as a spinning vinyl disc.
 * @slot The content that triggers the preview.
 * @example
 * <media-preview preview-src="/img/demo.jpg" preview-type="image">
 *    <a href="#">Hover me</a>
 * </media-preview>
 */
@customElement('media-preview')
export class MediaPreview extends LitElement {

  /**
   * The source URL for the media to be previewed.
   */
  @property({ attribute: 'preview-src' })
  previewSrc: string | null = null;

  /**
   * The playback mechanism ('image' | 'video' | 'audio'). Defaults to 'image'.
   */
  @property({ attribute: 'preview-type' })
  previewType: MediaType = 'image';

  /**
   * The semantic kind of the previewed thing ('album', 'book', …).
   * Drives presentation treatment; 'album' renders as a spinning vinyl disc.
   */
  @property({ attribute: 'media-kind' })
  mediaKind: MediaKind | null = null;

  /**
   * The positioning strategy. Defaults to 'cursor'.
   */
  @property({ attribute: 'preview-position' })
  previewPosition: PreviewPlacement = 'cursor';

  /** Mirrors the shared bubble's playing state for THIS trigger (aria-pressed). */
  @state()
  private _playing = false;

  /** True on touch/coarse-pointer devices — hover is unavailable there. */
  private _isTouch = false;

  /** Resets aria-pressed when the shared bubble stops OUR media out from under us. */
  private _onExternalStop = (e: Event) => {
    const src = (e as CustomEvent<{ src?: string }>).detail?.src;
    if (src === this.previewSrc && this._playing) {
      this._playing = false;
    }
  };

  connectedCallback(): void {
    super.connectedCallback();

    this._isTouch = !!window.matchMedia?.('(hover: none)').matches;
    window.addEventListener(SharedMediaPreview.STOPPED_EVENT, this._onExternalStop);

    // Touch has no hover: a single shared coordinator reveals glimpses as cards
    // scroll through the central band. Desktop keeps hover as the reveal trigger.
    if (this._isTouch) {
      TouchRevealCoordinator.get()?.add(this);
    }
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    window.removeEventListener(SharedMediaPreview.STOPPED_EVENT, this._onExternalStop);
    if (this._isTouch) {
      TouchRevealCoordinator.get()?.remove(this);
    }

    // Drop any playback this trigger owns so a removed card can't leave the
    // shared bubble stuck open.
    if (this._playing) {
      SharedMediaPreview.getInstance().stop();
      this._playing = false;
    }
  }

  private get _isPlayable(): boolean {
    return this.previewType === 'video' || this.previewType === 'audio';
  }

  // --- Desktop hover: reveal glimpse (paused) ---

  private _handleMouseEnter(e: MouseEvent) {
    if (this._isTouch || !this.previewSrc) return;

    const preview = SharedMediaPreview.getInstance();
    const rect = this.getBoundingClientRect();

    preview.show({
      src: this.previewSrc,
      type: this.previewType,
      kind: this.mediaKind ?? undefined,
      x: e.clientX,
      y: e.clientY,
      placement: this.previewPosition,
      triggerRect: rect,
    });
  }

  private _handleMouseMove(e: MouseEvent) {
    if (this._isTouch || !this.previewSrc) return;

    const preview = SharedMediaPreview.getInstance();
    const rect = this.getBoundingClientRect();

    preview.move({
      x: e.clientX,
      y: e.clientY,
      placement: this.previewPosition,
      triggerRect: rect,
    });
  }

  private _handleMouseLeave() {
    if (this._isTouch) return;
    SharedMediaPreview.getInstance().hide();
    this._playing = false;
  }

  private _handleFocusIn() {
    if (!this.previewSrc) return;

    const preview = SharedMediaPreview.getInstance();
    const rect = this.getBoundingClientRect();

    preview.show({
      src: this.previewSrc,
      type: this.previewType,
      kind: this.mediaKind ?? undefined,
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
      placement: this.previewPosition,
      triggerRect: rect,
      // Tabbing to the trigger is intent by itself — no hover-intent sampling.
      immediate: true,
    });
  }

  private _handleFocusOut(e: FocusEvent) {
    const nextTarget = e.relatedTarget;

    if (nextTarget instanceof Node && this.contains(nextTarget)) return;

    SharedMediaPreview.getInstance().hide();
    this._playing = false;
  }

  // --- Commit: play / pause ---

  /** Toggles playback for playable types; a no-op reveal for images. */
  private _commit() {
    if (!this.previewSrc || !this._isPlayable) return;

    const preview = SharedMediaPreview.getInstance();
    this._playing = preview.togglePlay({
      src: this.previewSrc,
      type: this.previewType,
      kind: this.mediaKind ?? undefined,
      triggerRect: this.getBoundingClientRect(),
      // Anchor the grown bubble beside the card rather than over its text.
      placement: this.previewPosition === 'cursor' ? 'right' : this.previewPosition,
      // Touch: lets the bubble follow this card as the page scrolls.
      getRect: () => this.getBoundingClientRect(),
    });
  }

  private _handleClick() {
    this._commit();
  }

  private _handleKeydown(e: KeyboardEvent) {
    if (!this._isPlayable) return;

    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
      // Space would otherwise scroll the page.
      e.preventDefault();
      this._commit();
      return;
    }

    if (e.key === 'Escape' && this._playing) {
      SharedMediaPreview.getInstance().stop();
      this._playing = false;
    }
  }

  // --- Touch: scroll-into-view reveal (driven by TouchRevealCoordinator) ---

  /** Reveals this card's glimpse. Called only by the shared coordinator. */
  revealFromScroll(): void {
    if (!this.previewSrc) return;

    const rect = this.getBoundingClientRect();
    SharedMediaPreview.getInstance().show({
      src: this.previewSrc,
      type: this.previewType,
      kind: this.mediaKind ?? undefined,
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
      placement: this.previewPosition === 'cursor' ? 'right' : this.previewPosition,
      triggerRect: rect,
      immediate: true,
      // Keep the glimpse glued to this card as the page scrolls.
      getRect: () => this.getBoundingClientRect(),
    });
  }

  // --- Render ---

  protected render(): unknown {
    const playable = this._isPlayable;

    return html`
      <div
        class="wrapper"
        tabindex="0"
        role=${playable ? 'button' : nothing}
        aria-pressed=${playable ? String(this._playing) : nothing}
        aria-label=${playable ? this._ariaLabel() : nothing}
        @mouseenter="${this._handleMouseEnter}"
        @mousemove="${this._handleMouseMove}"
        @mouseleave="${this._handleMouseLeave}"
        @focusin="${this._handleFocusIn}"
        @focusout="${this._handleFocusOut}"
        @click="${this._handleClick}"
        @keydown="${this._handleKeydown}"
      >
        <slot></slot>
      </div>
    `;
  }

  private _ariaLabel(): string {
    const noun = this.previewType === 'audio' ? 'audio preview' : 'video preview';
    return `${this._playing ? 'Stop' : 'Play'} ${noun}`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'media-preview': MediaPreview;
  }
}
