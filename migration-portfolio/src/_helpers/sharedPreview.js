/**
 * Offset in pixels to position the preview element relative to the cursor.
 * This ensures the cursor remains visible and prevents the preview
 * from interfering with mouse events on the underlying element.
 * @constant {number}
 */
const PREVIEW_OFFSET = 50;

/**
 * A Singleton class that manages a global media preview overlay.
 * * This class is responsible for creating a single DOM structure attached to the body
 * and reusing it to display images or videos. It handles positioning, 
 * visibility toggling, and resource management (like pausing videos when hidden).
 */
export class SharedMediaPreview {
  /** @type {SharedMediaPreview} The single instance of the class. */
  static instance;

  /**
   * Retrieves the singleton instance of SharedMediaPreview.
   * If it does not exist, it creates one.
   * @returns {SharedMediaPreview} The singleton instance.
   */
  static getInstance() {
    if (!SharedMediaPreview.instance) {
      SharedMediaPreview.instance = new SharedMediaPreview();
    }
    return SharedMediaPreview.instance;
  }

  /**
   * Initializes the shared DOM elements.
   * Creates a wrapper div containing both an `img` and `video` element,
   * configures default video settings (autoplay, mute, loop), and appends
   * the structure to the document body.
   */
  constructor() {
    
    /** @type {HTMLDivElement} The main container for the preview. */
    this._wrapper = document.createElement('div');
    this._wrapper.id = 'mediaPreview';

    /** @type {HTMLImageElement} Element used to display static images. */
    this.img = document.createElement('img');

    /** @type {HTMLVideoElement} Element used to display video content. */
    this.video = document.createElement('video');

    // Configure video for background-like behavior (no sound, auto loop)
    this.video.autoplay = true;
    this.video.muted = true;
    this.video.loop = true;
    this.video.playsInline = true;

    this._wrapper.appendChild(this.img);
    this._wrapper.appendChild(this.video);

    document.body.appendChild(this._wrapper);

    /** @type {string|null} Tracks the currently loaded source to avoid redundant reloading. */
    this._currentSrc = null;
    /** @type {string|null} Tracks the current media type ('image' or 'video'). */
    this._currentType = null;
  }

  /**
   * Infers the media type based on the file extension of the source URL.
   * @param {string} src - The source URL to analyze.
   * @returns {'image'|'video'|undefined} The inferred type, or undefined if unknown.
   */
  inferType(src) {
    if (!src || typeof src !== 'string') return undefined;

    const lower = src.toLowerCase();

    if (/\.(png|jpe?g|gif|webp|avif|svg)$/.test(lower)) {
      return 'image';
    }
    if (/\.(mp4|webm|ogg)$/.test(lower)) {
      return 'video';
    }

    return undefined;
  }

  /**
   * Displays the preview at specific coordinates.
   * Determines whether to show video or image based on explicit type or inference.
   * @param {Object} options - Configuration object.
   * @param {string} options.src - The media source URL.
   * @param {string} [options.type] - Explicit type ('image' or 'video'). If omitted, it is inferred from src.
   * @param {number} options.x - The X coordinate (usually clientX).
   * @param {number} options.y - The Y coordinate (usually clientY).
   */
  show({ src, type, x, y }) {
    if (!src) return;

    // Determine type: use provided type or try to guess from file extension
    const effectiveType = type || this.inferType(src);
    if (!effectiveType) {
      // If we can't determine the type, do not show anything
      return;
    }

    this._setPosition(x, y);

    // Toggle specific element visibility
    if (effectiveType === 'video') {
      this._showVideo(src);
    } else {
      this._showImage(src);
    }

    this._currentSrc = src;
    this._currentType = effectiveType;
    this._wrapper.classList.add('is-visible');
  }

  /**
   * Updates the position of the preview element.
   * Usually called during mousemove events.
   * @param {number} x - The new X coordinate.
   * @param {number} y - The new Y coordinate.
   */
  move(x, y) {
    this._setPosition(x, y);
  }

  /**
   * Hides the preview and pauses any active media.
   * Cleans up internal state.
   */
  hide() {
    this._wrapper.classList.remove('is-visible');

    // Pause video to save resources when not visible
    if (!this.video.paused) {
      this.video.pause();
    }

    this._currentSrc = null;
    this._currentType = null;
  }

  /**
   * Calculates and applies CSS variables for positioning.
   * Applies an offset to center the preview relative to the cursor.
   * @param {number} x - Raw X coordinate.
   * @param {number} y - Raw Y coordinate.
   * @private
   */
  _setPosition(x, y) {
    const eixoX = x - PREVIEW_OFFSET;
    const eixoY = y - PREVIEW_OFFSET;

    this._wrapper.style.setProperty('--preview-x', `${eixoX}px`);
    this._wrapper.style.setProperty('--preview-y', `${eixoY}px`);
  }

  /**
   * Internal helper to activate the image element and deactivate the video.
   * @param {string} src - The image source URL.
   * @private
   */
  _showImage(src) {
    // Switch active classes
    this.video.classList.remove('visible');
    this.img.classList.add('visible');

    // Only update DOM attribute if src actually changed to prevent flickering
    if (this.img.src !== src) {
      this.img.src = src;
    }
  }

  /**
   * Internal helper to activate the video element and deactivate the image.
   * Handles the play promise to prevent errors.
   * @param {string} src - The video source URL.
   * @private
   */
  _showVideo(src) {
    
    this.img.classList.remove('visible');

    this.video.classList.add('visible');

    if (this.video.src !== src) {
      this.video.src = src;
    }

    // Attempt to play. Catch prevents errors if the user hasn't interacted with the document yet
    // or if the browser blocks autoplay.
    this.video.play().catch(() => {});
  }
}
