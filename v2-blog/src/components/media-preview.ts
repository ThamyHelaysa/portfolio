import { LitElement, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { MediaKind, MediaType, PreviewPlacement, SharedMediaPreview } from "../_helpers/sharedPreview.ts";

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

  private _io: IntersectionObserver | null = null;

  connectedCallback(): void {
    super.connectedCallback();

    this._isTouch = !!window.matchMedia?.('(hover: none)').matches;

    // Touch has no hover: reveal glimpses as cards scroll into view, one at a
    // time through the shared bubble. Desktop keeps hover as the reveal trigger.
    if (this._isTouch && typeof IntersectionObserver !== 'undefined') {
      this._io = new IntersectionObserver(
        (entries) => this._onIntersect(entries),
        {
          // Reveal zone is the central *half* of the viewport (a 50%-tall band,
          // trimmed 25% off top and bottom). A card reveals once it fills at
          // least half of that band — dense thresholds so the crossing is caught.
          rootMargin: '-25% 0px -25% 0px',
          threshold: Array.from({ length: 21 }, (_, i) => i / 20),
        },
      );
      this._io.observe(this);
    }
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this._io?.disconnect();
    this._io = null;

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

  // --- Touch: scroll-into-view reveal ---

  private _onIntersect(entries: IntersectionObserverEntry[]) {
    const entry = entries[0];
    if (!entry || !this.previewSrc) return;

    const preview = SharedMediaPreview.getInstance();

    // How much of THIS card sits inside the central-half band. Cards are short
    // text blocks, so measure the card's own coverage, not the band's — a card
    // reveals once at least half of it has entered the reveal zone.
    const covered = entry.intersectionRatio;

    if (entry.isIntersecting && covered >= 0.5) {
      const rect = this.getBoundingClientRect();
      preview.show({
        src: this.previewSrc,
        type: this.previewType,
        kind: this.mediaKind ?? undefined,
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
        placement: this.previewPosition === 'cursor' ? 'right' : this.previewPosition,
        triggerRect: rect,
        immediate: true,
      });
    } else if (!this._playing) {
      // Scrolled below the reveal threshold — drop this card's glimpse, but only
      // if it still owns the shared bubble (a sibling may already have claimed it).
      preview.hideIfCurrent(this.previewSrc);
    }
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
