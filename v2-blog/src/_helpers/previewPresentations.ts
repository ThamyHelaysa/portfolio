import type { MediaKind } from './sharedPreview.ts';

/**
 * A media presentation is the per-{@link MediaKind} *visual* treatment inside
 * the shared preview bubble (ADR 0005) — the counterpart to a {@link
 * import('./previewChannels.ts').MediaChannel}. A Channel owns *how the media
 * plays* (per preview-type); a Presentation owns *how the kind looks* (per
 * media-kind).
 *
 * Most kinds have no Presentation: the Channel's own media shows through,
 * cropped into the round bubble. `album` has one — a square Cover with a
 * pure-CSS vinyl disc that slides out and spins on commit. Its state
 * transitions (peek → slide → spin) are pure CSS keyed on the wrapper's
 * `is-visible` / `is-playing` classes; this element only supplies the DOM and
 * the Cover source.
 */
export interface MediaPresentation {
  readonly kind: MediaKind;
  /** The layer container to append into the bubble wrapper. */
  readonly el: HTMLElement;
  /** Point the Cover at a source (null clears it), resetting the blur-in. */
  loadCover(src: string | null): void;
  /** Reveal this presentation's layers (`visible`). */
  activate(): void;
  /** Hide them. */
  deactivate(): void;
}

const VISIBLE = 'visible';
const LOADED = 'is-loaded';

/**
 * The `album` Presentation: a square Cover (`<img>`) with a pure-CSS vinyl disc
 * (`<div>`) as a sibling layer. At rest the disc peeks ~40% from behind the
 * Cover; on commit (`#mediaPreview.is-playing`) CSS slides it out, lifts it to
 * the front, and spins its sheen. The disc carries no image — its grooves,
 * label, and sheen are drawn in CSS and derive from the theme accent.
 */
export class AlbumPresentation implements MediaPresentation {
  readonly kind = 'album';
  readonly el: HTMLDivElement;
  private _cover: HTMLImageElement;

  constructor() {
    this.el = document.createElement('div');
    this.el.className = 'album-presentation';

    this._cover = document.createElement('img');
    this._cover.className = 'album-cover';
    this._cover.alt = '';
    // Blur-in: the Cover stays frosted until it decodes; `error` also clears it
    // so a failed load never leaves it permanently blurred (mirrors ImageChannel).
    const markLoaded = () => this._cover.classList.add(LOADED);
    this._cover.addEventListener('load', markLoaded);
    this._cover.addEventListener('error', markLoaded);

    const vinyl = document.createElement('div');
    vinyl.className = 'album-vinyl';

    this.el.append(this._cover, vinyl);
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
    this.el.classList.add(VISIBLE);
  }

  deactivate(): void {
    this.el.classList.remove(VISIBLE);
  }
}

/** A registry keyed by kind; kinds with no entry render as a plain glimpse. */
export type MediaPresentations = Partial<Record<MediaKind, MediaPresentation>>;

/** Builds the presentations that exist today. Only `album` has one (ADR 0005). */
export function createMediaPresentations(): MediaPresentations {
  return {
    album: new AlbumPresentation(),
  };
}
