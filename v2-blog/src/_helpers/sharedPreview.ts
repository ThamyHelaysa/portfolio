import {
  computePreviewPosition,
  type PreviewPlacement,
  type PreviewSize,
} from './previewGeometry.ts';
import { ScrollAnchor } from './scrollAnchor.ts';
import { PreviewContainer } from './previewContainer.ts';
import { type MediaChannel, createMediaChannels } from './previewChannels.ts';
import { type MediaPresentation, createMediaPresentations } from './previewPresentations.ts';

export type { PreviewPlacement } from './previewGeometry.ts';

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

export type MediaType = 'image' | 'video' | 'audio';
export type MediaKind = 'album' | 'book' | 'game' | 'project';

/**
 * Two sizes for the default round Face (ADR 0004/0006). The glimpse is the
 * small reveal-on-approach bubble; committing to playback grows it to a
 * watchable disc anchored beside the trigger. CSS reads these through
 * `--preview-w/h`.
 */
const GLIMPSE_SIZE: PreviewSize = { w: 100, h: 100 };
const GROWN_SIZE: PreviewSize = { w: 220, h: 220 };
/** Touch screens are small — the grown disc shrinks so it stays on-screen. */
const GROWN_SIZE_TOUCH: PreviewSize = { w: 150, h: 150 };

/**
 * The `album` kind opts out of the circle (ADR 0005): a square Cover with the
 * vinyl disc sliding out beside it. One fixed box holds Cover + emerged disc;
 * the disc's own animation is the whole motion, so the box never grows.
 * `--album-cover` sizes the square Cover.
 */
const ALBUM_BOX: PreviewSize = { w: 212, h: 112 };
const ALBUM_BOX_TOUCH: PreviewSize = { w: 172, h: 92 };
const ALBUM_COVER = 100;
const ALBUM_COVER_TOUCH = 80;

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

/**
 * Everything the singleton needs to identify and locate a trigger card. The
 * card hands this over; the singleton pulls the rect, derives the coordinates,
 * and applies the `'cursor' → 'right'` anchor coercion itself — the card no
 * longer speaks the positioning vocabulary (ADR 0004).
 */
export interface PreviewTrigger {
  src: string;
  type?: MediaType;
  kind?: MediaKind;
  /** Cover image for kinds with a Presentation (album). Ignored otherwise. */
  cover?: string;
  /** The card's positioning strategy. Coerced to 'right' when anchored/grown. */
  placement: PreviewPlacement;
  /** Live rect of the card — read for anchoring and touch scroll-follow. */
  getRect: RectProvider;
}

/** Per-interaction reveal intent, layered over a {@link PreviewTrigger}. */
export interface RevealOptions {
  /** Desktop pointer position; absent for focus/scroll (centre on the rect). */
  cursor?: { x: number; y: number };
  /**
   * Skip the hover-intent sampler and reveal at once. For interactions where
   * intent is proven by the gesture itself (keyboard focus, touch scroll-in).
   */
  immediate?: boolean;
  /** Anchor beside the card instead of on the cursor (touch scroll-reveal). */
  anchor?: boolean;
}

/**
 * A Singleton class that manages a global media preview overlay.
 *
 * ONE shared Container node, reused for every trigger (ADR 0004/0006). It is a
 * neutral, decorative envelope (`aria-hidden`, `pointer-events: none`) that
 * carries no kind look of its own — every visual lives in a Face mounted inside
 * it. All interaction lives on the trigger card, which drives this by handing
 * over a {@link PreviewTrigger}: `reveal()` (a paused glimpse), `commit()`
 * (anchor + start media + play animation), and `move()` / `stop()` / `hide()`.
 *
 * The Container owns show/hide (a CSS transition on scale+opacity, sequenced via
 * `PreviewContainer`'s promise, not a timer); Channels own playback;
 * Presentations own their Face's visual + its own animation.
 */
export class SharedMediaPreview {
  /** Window event fired (with `{ detail: { src } }`) whenever playback stops. */
  static readonly STOPPED_EVENT = 'sharedpreview:stopped';

  /** The single instance of the class. */
  private static instance: SharedMediaPreview;

  /** The neutral envelope: position, size box, show/hide. No kind look. */
  private _wrapper: HTMLDivElement;
  /** Owns the wrapper's `is-visible` class + the promise-based collapse (ADR 0006). */
  private _container: PreviewContainer;
  /** Default round Face — accent ring + circular clip framing the visual Channel. */
  private _roundFace: HTMLDivElement;
  /** One playback element per media type; exactly one is active at a time. */
  private _channels = createMediaChannels();
  /** Per-kind Presentations/Faces (ADR 0005/0006); only `album` has one today. */
  private _presentations = createMediaPresentations();
  /** The channel currently revealed in the bubble, if any. */
  private _active: MediaChannel | null = null;
  /** The kind Presentation currently shown (album), if any. */
  private _activePresentation: MediaPresentation | null = null;
  private _currentSrc: string | null = null;
  private _currentType: MediaType | null = null;
  private _currentSize: PreviewSize = GLIMPSE_SIZE;
  /** True once a trigger commits to playback. */
  private _isPlaying = false;
  /** The trigger rect captured at play time; the grown bubble anchors to it. */
  private _anchorRect: DOMRect | null = null;
  private _anchorPlacement: PreviewPlacement = 'right';
  /** Latest cursor position, fed by reveal()/move(); the intent sampler reads it. */
  private _cursor: { x: number; y: number } = { x: 0, y: 0 };
  private _lastSample: { x: number; y: number } | null = null;
  private _intentTimer: ReturnType<typeof setInterval> | null = null;
  private _lingerTimer: ReturnType<typeof setTimeout> | null = null;
  /**
   * Monotonic generation. Bumped on every new reveal/commit/hide so a
   * still-pending collapse's teardown (resolved after its hide animation) knows
   * it has been superseded — replaces the old retract/teardown setTimeouts.
   */
  private _gen = 0;

  // --- Touch scroll-follow / desktop dismiss-on-scroll ---
  /** Live rect of the current source card (touch only); null when not tracking. */
  private _trackGetRect: RectProvider | null = null;
  /** Scroll position captured at desktop play time, for the dismiss threshold. */
  private _playStartScrollY = 0;
  /** Owns the scroll/resize listener + rAF lifecycle; policy stays here. */
  private _scrollAnchor = new ScrollAnchor({
    onScrollFrame: () => this._onScrollFrame(),
    onResize: () => this._reposition(),
  });

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
   * Builds the bubble: a neutral Container holding the default round Face (with
   * the visual channels), each kind Face (album), and the loose `<audio>`
   * (sound only). Each Face/Channel configures its own element; media is paused
   * until a trigger commits.
   */
  private constructor() {
    this._wrapper = document.createElement('div');
    this._wrapper.id = 'mediaPreview';
    // Purely decorative glimpse — the slotted trigger carries all semantics.
    this._wrapper.setAttribute('aria-hidden', 'true');
    this._container = new PreviewContainer(this._wrapper);

    // Default round Face: the visual channels (image/video) render inside it.
    this._roundFace = document.createElement('div');
    this._roundFace.className = 'round-face';
    for (const type of ['image', 'video'] as const) {
      this._roundFace.appendChild(this._channels[type].el);
    }
    this._wrapper.appendChild(this._roundFace);

    // Kind Faces (album Cover + vinyl) sit alongside; `is-active` picks one.
    for (const presentation of Object.values(this._presentations)) {
      if (presentation) this._wrapper.appendChild(presentation.el);
    }

    // Audio is loose — sound only, no visual (ADR 0006).
    this._wrapper.appendChild(this._channels.audio.el);

    this._ensureAttached();
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

  /** True while a trigger's playback is committed. */
  isPlaying(src?: string): boolean {
    if (!this._isPlaying) return false;
    return src ? this._currentSrc === src : true;
  }

  /**
   * Reveals a paused glimpse for a trigger. NEVER starts playback (ADR 0004:
   * reveal ≠ play). The singleton pulls the rect from the trigger and derives
   * the coordinates: with a `cursor` it centres there, otherwise on the rect's
   * centre; `anchor` beside the card (touch scroll-reveal). If a different media
   * is currently playing, revealing here stops it and retargets the bubble.
   */
  reveal(trigger: PreviewTrigger, { cursor, immediate = false, anchor = false }: RevealOptions = {}): void {
    const { src } = trigger;
    if (!src) return;

    const effectiveType = trigger.type || this.inferType(src);
    if (!effectiveType) return;
    this._ensureAttached();

    // A new target supersedes any pending collapse teardown / deferred reveal.
    this._gen++;

    const rect = trigger.getRect();
    const placement = anchor ? this._anchorPlacementFor(trigger.placement) : trigger.placement;
    const point = cursor ?? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };

    // The card that committed to playback owns the bubble — approaching it again
    // must not reset it.
    if (this._isPlaying && this._currentSrc === src) return;

    // Crossing the album shape boundary while visible: retract the current
    // bubble fully first, then reveal the new one (ADR 0005/0006) so a square
    // album never morphs into a round bubble. Only scale + opacity animate, so
    // the shape change happens entirely while hidden.
    const visible = this._container.isVisible;
    const shapeSwap = (this._wrapper.dataset.kind === 'album') !== (trigger.kind === 'album');
    if (visible && shapeSwap && !this._reducedMotion()) {
      this._deferReveal(trigger, { cursor, immediate, anchor });
      return;
    }

    // Revealing a different card while one plays: stop it, then reveal this
    // glimpse (retarget the single bubble).
    if (this._isPlaying) {
      this._stopPlayback();
    }

    const glimpseSize = trigger.kind === 'album' ? this._albumBox() : GLIMPSE_SIZE;
    this._applyMeta(effectiveType, trigger.kind, glimpseSize);
    this._applyFace(trigger.kind, trigger.cover);

    this._anchorPlacement = placement;
    this._cursor = point;
    this._setPosition({ x: point.x, y: point.y, placement, triggerRect: rect });

    // Touch: keep the glimpse glued to its card as the page scrolls. Desktop
    // glimpses follow the cursor instead.
    if (this._coarsePointer()) {
      this._startTracking(trigger.getRect);
    }

    // Warm: bubble already up (or lingering) — intent stays proven, siblings
    // swap instantly instead of re-sampling.
    if (immediate || visible) {
      this._cancelIntent();
      this._cancelLinger();
      this._reveal(src, effectiveType);
      return;
    }

    this._startIntent(src, effectiveType);
  }

  /** Grown/anchored placement never sits on the cursor: 'cursor' becomes 'right'. */
  private _anchorPlacementFor(placement: PreviewPlacement): PreviewPlacement {
    return placement === 'cursor' ? 'right' : placement;
  }

  private _reducedMotion(): boolean {
    return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  }

  /**
   * Sequential shape-swap (album ↔ other). Collapse the current bubble in its
   * own shape (scale + opacity only), then — once hidden — tear down the old
   * visuals and reveal the new target, whose geometry is applied while still
   * invisible. So the square↔circle change is never seen; only the entrance
   * animates. Uses the generation guard so a newer interaction supersedes it.
   */
  private _deferReveal(trigger: PreviewTrigger, opts: RevealOptions): void {
    const gen = this._gen;
    if (this._isPlaying) this._stopPlayback();
    this._cancelIntent();
    this._cancelLinger();
    this._pauseAllMedia();
    this._stopTracking();

    void this._container.hide().then(() => {
      if (gen !== this._gen) return; // superseded by a newer reveal/hide
      this._teardown();
      this.reveal(trigger, { ...opts, immediate: true });
    });
  }

  /**
   * Commits to (or ends) playback for a trigger. Toggle semantics: calling it
   * for the media already playing stops it; otherwise it anchors the bubble
   * beside the trigger and starts the media + its play animation. Images have no
   * playback — the call reveals the glimpse instead.
   *
   * @returns the resulting playing state (true = now playing).
   */
  commit(trigger: PreviewTrigger): boolean {
    const { src } = trigger;
    if (!src) return false;

    const effectiveType = trigger.type || this.inferType(src);
    if (!effectiveType) return false;

    this._gen++;

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

    const rect = trigger.getRect();
    // Grown playback always anchors beside the card, never on the cursor.
    const placement = this._anchorPlacementFor(trigger.placement);

    // Album keeps its fixed box and slides the disc (ADR 0005); every other kind
    // grows the round Face. Load the media (glimpse first frame) then start it.
    const isAlbum = trigger.kind === 'album';
    this._applyMeta(effectiveType, trigger.kind, isAlbum ? this._albumBox() : this._grownSize());
    this._applyFace(trigger.kind, trigger.cover);
    this._reveal(src, effectiveType);

    this._isPlaying = true;
    this._anchorRect = rect;
    this._anchorPlacement = placement;

    this._positionAnchored();

    // Visual play (album disc) is owned by the Presentation; sound by the Channel.
    this._activePresentation?.play({ reducedMotion: this._reducedMotion() });
    this._startCurrentMedia();

    // Touch: follow the source card on scroll, stopping once it is fully gone.
    // Desktop: any real scroll dismisses playback (no follow), so we only need
    // the listener and the baseline scroll position.
    if (this._coarsePointer()) {
      this._startTracking(trigger.getRect);
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

  /** Grown round-Face size: smaller on coarse-pointer (touch) devices. */
  private _grownSize(): PreviewSize {
    return this._coarsePointer() ? GROWN_SIZE_TOUCH : GROWN_SIZE;
  }

  /** The fixed album box (ADR 0005), smaller on touch. */
  private _albumBox(): PreviewSize {
    return this._coarsePointer() ? ALBUM_BOX_TOUCH : ALBUM_BOX;
  }

  /**
   * Begins tracking scroll while the bubble is visible. `getRect` is the live
   * source-rect provider on touch (null on desktop, where scroll only dismisses
   * playback). Idempotent — attaches the window listeners once.
   */
  private _startTracking(getRect: RectProvider | null): void {
    this._trackGetRect = getRect;
    this._scrollAnchor.start();
  }

  /** Detaches scroll tracking and clears its transient state. */
  private _stopTracking(): void {
    this._scrollAnchor.stop();
    this._trackGetRect = null;
  }

  /**
   * One throttled scroll frame. Touch: reposition the bubble to its card and
   * stop committed playback once the card is fully off-screen. Desktop: dismiss
   * committed playback once scrolled past the threshold.
   */
  private _onScrollFrame(): void {
    if (!this._container.isVisible) {
      this._stopTracking();
      return;
    }

    if (this._coarsePointer()) {
      if (this._trackGetRect) {
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
   * Applies size + type/kind metadata to the container. Size is exposed to CSS
   * via `--preview-w/h`; `data-type`/`data-kind` are logical state (not shape —
   * shape lives in the active Face). Applying it while hidden is a visual no-op.
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
    if (kind === 'album') {
      const cover = this._coarsePointer() ? ALBUM_COVER_TOUCH : ALBUM_COVER;
      this._wrapper.style.setProperty('--album-cover', `${cover}px`);
    }
  }

  /**
   * Activates the Face for a kind: the album Presentation's Face, or the default
   * round Face for plain kinds. Retires any previously active Presentation.
   */
  private _applyFace(kind: MediaKind | undefined, cover?: string): void {
    const next = (kind && this._presentations[kind]) || null;
    if (this._activePresentation && this._activePresentation !== next) {
      this._activePresentation.deactivate();
    }
    this._activePresentation = next;
    if (next) {
      next.loadCover(cover ?? null);
      next.activate();
      this._roundFace.classList.remove('is-active');
    } else {
      this._roundFace.classList.add('is-active');
    }
  }

  /** Loads the media (if it changed), activates its Channel, and shows the bubble. */
  private _reveal(src: string, type: MediaType): void {
    const isSameMedia = this._currentSrc === src && this._currentType === type;

    if (!isSameMedia) {
      const channel = this._channels[type];
      // Exactly one channel is visible at a time: retire the outgoing one.
      if (this._active && this._active !== channel) this._active.deactivate();
      channel.load(src);
      channel.activate();

      this._active = channel;
      this._currentSrc = src;
      this._currentType = type;
    }

    this._show();
  }

  /**
   * Shows the container. `is-visible` drives a CSS transition on scale + opacity
   * only (never geometry), which interrupts cleanly on a fast hover in/out —
   * adding it while already visible is an idempotent no-op (warm swap).
   */
  private _show(): void {
    this._container.show();
  }

  /**
   * Repositions the glimpse to a new cursor point during mousemove. No-op while
   * playback is committed — the anchored bubble stays put.
   */
  move(trigger: PreviewTrigger, cursor: { x: number; y: number }): void {
    if (this._isPlaying) return;
    this._ensureAttached();
    this._cursor = cursor;
    this._setPosition({ x: cursor.x, y: cursor.y, placement: trigger.placement, triggerRect: trigger.getRect() });
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

    if (!this._container.isVisible) {
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
   * Pauses any playing media, stops the Presentation's play animation, and
   * clears the playing state — WITHOUT hiding the bubble; callers decide whether
   * to hide or retarget.
   */
  private _stopPlayback(): void {
    const wasPlaying = this._isPlaying;
    const stoppedSrc = this._currentSrc;

    this._pauseAllMedia();
    this._activePresentation?.stop();

    this._isPlaying = false;
    this._anchorRect = null;
    const kind = this._wrapper.dataset.kind as MediaKind | undefined;
    // Album keeps its fixed box; other kinds shrink back to the glimpse circle.
    this._applyMeta(this._currentType ?? 'image', kind, kind === 'album' ? this._albumBox() : GLIMPSE_SIZE);

    // Playback can end without the owning card knowing (scroll-out, dismiss, or
    // another card taking over). Announce it so that card can drop aria-pressed.
    if (wasPlaying && stoppedSrc && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(SharedMediaPreview.STOPPED_EVENT, { detail: { src: stoppedSrc } }));
    }
  }

  /**
   * Collapses the bubble, then tears down its visuals once it is hidden. Only
   * scale + opacity animate, so the bubble keeps its current shape/artwork
   * *through* the collapse; the shape/kind/src reset waits for the generation
   * guard to confirm nothing newer superseded this hide.
   */
  private _doHide(): void {
    const gen = ++this._gen;
    this._cancelLinger();
    this._pauseAllMedia();
    this._stopTracking();

    void this._container.hide().then(() => {
      if (gen === this._gen) this._teardown();
    });
  }

  /**
   * Resets the hidden bubble's visuals: retire the active Channel + Face and
   * clear the kind/size/src. Runs only while the bubble is invisible (after a
   * collapse), so the geometry it changes is never seen.
   */
  private _teardown(): void {
    this._active?.deactivate();
    this._active = null;
    this._activePresentation?.deactivate();
    this._activePresentation = null;
    this._roundFace.classList.remove('is-active');
    delete this._wrapper.dataset.kind;
    this._wrapper.style.removeProperty('--album-cover');
    this._currentSrc = null;
    this._currentType = null;
  }

  /** Pauses every channel's media (no-op for the image channel). */
  private _pauseAllMedia(): void {
    for (const type of ['image', 'video', 'audio'] as const) {
      this._channels[type].pause();
    }
  }

  /** Starts playback on the active channel (a no-op for the image channel). */
  private _startCurrentMedia(): void {
    const result = this._active?.play();
    if (result) {
      result.catch((error) => {
        console.warn('[SharedMediaPreview] Preview playback failed', error);
      });
    }
  }

  /**
   * Positions the anchored bubble beside its trigger rect. Falls back to
   * viewport-centered if no rect was captured at play time.
   */
  private _positionAnchored(): void {
    // Prefer the live rect (touch follow) over the play-time snapshot. A null
    // rect with the anchored placement resolves to viewport-center inside
    // `computePreviewPosition` (the play-commit fallback).
    const rect = this._trackGetRect?.() ?? this._anchorRect;

    this._setPosition({
      x: rect ? rect.left + rect.width / 2 : 0,
      y: rect ? rect.top + rect.height / 2 : 0,
      placement: this._anchorPlacement,
      triggerRect: rect,
    });
  }

  /**
   * Resolves the bubble position (pure geometry, see `previewGeometry.ts`) and
   * writes it to the `--preview-x/y` CSS variables. The Container reads them via
   * the `translate` property, leaving `scale`/`opacity` free for WAAPI.
   */
  private _setPosition({ x, y, placement = 'cursor', triggerRect, unclampY = false }: PositionOptions): void {
    const { x: eixoX, y: eixoY } = computePreviewPosition({
      placement,
      triggerRect: triggerRect ?? null,
      cursor: { x, y },
      size: this._currentSize,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      unclampY,
    });

    this._wrapper.style.setProperty('--preview-x', `${eixoX}px`);
    this._wrapper.style.setProperty('--preview-y', `${eixoY}px`);
  }
}
