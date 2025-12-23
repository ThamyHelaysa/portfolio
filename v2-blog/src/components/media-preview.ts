// import { SharedMediaPreview } from "../_helpers/sharedPreview.ts";

// /**
//  * A Custom Element that triggers a floating media preview (image or video)
//  * when the user hovers over the slotted content.
//  * * It relies on a `SharedMediaPreview` singleton to render the actual popup,
//  * allowing multiple triggers to share a single DOM element for the preview.
//  *
//  * @element media-preview
//  * @attr {string} preview-src - The source URL for the media to be previewed.
//  * @attr {string} preview-type - The type of media ('image' or 'video'). Defaults to 'image'.
//  * @slot The content that triggers the preview on hover.
//  * @example
//  * <media-preview preview-src="/img/demo.jpg" preview-type="image">
//  *    <a href="#">Hover me</a>
//  * </media-preview>
//  */
// class MediaPreview extends HTMLElement {

//   /**
//    * Initializes the web component, attaches Shadow DOM, and prepares event handlers.
//    */
//   constructor() {
//     super();
//     this.attachShadow({ mode: 'open' });

//     const template = document.createElement('template');
//     template.innerHTML = `
//       <style>
//         :host {
//           cursor: none;
//         }
//         .wrapper:hover ::slotted(*) {
//           cursor: none;
//         }
//       </style>

//       <div class="wrapper">
//         <slot></slot>
//       </div>
//     `;

//     this.shadowRoot.appendChild(template.content.cloneNode(true));

//     /** @type {HTMLElement} Reference to the internal wrapper element */
//     this._wrapper = this.shadowRoot.querySelector('.wrapper');

//     // Bind methods to ensure 'this' refers to the class instance
//     this._handleMouseEnter = this._handleMouseEnter.bind(this);
//     this._handleMouseLeave = this._handleMouseLeave.bind(this);
//     this._handleMouseMove = this._handleMouseMove.bind(this);
//   }

//   /**
//    * Lifecycle callback invoked when the element is added to the document.
//    * Sets up mouse event listeners.
//    */
//   connectedCallback() {
//     this._wrapper.addEventListener('mouseenter', this._handleMouseEnter);
//     this._wrapper.addEventListener('mouseleave', this._handleMouseLeave);
//     this._wrapper.addEventListener('mousemove', this._handleMouseMove);
//   }

//   /**
//    * Lifecycle callback invoked when the element is removed from the document.
//    * Cleans up event listeners to prevent memory leaks.
//    */
//   disconnectedCallback() {
//     this._wrapper.removeEventListener('mouseenter', this._handleMouseEnter);
//     this._wrapper.removeEventListener('mouseleave', this._handleMouseLeave);
//     this._wrapper.removeEventListener('mousemove', this._handleMouseMove);
//   }

//   /**
//    * Gets the position type for preview
//    * @readonly
//    * @returns {string} The value of the 'preview-position' attribute, or 'cursor' if not set.
//    */
//   get previewPosition() {
//     return this.getAttribute('preview-position') || 'cursor';
//   }

//   /**
//    * Gets the source URL for the preview.
//    * @readonly
//    * @returns {string|null} The value of the 'preview-src' attribute.
//    */
//   get previewSrc() {
//     return this.getAttribute('preview-src');
//   }

//   /**
//    * Gets the media type for the preview.
//    * @readonly
//    * @returns {string} The value of the 'preview-type' attribute (lowercased), or 'image' if not set.
//    */
//   get previewType() {
//     return (this.getAttribute('preview-type') || 'image').toLowerCase();
//   }

//   /**
//    * Handles the mouse enter event.
//    * Signals the shared preview instance to show content at the current cursor position.
//    * * @param {MouseEvent} e - The mouse event object.
//    * @private
//    */
//   _handleMouseEnter(e) {
//     const preview = SharedMediaPreview.getInstance();
//     const rect = this.getBoundingClientRect(); // the card area

//     preview.show({
//       src: this.previewSrc,
//       type: this.previewType,
//       x: e.clientX,
//       y: e.clientY,
//       placement: this.previewPosition,
//       triggerRect: rect,
//     });
//   }

//   /**
//    * Handles the mouse move event.
//    * Signals the shared preview instance to update its position.
//    * * @param {MouseEvent} e - The mouse event object.
//    * @private
//    */
//   _handleMouseMove = (e) => {
//     const preview = SharedMediaPreview.getInstance();
//     const rect = this.getBoundingClientRect();

//     preview.move({
//       x: e.clientX,
//       y: e.clientY,
//       placement: this.previewPosition,
//       triggerRect: rect,
//     });
//   };


//   /**
//    * Handles the mouse leave event.
//    * Signals the shared preview instance to hide.
//    * * @private
//    */
//   _handleMouseLeave() {
//     const preview = SharedMediaPreview.getInstance();
//     preview.hide();
//   }
// }

// customElements.define('media-preview', MediaPreview);

import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { MediaType, PreviewPlacement, SharedMediaPreview } from "../_helpers/sharedPreview.ts";

@customElement('media-preview')
export class MediaPreview extends LitElement {
  // --- Properties ---

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

  // --- Styles ---

  static styles = css`
    :host {
      /* * Best Practice: Custom elements default to 'display: inline'.
       * 'inline-block' ensures getBoundingClientRect works predictably 
       * and the component respects dimensions.
       */
      display: inline-block;
      cursor: none;
    }
    
    /* * We don't need an extra div.wrapper for styling if we style the host,
     * but we keep the wrapper structure to match your original DOM logic strictly.
     */
    .wrapper {
      display: contents;
    }

    /* Force cursor: none on slotted children when hovering */
    .wrapper:hover ::slotted(*) {
      cursor: none;
    }
  `;

  // --- Event Handlers ---

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
    // We recalculate rect here in case the element is animating/moving while hovered
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