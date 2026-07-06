import type { MediaKind } from './sharedPreview.ts';
import { animator } from './animationManager.ts';

/**
 * A media presentation is the per-{@link MediaKind} *visual* treatment inside
 * the preview Container (ADR 0005/0006), realized as a **Face**. A Channel owns
 * *how the media plays* (per preview-type); a Presentation owns *how the kind
 * looks* (per media-kind) — its Face DOM and its own play/stop animation.
 *
 * Plain kinds have no bespoke Presentation: they render into the default round
 * Face (the singleton frames the visual Channel there). `album` has one — a
 * square Cover with a pure-CSS vinyl disc that, on commit, lifts to the front
 * and slides to overlap the Cover's right half while its sheen spins.
 */
export interface MediaPresentation {
  readonly kind: MediaKind;
  /** The Face container to append into the Container. */
  readonly el: HTMLElement;
  /** Point the Cover at a source (null clears it), resetting the blur-in. */
  loadCover(src: string | null): void;
  /** Mount this Face as the active one. */
  activate(): void;
  /** Unmount it and reset any transient animation state. */
  deactivate(): void;
  /** Commit: run the kind's play animation. Skips motion under reduced motion. */
  play(opts: { reducedMotion: boolean }): void | Promise<void>;
  /** Stop: reverse the play animation back to the resting Face. */
  stop(): void;
}

const ACTIVE = 'is-active';
const LOADED = 'is-loaded';
const FRONT = 'is-front';
const SPINNING = 'is-spinning';

/**
 * The commit is a two-step sequence (ADR 0006): the record is first pulled fully
 * OUT of the Cover to the right, then — once that finishes — brought back to sit
 * CENTERED in front of the Cover, spinning. Like sliding a record out of its
 * sleeve and dropping it on the deck.
 */
const DISC_REST = 'translate(40%, -50%)';
const DISC_OUT = 'translate(115%, -50%)';
const DISC_CENTER = 'translate(0%, -50%) scale(1.05)';
/** Step 1 (pull out) and step 2 (place, centered) durations + easings. */
const PULL_MS = 340;
const PULL_EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';
const PLACE_MS = 440;
const PLACE_EASE = 'cubic-bezier(0.34, 1.2, 0.64, 1)';

/**
 * The `album` Presentation. Its Face is a square Cover (`<img>`) with a pure-CSS
 * vinyl disc (`<div>`). At rest the disc peeks from behind the Cover; `play()`
 * flips it to the front, slides it out to overlap the Cover, and spins its sheen
 * (CSS, toggled by `is-spinning`). The slide is a WAAPI tween via the shared
 * `animationManager` (reduced motion → no motion, disc stays at rest).
 */
export class AlbumPresentation implements MediaPresentation {
  readonly kind = 'album';
  readonly el: HTMLDivElement;
  private _cover: HTMLImageElement;
  private _disc: HTMLDivElement;
  /** Bumped on every play/stop/deactivate so a stale step-2 can't resume. */
  private _playGen = 0;

  constructor() {
    this.el = document.createElement('div');
    this.el.className = 'album-face';

    this._cover = document.createElement('img');
    this._cover.className = 'album-cover';
    this._cover.alt = '';
    // Blur-in: the Cover stays frosted until it decodes; `error` also clears it
    // so a failed load never leaves it permanently blurred (mirrors ImageChannel).
    const markLoaded = () => this._cover.classList.add(LOADED);
    this._cover.addEventListener('load', markLoaded);
    this._cover.addEventListener('error', markLoaded);

    this._disc = document.createElement('div');
    this._disc.className = 'album-vinyl';

    this.el.append(this._cover, this._disc);
  }

  loadCover(src: string | null): void {
    if (!src) {
      this._cover.removeAttribute('src');
      this._cover.classList.remove(LOADED);
      return;
    }
    if (this._cover.getAttribute('src') === src) return;
    this._cover.classList.remove(LOADED);
    this._cover.src = src;
    // Cached image fires no load event — mark it ready at once.
    if (this._cover.complete && this._cover.naturalWidth > 0) this._cover.classList.add(LOADED);
  }

  activate(): void {
    this.el.classList.add(ACTIVE);
  }

  deactivate(): void {
    // Reset all play state so the next reveal starts from the resting Face.
    this._playGen++;
    this.el.classList.remove(ACTIVE, SPINNING);
    this._disc.classList.remove(FRONT);
    animator.cancel(this._disc);
    this._disc.style.transform = '';
  }

  /**
   * Commit: a two-step record-out-then-place sequence (ADR 0006). Step 2 only
   * runs once step 1 has fully finished; a stop/deactivate mid-sequence bumps
   * `_playGen` so the awaited step 2 bails.
   */
  async play({ reducedMotion }: { reducedMotion: boolean }): Promise<void> {
    const gen = ++this._playGen;

    // Reduced motion: audio only — the disc stays at its resting peek, no slide,
    // no spin, no snap (ADR 0005/0006).
    if (reducedMotion) return;

    // Flip to the front so the record reads as being in front of the Cover.
    this._disc.classList.add(FRONT);

    // Step 1: pull the record fully out of the Cover, to the right.
    await animator.animate(this._disc, [{ transform: DISC_OUT }], { duration: PULL_MS, easing: PULL_EASE });
    if (gen !== this._playGen) return; // stopped mid-pull

    // Step 2: bring it back centered in front of the Cover, spinning.
    this.el.classList.add(SPINNING);
    await animator.animate(this._disc, [{ transform: DISC_CENTER }], { duration: PLACE_MS, easing: PLACE_EASE });
  }

  stop(): void {
    this._playGen++; // invalidate any in-flight play sequence
    this.el.classList.remove(SPINNING);
    if (!this._disc.classList.contains(FRONT)) return;
    // Slide back behind the Cover from wherever it is, then drop the front z.
    void animator
      .animate(this._disc, [{ transform: DISC_REST }], { duration: PULL_MS, easing: 'ease' })
      .then(() => this._disc.classList.remove(FRONT));
  }
}

/** A registry keyed by kind; kinds with no entry render in the default round Face. */
export type MediaPresentations = Partial<Record<MediaKind, MediaPresentation>>;

/** Builds the presentations that exist today. Only `album` has one (ADR 0005). */
export function createMediaPresentations(): MediaPresentations {
  return {
    album: new AlbumPresentation(),
  };
}
