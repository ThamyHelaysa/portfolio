/**
 * Offset in pixels to position the preview element relative to the cursor.
 * This ensures the cursor remains visible and prevents the preview
 * from interfering with mouse events on the underlying element.
 */
const PREVIEW_OFFSET = 12;

/**
 * Hover intent (see CONTEXT.md): the preview only appears once the cursor
 * *settles* over a trigger — a fast sweep across the page never flashes it.
 * Intent is judged from velocity: every tick the cursor's travel since the
 * previous tick is compared against a threshold.
 */
const INTENT_TICK_MS = 100;
const INTENT_MAX_TRAVEL_PX = 7;

/**
 * Warm state (see CONTEXT.md): once intent is proven the bubble survives a
 * short linger after leave, so crossing the gap to a sibling trigger swaps
 * the preview instead of collapsing and re-proving intent.
 */
const LINGER_MS = 100;

export type MediaType = 'image' | 'video';
export type MediaKind = 'album' | 'book' | 'game' | 'project';
export type PreviewPlacement = 'cursor' | 'top' | 'bottom' | 'left' | 'right';

interface PreviewSize {
  w: number;
  h: number;
}

/**
 * Shape follows the preview type: images render in the small circle,
 * videos in a wider 16:9 rounded rect so screen recordings stay legible.
 * This table is the single source of truth — CSS consumes it via the
 * `--preview-w` / `--preview-h` custom properties set in `show()`.
 */
const PREVIEW_SIZES: Record<MediaType, PreviewSize> = {
  image: { w: 100, h: 100 },
  video: { w: 240, h: 135 },
};

interface PositionOptions {
  x: number;
  y: number;
  placement?: PreviewPlacement;
  triggerRect?: DOMRect | null;
}

interface ShowOptions extends PositionOptions {
  src: string;
  type?: MediaType;
  kind?: MediaKind;
  /**
   * Skip the hover-intent sampler and reveal at once. For interactions where
   * intent is proven by the gesture itself (keyboard focus).
   */
  immediate?: boolean;
}

/**
 * A Singleton class that manages a global media preview overlay.
 * * This class is responsible for creating a single DOM structure attached to the body
 * and reusing it to display images or videos. It handles positioning, 
 * visibility toggling, and resource management (like pausing videos when hidden).
 */
export class SharedMediaPreview {
  /** The single instance of the class. */
  private static instance: SharedMediaPreview;

  private _wrapper: HTMLDivElement;
  private img: HTMLImageElement;
  private video: HTMLVideoElement;
  private _currentSrc: string | null;
  private _currentType: MediaType | null;
  private _currentSize: PreviewSize;
  /** Latest cursor position, fed by show()/move(); the intent sampler reads it. */
  private _cursor: { x: number; y: number } = { x: 0, y: 0 };
  private _lastSample: { x: number; y: number } | null = null;
  private _intentTimer: ReturnType<typeof setInterval> | null = null;
  private _lingerTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * Retrieves the singleton instance of SharedMediaPreview.
   * If it does not exist, it creates one.
   */
  static getInstance(): SharedMediaPreview {
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
  private constructor() {
    /** The main container for the preview. */
    this._wrapper = document.createElement('div');
    this._wrapper.id = 'mediaPreview';
    // Purely decorative glimpse — the slotted trigger carries all semantics.
    this._wrapper.setAttribute('aria-hidden', 'true');

    /** Element used to display static images. */
    this.img = document.createElement('img');

    /** Element used to display video content. */
    this.video = document.createElement('video');

    // Configure video for background-like behavior (no sound, auto loop)
    this.video.autoplay = true;
    this.video.muted = true;
    this.video.loop = true;
    this.video.playsInline = true;

    // Blur-in: fresh media carries no `is-loaded` class and CSS keeps it
    // blurred; the class lands when the data is actually there. `error` also
    // marks it so a failed load never leaves a permanently frosted bubble.
    this.img.addEventListener('load', () => this.img.classList.add('is-loaded'));
    this.img.addEventListener('error', () => this.img.classList.add('is-loaded'));
    this.video.addEventListener('canplay', () => this.video.classList.add('is-loaded'));
    this.video.addEventListener('error', () => this.video.classList.add('is-loaded'));

    this._wrapper.appendChild(this.img);
    this._wrapper.appendChild(this.video);
    this._ensureAttached();

    /** Tracks the currently loaded source to avoid redundant reloading. */
    this._currentSrc = null;
    /** Tracks the current media type ('image' or 'video'). */
    this._currentType = null;
    /** Tracks the current bubble size so `move()` positions with the right box. */
    this._currentSize = PREVIEW_SIZES.image;
  }

  private _ensureAttached(): void {
    if (this._wrapper.isConnected) return;
    if (!document.body) return;

    document.body.appendChild(this._wrapper);
  }

  /**
   * Infers the media type based on the file extension of the source URL.
   * @param src - The source URL to analyze.
   * @returns The inferred type, or undefined if unknown.
   */
  inferType(src: string | null | undefined): MediaType | undefined {
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
   */
  show({ src, type, kind, x, y, placement = 'cursor', triggerRect, immediate = false }: ShowOptions): void {
    if (!src) return;

    // Determine type: use provided type or try to guess from file extension
    const effectiveType = type || this.inferType(src);
    if (!effectiveType) return;
    this._ensureAttached();

    // Shape and size follow the type; kind drives presentation (album → vinyl disc).
    // Both are exposed to CSS so all visuals stay declarative. Applying them
    // while the bubble is still hidden (intent pending) is a visual no-op.
    this._currentSize = PREVIEW_SIZES[effectiveType];
    this._wrapper.style.setProperty('--preview-w', `${this._currentSize.w}px`);
    this._wrapper.style.setProperty('--preview-h', `${this._currentSize.h}px`);
    this._wrapper.dataset.type = effectiveType;
    if (kind) {
      this._wrapper.dataset.kind = kind;
    } else {
      delete this._wrapper.dataset.kind;
    }

    this._cursor = { x, y };
    this._setPosition({ x, y, placement, triggerRect });

    // Warm: bubble already up (or lingering) — intent stays proven, siblings
    // swap instantly instead of re-sampling.
    const warm = this._wrapper.classList.contains('is-visible');

    if (immediate || warm) {
      this._cancelIntent();
      this._cancelLinger();
      this._reveal(src, effectiveType);
      return;
    }

    this._startIntent(src, effectiveType);
  }

  /**
   * Starts (or restarts) the intent sampler: reveal once the cursor's travel
   * over one tick drops under the threshold — i.e. it settled on the trigger.
   */
  private _startIntent(src: string, type: MediaType): void {
    this._cancelIntent();

    this._lastSample = { ...this._cursor };
    this._intentTimer = setInterval(() => {
      const dx = this._cursor.x - (this._lastSample?.x ?? 0);
      const dy = this._cursor.y - (this._lastSample?.y ?? 0);

      if (Math.hypot(dx, dy) < INTENT_MAX_TRAVEL_PX) {
        this._cancelIntent();
        this._reveal(src, type);
        return;
      }

      this._lastSample = { ...this._cursor };
    }, INTENT_TICK_MS);
  }

  private _cancelIntent(): void {
    if (this._intentTimer !== null) {
      clearInterval(this._intentTimer);
      this._intentTimer = null;
    }
    this._lastSample = null;
  }

  /** Loads the media (if it changed) and makes the bubble visible. */
  private _reveal(src: string, type: MediaType): void {
    const isSameMedia = this._currentSrc === src && this._currentType === type;

    if (!isSameMedia) {
      // Toggle specific element visibility
      if (type === 'video') {
        this._showVideo(src);
      } else {
        this._showImage(src);
      }

      this._currentSrc = src;
      this._currentType = type;
    }

    this._wrapper.classList.add('is-visible');
  }

  /**
   * Updates the position of the preview element.
   * Usually called during mousemove events.
   */
  move({ x, y, placement = 'cursor', triggerRect }: PositionOptions): void {
    this._ensureAttached();
    this._cursor = { x, y };
    this._setPosition({ x, y, placement, triggerRect });
  }

  /**
   * Requests a hide. A pending (not yet revealed) preview is dropped at once;
   * a visible one lingers briefly so a sibling trigger can pick it up warm.
   */
  hide(): void {
    this._cancelIntent();

    if (!this._wrapper.classList.contains('is-visible')) {
      this._doHide();
      return;
    }

    if (this._lingerTimer !== null) return;

    this._lingerTimer = setTimeout(() => {
      this._lingerTimer = null;
      this._doHide();
    }, LINGER_MS);
  }

  private _cancelLinger(): void {
    if (this._lingerTimer !== null) {
      clearTimeout(this._lingerTimer);
      this._lingerTimer = null;
    }
  }

  /**
   * Actually hides the preview, pauses any active media and cleans up state.
   */
  private _doHide(): void {
    this._cancelLinger();
    this._wrapper.classList.remove('is-visible');

    this.img.classList.remove('visible');
    this.video.classList.remove('visible');

    // Pause video to save resources when not visible
    if (!this.video.paused) {
      this.video.pause();
    }

    delete this._wrapper.dataset.kind;

    this._currentSrc = null;
    this._currentType = null;
  }

  /**
   * Calculates and applies CSS variables for positioning.
   * Applies an offset to center the preview relative to the cursor.
   */
  private _setPosition({ x, y, placement, triggerRect }: PositionOptions): void {
    let eixoX = 0;
    let eixoY = 0;

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const { w, h } = this._currentSize;

    if (placement === 'cursor' || !triggerRect) {
      // center bubble on cursor
      eixoX = x - w / 2;
      eixoY = y - h / 2;
    } else {
      const rect = triggerRect;
      switch (placement) {
        case 'right':
          eixoX = rect.right + PREVIEW_OFFSET;
          eixoY = rect.top + (rect.height - h) / 2;
          break;

        case 'left':
          eixoX = rect.left - w - PREVIEW_OFFSET;
          eixoY = rect.top + (rect.height - h) / 2;
          break;

        case 'top':
          eixoX = rect.left + (rect.width - w) / 2;
          eixoY = rect.top - h - PREVIEW_OFFSET;
          break;

        case 'bottom':
          eixoX = rect.left + (rect.width - w) / 2;
          eixoY = rect.bottom + PREVIEW_OFFSET;
          break;

        default:
          // fallback to cursor
          eixoX = x - w / 2;
          eixoY = y - h / 2;
          break;
      }
    }

    // Clamp so it doesn’t overflow viewport too badly
    const maxX = vw - w - PREVIEW_OFFSET;
    const maxY = vh - h - PREVIEW_OFFSET;

    eixoX = Math.max(PREVIEW_OFFSET, Math.min(eixoX, maxX));
    eixoY = Math.max(PREVIEW_OFFSET, Math.min(eixoY, maxY));

    this._wrapper.style.setProperty('--preview-x', `${eixoX}px`);
    this._wrapper.style.setProperty('--preview-y', `${eixoY}px`);
  }

  /**
   * Internal helper to activate the image element and deactivate the video.
   */
  private _showImage(src: string): void {
    // Switch active classes
    this.video.classList.remove('visible');
    this.img.classList.add('visible');

    // Only update DOM attribute if src actually changed to prevent flickering
    if (this.img.src !== src) {
      this.img.classList.remove('is-loaded');
      this.img.src = src;

      // Cached image: no load event will fire, mark it ready at once.
      if (this.img.complete && this.img.naturalWidth > 0) {
        this.img.classList.add('is-loaded');
      }
    }
  }

  /**
   * Internal helper to activate the video element and deactivate the image.
   * Handles the play promise to prevent errors.
   */
  private _showVideo(src: string): void {
    this.img.classList.remove('visible');
    this.video.classList.add('visible');

    if (this.video.src !== src) {
      // Setting src resets readyState, so `canplay` (wired in the
      // constructor) re-marks it loaded — even for cached clips.
      this.video.classList.remove('is-loaded');
      this.video.src = src;
    }

    // Attempt to play. Catch prevents errors if the user hasn't interacted with the document yet
    // or if the browser blocks autoplay.
    this.video.play().catch((error) => {
      console.warn('[SharedMediaPreview] Video preview autoplay failed', error);
    });
  }
}
