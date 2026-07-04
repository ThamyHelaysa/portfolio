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

export type MediaType = 'image' | 'video' | 'audio';
export type MediaKind = 'album' | 'book' | 'game' | 'project';
export type PreviewPlacement = 'cursor' | 'top' | 'bottom' | 'left' | 'right';

interface PreviewSize {
  w: number;
  h: number;
}

/**
 * Two sizes, both circles (ADR 0004: circle always, grow on play). The glimpse
 * is the small reveal-on-approach bubble; committing to playback grows it to a
 * watchable disc anchored beside the trigger. Video is center-cropped into the
 * circle via `object-fit: cover`. CSS reads these through `--preview-w/h`.
 */
const GLIMPSE_SIZE: PreviewSize = { w: 100, h: 100 };
const GROWN_SIZE: PreviewSize = { w: 220, h: 220 };

/** Media types that have a play/pause commit step. Images are reveal-only. */
const PLAYABLE_TYPES: ReadonlySet<MediaType> = new Set(['video', 'audio']);

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
   * intent is proven by the gesture itself (keyboard focus, touch scroll-in).
   */
  immediate?: boolean;
}

interface PlayOptions {
  src: string;
  type?: MediaType;
  kind?: MediaKind;
  /** The trigger's rect — playback anchors the grown bubble beside it. */
  triggerRect?: DOMRect | null;
  placement?: PreviewPlacement;
}

/**
 * A Singleton class that manages a global media preview overlay.
 *
 * ONE shared DOM node, reused for every trigger (ADR 0004). It is purely
 * decorative (`aria-hidden`, `pointer-events: none`) — all interaction lives on
 * the trigger card, which drives this via `show()` (reveal a paused glimpse),
 * `togglePlay()` (commit to playback: anchor + grow + start media), and
 * `stop()` / `hide()`.
 */
export class SharedMediaPreview {
  /** The single instance of the class. */
  private static instance: SharedMediaPreview;

  private _wrapper: HTMLDivElement;
  private img: HTMLImageElement;
  private video: HTMLVideoElement;
  private audio: HTMLAudioElement;
  private _currentSrc: string | null;
  private _currentType: MediaType | null;
  private _currentSize: PreviewSize;
  /** True once a trigger commits to playback: bubble is grown + anchored. */
  private _isPlaying = false;
  /** The trigger rect captured at play time; the grown bubble anchors to it. */
  private _anchorRect: DOMRect | null = null;
  private _anchorPlacement: PreviewPlacement = 'right';
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
   * Initializes the shared DOM elements: a wrapper div holding an `img`, a
   * `video`, and an `audio` element. Media is created paused — nothing plays
   * until a trigger commits via `togglePlay()`.
   */
  private constructor() {
    /** The main container for the preview. */
    this._wrapper = document.createElement('div');
    this._wrapper.id = 'mediaPreview';
    // Purely decorative glimpse — the slotted trigger carries all semantics.
    this._wrapper.setAttribute('aria-hidden', 'true');

    /** Element used to display static images. */
    this.img = document.createElement('img');

    /** Element used to display (muted, silent) video clips on commit. */
    this.video = document.createElement('video');
    // No autoplay: reveal shows a paused first frame; playback is committed.
    this.video.muted = true;
    this.video.loop = true;
    this.video.playsInline = true;
    this.video.preload = 'auto';

    /** Element used to play audio previews (albums) on commit. */
    this.audio = document.createElement('audio');
    this.audio.loop = true;
    this.audio.preload = 'auto';

    // Blur-in: fresh media carries no `is-loaded` class and CSS keeps it
    // blurred; the class lands when the data is actually there. `error` also
    // marks it so a failed load never leaves a permanently frosted bubble.
    this.img.addEventListener('load', () => this.img.classList.add('is-loaded'));
    this.img.addEventListener('error', () => this.img.classList.add('is-loaded'));
    this.video.addEventListener('canplay', () => this.video.classList.add('is-loaded'));
    this.video.addEventListener('error', () => this.video.classList.add('is-loaded'));

    this._wrapper.appendChild(this.img);
    this._wrapper.appendChild(this.video);
    this._wrapper.appendChild(this.audio);
    this._ensureAttached();

    /** Tracks the currently loaded source to avoid redundant reloading. */
    this._currentSrc = null;
    /** Tracks the current media type ('image' | 'video' | 'audio'). */
    this._currentType = null;
    /** Tracks the current bubble size so `move()` positions with the right box. */
    this._currentSize = GLIMPSE_SIZE;
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
    if (/\.(mp4|webm|ogv)$/.test(lower)) {
      return 'video';
    }
    if (/\.(mp3|wav|m4a|aac|ogg|oga)$/.test(lower)) {
      return 'audio';
    }

    return undefined;
  }

  /** Whether a type has a play/pause commit step (video/audio) vs reveal-only. */
  isPlayable(type: MediaType | null | undefined): boolean {
    return !!type && PLAYABLE_TYPES.has(type);
  }

  /** True while a trigger's playback is committed (bubble grown + anchored). */
  isPlaying(src?: string): boolean {
    if (!this._isPlaying) return false;
    return src ? this._currentSrc === src : true;
  }

  /**
   * Reveals a paused glimpse at specific coordinates. NEVER starts playback
   * (ADR 0004: reveal ≠ play). If a different media is currently playing,
   * hovering here stops it and retargets the single bubble to this glimpse.
   */
  show({ src, type, kind, x, y, placement = 'cursor', triggerRect, immediate = false }: ShowOptions): void {
    if (!src) return;

    // Determine type: use provided type or try to guess from file extension
    const effectiveType = type || this.inferType(src);
    if (!effectiveType) return;
    this._ensureAttached();

    // The card that committed to playback owns the grown bubble — approaching it
    // again must not shrink it back to a glimpse.
    if (this._isPlaying && this._currentSrc === src) return;

    // Hovering a different card while one plays: stop it, then reveal this
    // glimpse (retarget the single bubble).
    if (this._isPlaying) {
      this._stopPlayback();
    }

    this._applyMeta(effectiveType, kind, GLIMPSE_SIZE);

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
   * Commits to (or ends) playback for a trigger. Toggle semantics: calling it
   * for the media already playing stops it; otherwise it anchors the bubble
   * beside the trigger, grows it, and starts the media. Images have no
   * playback — the call reveals the glimpse instead.
   *
   * @returns the resulting playing state (true = now playing).
   */
  togglePlay({ src, type, kind, triggerRect, placement = 'right' }: PlayOptions): boolean {
    if (!src) return false;

    const effectiveType = type || this.inferType(src);
    if (!effectiveType) return false;

    // Reveal-only types never enter the playing state.
    if (!this.isPlayable(effectiveType)) {
      this._reveal(src, effectiveType);
      return false;
    }

    // Second commit on the live media → stop.
    if (this._isPlaying && this._currentSrc === src) {
      this.stop();
      return false;
    }

    this._ensureAttached();
    this._cancelIntent();
    this._cancelLinger();

    // Load the media (glimpse first frame) then start it, grown + anchored.
    this._applyMeta(effectiveType, kind, GROWN_SIZE);
    this._reveal(src, effectiveType);

    this._isPlaying = true;
    this._anchorRect = triggerRect ?? null;
    this._anchorPlacement = placement;
    this._wrapper.classList.add('is-playing', 'is-grown');

    this._positionAnchored();
    this._startCurrentMedia();

    return true;
  }

  /** Stops committed playback and collapses the bubble back to hidden. */
  stop(): void {
    this._stopPlayback();
    this.hide();
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

  /**
   * Applies size + type/kind metadata to the wrapper. Exposed to CSS via
   * `--preview-w/h` and `data-type` / `data-kind`. Applying it while hidden is
   * a visual no-op.
   */
  private _applyMeta(type: MediaType, kind: MediaKind | undefined, size: PreviewSize): void {
    this._currentSize = size;
    this._wrapper.style.setProperty('--preview-w', `${size.w}px`);
    this._wrapper.style.setProperty('--preview-h', `${size.h}px`);
    this._wrapper.dataset.type = type;
    if (kind) {
      this._wrapper.dataset.kind = kind;
    } else {
      delete this._wrapper.dataset.kind;
    }
  }

  /** Loads the media (if it changed) and makes the bubble visible — paused. */
  private _reveal(src: string, type: MediaType): void {
    const isSameMedia = this._currentSrc === src && this._currentType === type;

    if (!isSameMedia) {
      if (type === 'video') {
        this._loadVideo(src);
      } else if (type === 'audio') {
        this._loadAudio(src);
      } else {
        this._showImage(src);
      }

      this._currentSrc = src;
      this._currentType = type;
    }

    this._wrapper.classList.add('is-visible');
  }

  /**
   * Updates the position of the preview element during mousemove. No-op while
   * playback is committed — the grown bubble stays anchored to its trigger.
   */
  move({ x, y, placement = 'cursor', triggerRect }: PositionOptions): void {
    if (this._isPlaying) return;
    this._ensureAttached();
    this._cursor = { x, y };
    this._setPosition({ x, y, placement, triggerRect });
  }

  /**
   * Requests a hide. A pending (not yet revealed) preview is dropped at once;
   * a visible one lingers briefly so a sibling trigger can pick it up warm.
   * Committed playback stops immediately (no linger on an explicit leave).
   */
  hide(): void {
    this._cancelIntent();

    if (this._isPlaying) {
      this._stopPlayback();
      this._doHide();
      return;
    }

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
   * Pauses any playing media and clears the anchored/grown playback state,
   * WITHOUT hiding the bubble — callers decide whether to hide or retarget.
   */
  private _stopPlayback(): void {
    if (!this.video.paused) this.video.pause();
    if (!this.audio.paused) this.audio.pause();

    this._isPlaying = false;
    this._anchorRect = null;
    this._wrapper.classList.remove('is-playing', 'is-grown');
    this._applyMeta(this._currentType ?? 'image', this._wrapper.dataset.kind as MediaKind | undefined, GLIMPSE_SIZE);
  }

  /**
   * Actually hides the preview, pauses any active media and cleans up state.
   */
  private _doHide(): void {
    this._cancelLinger();
    this._wrapper.classList.remove('is-visible');

    this.img.classList.remove('visible');
    this.video.classList.remove('visible');

    if (!this.video.paused) this.video.pause();
    if (!this.audio.paused) this.audio.pause();

    delete this._wrapper.dataset.kind;

    this._currentSrc = null;
    this._currentType = null;
  }

  /** Starts whichever media element matches the current type. */
  private _startCurrentMedia(): void {
    const el = this._currentType === 'video' ? this.video
      : this._currentType === 'audio' ? this.audio
        : null;
    if (!el) return;

    el.play().catch((error) => {
      console.warn('[SharedMediaPreview] Preview playback failed', error);
    });
  }

  /**
   * Positions the grown, anchored bubble beside its trigger rect. Falls back to
   * viewport-centered if no rect was captured at play time.
   */
  private _positionAnchored(): void {
    if (!this._anchorRect) {
      const { w, h } = this._currentSize;
      this._setPosition({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
        placement: 'cursor',
        triggerRect: null,
      });
      // Center via cursor placement using viewport middle.
      this._wrapper.style.setProperty('--preview-x', `${(window.innerWidth - w) / 2}px`);
      this._wrapper.style.setProperty('--preview-y', `${(window.innerHeight - h) / 2}px`);
      return;
    }

    this._setPosition({
      x: this._anchorRect.left + this._anchorRect.width / 2,
      y: this._anchorRect.top + this._anchorRect.height / 2,
      placement: this._anchorPlacement,
      triggerRect: this._anchorRect,
    });
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
   * Internal helper to activate the image element and deactivate video.
   */
  private _showImage(src: string): void {
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
   * Loads a video and shows its (paused) first frame. Playback is deferred to
   * the commit step (`togglePlay`).
   */
  private _loadVideo(src: string): void {
    this.img.classList.remove('visible');
    this.video.classList.add('visible');

    if (this.video.src !== src) {
      // Setting src resets readyState, so `canplay` (wired in the
      // constructor) re-marks it loaded — even for cached clips.
      this.video.classList.remove('is-loaded');
      this.video.src = src;
    }
  }

  /**
   * Loads an audio source. Audio has no visual — the wrapper's `data-kind`
   * (e.g. album → vinyl) provides the imagery; playback is deferred to commit.
   */
  private _loadAudio(src: string): void {
    // Audio carries no picture: the image element stays hidden, the vinyl (or
    // bare accent circle) is the visual.
    this.img.classList.remove('visible');
    this.video.classList.remove('visible');

    if (this.audio.src !== src) {
      this.audio.src = src;
    }
  }
}
