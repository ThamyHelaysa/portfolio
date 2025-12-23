import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { MediaType, PreviewPlacement, SharedMediaPreview } from "../_helpers/sharedPreview.ts";

/**
 * A Custom Element that triggers a floating media preview (image or video)
 * when the user hovers over the slotted content.
 * * It relies on a `SharedMediaPreview` singleton to render the actual popup,
 * allowing multiple triggers to share a single DOM element for the preview.
 *
 * @element media-preview
 * @attr {string} preview-src - The source URL for the media to be previewed.
 * @attr {string} preview-type - The type of media ('image' or 'video'). Defaults to 'image'.
 * @slot The content that triggers the preview on hover.
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
   * The type of media ('image' or 'video'). Defaults to 'image'.
   */
  @property({ attribute: 'preview-type' })
  previewType: MediaType = 'image';

  /**
   * The positioning strategy. Defaults to 'cursor'.
   */
  @property({ attribute: 'preview-position' })
  previewPosition: PreviewPlacement = 'cursor';

  private _handleMouseEnter(e: MouseEvent) {
    const preview = SharedMediaPreview.getInstance();
    const rect = this.getBoundingClientRect();

    if (!this.previewSrc) return;

    preview.show({
      src: this.previewSrc,
      type: this.previewType,
      x: e.clientX,
      y: e.clientY,
      placement: this.previewPosition,
      triggerRect: rect,
    });
  }

  private _handleMouseMove(e: MouseEvent) {
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
    const preview = SharedMediaPreview.getInstance();
    preview.hide();
  }

  // --- Render ---

  render() {
    return html`
      <div 
        class="wrapper"
        @mouseenter="${this._handleMouseEnter}"
        @mousemove="${this._handleMouseMove}"
        @mouseleave="${this._handleMouseLeave}"
      >
        <slot></slot>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'media-preview': MediaPreview;
  }
}