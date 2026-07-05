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

/**
 * Desktop dismiss-on-scroll (ADR 0004): once committed playback is scrolled
 * past this many pixels, it stops. A small threshold ignores trackpad jitter.
 */
const DESKTOP_SCROLL_STOP_PX = 8;

/**
 * Touch scroll-follow: the bubble locks to its source card 1:1 while scrolling.
 * `is-tracking` drops the transform easing so it doesn't rubber-band; it is
 * removed this long after the last scroll so reveal/grow/hide still animate.
 */
const TRACK_IDLE_MS = 120;

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
/** Touch screens are small — the grown disc shrinks so it stays on-screen. */
const GROWN_SIZE_TOUCH: PreviewSize = { w: 150, h: 150 };

/** Media types that have a play/pause commit step. Images are reveal-only. */
const PLAYABLE_TYPES: ReadonlySet<MediaType> = new Set(['video', 'audio']);

interface PositionOptions {
  x: number;
  y: number;
  placement?: PreviewPlacement;
  triggerRect?: DOMRect | null;
  /** Skip the vertical viewport clamp so the bubble can trail its source off-screen. */
  unclampY?: boolean;
}

/**
 * A live source-rect provider. On touch, the singleton calls it on scroll to
 * keep the bubble glued to its trigger card (and to know when the card has
 * scrolled fully off-screen).
 */
type RectProvider = () => DOMRect;

interface ShowOptions extends PositionOptions {
  src: string;
  type?: MediaType;
  kind?: MediaKind;
  /**
   * Skip the hover-intent sampler and reveal at once. For interactions where
   * intent is proven by the gesture itself (keyboard focus, touch scroll-in).
   */
  immediate?: boolean;
  /** Touch only: live rect provider so the glimpse tracks the card on scroll. */
  getRect?: RectProvider;
}

interface PlayOptions {
  src: string;
  type?: MediaType;
  kind?: MediaKind;
  /** The trigger's rect — playback anchors the grown bubble beside it. */
  triggerRect?: DOMRect | null;
  placement?: PreviewPlacement;
  /** Touch only: live rect provider so the grown bubble tracks the card on scroll. */
  getRect?: RectProvider;
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
  /** Window event fired (with `{ detail: { src } }`) whenever playback stops. */
  static readonly STOPPED_EVENT = 'sharedpreview:stopped';

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

  // --- Touch scroll-follow / desktop dismiss-on-scroll ---
  /** Live rect of the current source card (touch only); null when not tracking. */
  private _trackGetRect: RectProvider | null = null;
  private _trackListenersOn = false;
  private _scrollRaf: number | null = null;
  private _trackIdleTimer: ReturnType<typeof setTimeout> | null = null;
  /** Scroll position captured at desktop play time, for the dismiss threshold. */
  private _playStartScrollY = 0;
  private _onScroll = (): void => {
    if (this._scrollRaf !== null) return;
    this._scrollRaf = requestAnimationFrame(() => {
      this._scrollRaf = null;
      this._onScrollFrame();
    });
  };
  private _onResize = (): void => this._reposition();

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
  show({ src, type, kind, x, y, placement = 'cursor', triggerRect, immediate = false, getRect }: ShowOptions): void {
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

    this._anchorPlacement = placement;
    this._cursor = { x, y };
    this._setPosition({ x, y, placement, triggerRect });

    // Touch: keep the glimpse glued to its card as the page scrolls. Desktop
    // glimpses follow the cursor instead, so no rect provider is passed.
    if (getRect && this._coarsePointer()) {
      this._startTracking(getRect);
    }

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
  togglePlay({ src, type, kind, triggerRect, placement = 'right', getRect }: PlayOptions): boolean {
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
    this._applyMeta(effectiveType, kind, this._grownSize());
    this._reveal(src, effectiveType);

    this._isPlaying = true;
    this._anchorRect = triggerRect ?? null;
    this._anchorPlacement = placement;
    this._wrapper.classList.add('is-playing', 'is-grown');

    this._positionAnchored();
    this._startCurrentMedia();

    // Touch: follow the source card on scroll, stopping once it is fully gone.
    // Desktop: any real scroll dismisses playback (no follow), so we only need
    // the listener and the baseline scroll position.
    if (this._coarsePointer()) {
      this._startTracking(getRect ?? null);
    } else {
      this._playStartScrollY = this._scrollY();
      this._startTracking(null);
    }

    return true;
  }

  /**
   * Stops committed playback and collapses the bubble at once. Unlike `hide()`,
   * an explicit stop never lingers — the warm linger is for hover gaps, not for
   * a deliberate stop / scroll-out / dismiss.
   */
  stop(): void {
    this._stopPlayback();
    this._doHide();
  }

  /**
   * Hides the bubble only if it is currently showing `src`. Lets a trigger that
   * scrolled out of view drop its own glimpse without clobbering a sibling that
   * already retargeted the single shared bubble.
   */
  hideIfCurrent(src: string): void {
    if (this._currentSrc === src) this.hide();
  }

  /** Coarse pointer (touch): drives follow-on-scroll and the smaller grown size. */
  private _coarsePointer(): boolean {
    return typeof window !== 'undefined' && !!window.matchMedia?.('(hover: none)').matches;
  }

  private _scrollY(): number {
    return typeof window !== 'undefined' ? window.scrollY : 0;
  }

  /** Grown-bubble size: smaller on coarse-pointer (touch) devices. */
  private _grownSize(): PreviewSize {
    return this._coarsePointer() ? GROWN_SIZE_TOUCH : GROWN_SIZE;
  }

  /**
   * Begins tracking scroll while the bubble is visible. `getRect` is the live
   * source-rect provider on touch (null on desktop, where scroll only dismisses
   * playback). Idempotent — attaches the window listeners once.
   */
  private _startTracking(getRect: RectProvider | null): void {
    this._trackGetRect = getRect;
    if (this._trackListenersOn || typeof window === 'undefined') return;
    window.addEventListener('scroll', this._onScroll, { passive: true });
    window.addEventListener('resize', this._onResize, { passive: true });
    this._trackListenersOn = true;
  }

  /** Detaches scroll tracking and clears its transient state. */
  private _stopTracking(): void {
    if (this._trackListenersOn && typeof window !== 'undefined') {
      window.removeEventListener('scroll', this._onScroll);
      window.removeEventListener('resize', this._onResize);
    }
    this._trackListenersOn = false;
    this._trackGetRect = null;
    if (this._scrollRaf !== null) {
      cancelAnimationFrame(this._scrollRaf);
      this._scrollRaf = null;
    }
    if (this._trackIdleTimer !== null) {
      clearTimeout(this._trackIdleTimer);
      this._trackIdleTimer = null;
    }
    this._wrapper.classList.remove('is-tracking');
  }

  /**
   * One throttled scroll frame. Touch: reposition the bubble to its card and
   * stop committed playback once the card is fully off-screen. Desktop: dismiss
   * committed playback once scrolled past the threshold.
   */
  private _onScrollFrame(): void {
    if (!this._wrapper.classList.contains('is-visible')) {
      this._stopTracking();
      return;
    }

    if (this._coarsePointer()) {
      if (this._trackGetRect) {
        this._markTracking();
        this._reposition();

        // Committed playback ends when its source has fully left the viewport.
        if (this._isPlaying) {
          const rect = this._trackGetRect();
          if (rect.bottom <= 0 || rect.top >= window.innerHeight) {
            this.stop();
          }
        }
      }
      return;
    }

    // Desktop: scrolling away from a playing preview dismisses it.
    if (this._isPlaying && Math.abs(this._scrollY() - this._playStartScrollY) > DESKTOP_SCROLL_STOP_PX) {
      this.stop();
    }
  }

  /** Adds the instant-tracking class and schedules its removal after scroll idles. */
  private _markTracking(): void {
    this._wrapper.classList.add('is-tracking');
    if (this._trackIdleTimer !== null) clearTimeout(this._trackIdleTimer);
    this._trackIdleTimer = setTimeout(() => {
      this._trackIdleTimer = null;
      this._wrapper.classList.remove('is-tracking');
    }, TRACK_IDLE_MS);
  }

  /** Repositions the bubble from the live source rect, trailing it off-screen. */
  private _reposition(): void {
    const rect = this._trackGetRect?.();
    if (!rect) return;
    this._setPosition({
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
      placement: this._anchorPlacement,
      triggerRect: rect,
      unclampY: true,
    });
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
    const wasPlaying = this._isPlaying;
    const stoppedSrc = this._currentSrc;

    if (!this.video.paused) this.video.pause();
    if (!this.audio.paused) this.audio.pause();

    this._isPlaying = false;
    this._anchorRect = null;
    this._wrapper.classList.remove('is-playing', 'is-grown');
    this._applyMeta(this._currentType ?? 'image', this._wrapper.dataset.kind as MediaKind | undefined, GLIMPSE_SIZE);

    // Playback can end without the owning card knowing (scroll-out, dismiss, or
    // another card taking over). Announce it so that card can drop aria-pressed.
    if (wasPlaying && stoppedSrc && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(SharedMediaPreview.STOPPED_EVENT, { detail: { src: stoppedSrc } }));
    }
  }

  /**
   * Actually hides the preview, pauses any active media and cleans up state.
   */
  private _doHide(): void {
    this._cancelLinger();
    this._stopTracking();
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
    // Prefer the live rect (touch follow) over the play-time snapshot.
    const rect = this._trackGetRect?.() ?? this._anchorRect;

    if (!rect) {
      const { w, h } = this._currentSize;
      // Center via cursor placement using viewport middle.
      this._wrapper.style.setProperty('--preview-x', `${(window.innerWidth - w) / 2}px`);
      this._wrapper.style.setProperty('--preview-y', `${(window.innerHeight - h) / 2}px`);
      return;
    }

    this._setPosition({
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
      placement: this._anchorPlacement,
      triggerRect: rect,
    });
  }

  /**
   * Calculates and applies CSS variables for positioning.
   * Applies an offset to center the preview relative to the cursor.
   */
  private _setPosition({ x, y, placement, triggerRect, unclampY = false }: PositionOptions): void {
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

    // Clamp so it doesn’t overflow viewport too badly. During touch follow the
    // vertical clamp is skipped so the bubble can trail its card off-screen
    // instead of pinning to an edge; horizontal stays clamped so the
    // right-anchored bubble never flies off a full-width mobile card.
    const maxX = vw - w - PREVIEW_OFFSET;
    const maxY = vh - h - PREVIEW_OFFSET;

    eixoX = Math.max(PREVIEW_OFFSET, Math.min(eixoX, maxX));
    if (!unclampY) {
      eixoY = Math.max(PREVIEW_OFFSET, Math.min(eixoY, maxY));
    }

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
