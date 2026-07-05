import type { MediaType } from './sharedPreview.ts';

/**
 * A media channel is the per-type playback element behind the shared preview
 * bubble (ADR 0004). One adapter per {@link MediaType} concentrates everything
 * that used to fork on the type across the singleton — element creation, the
 * blur-in (`is-loaded`) wiring, the `visible` toggle, and play/pause.
 *
 * The singleton holds one channel per type and keeps exactly one *active* at a
 * time; switching means `deactivate()` the old, `activate()` the new. Reveal-
 * only images have no-op play/pause; audio has no-op activate/deactivate (its
 * imagery is the wrapper's `data-kind` vinyl, not the element).
 */
export interface MediaChannel {
  readonly type: MediaType;
  /** The element to append into the bubble wrapper. */
  readonly el: HTMLElement;
  /** Point the channel at a source, resetting the blur-in until it loads. */
  load(src: string): void;
  /** Reveal this channel's element (`visible`). */
  activate(): void;
  /** Hide it. */
  deactivate(): void;
  /** Start playback (no-op for images). */
  play(): Promise<void> | void;
  /** Pause playback (no-op for images; guarded for media). */
  pause(): void;
}

const VISIBLE = 'visible';
const LOADED = 'is-loaded';

/** Static image. No playback; the blur-in clears on decode (or error). */
export class ImageChannel implements MediaChannel {
  readonly type = 'image';
  readonly el: HTMLImageElement;

  constructor() {
    this.el = document.createElement('img');
    // Blur-in: CSS keeps fresh media blurred until `is-loaded` lands; `error`
    // also marks it so a failed load never leaves a permanently frosted bubble.
    const markLoaded = () => this.el.classList.add(LOADED);
    this.el.addEventListener('load', markLoaded);
    this.el.addEventListener('error', markLoaded);
  }

  load(src: string): void {
    if (this.el.src === src) return;
    this.el.classList.remove(LOADED);
    this.el.src = src;
    // Cached image: no load event will fire, mark it ready at once.
    if (this.el.complete && this.el.naturalWidth > 0) this.el.classList.add(LOADED);
  }

  activate(): void {
    this.el.classList.add(VISIBLE);
  }

  deactivate(): void {
    this.el.classList.remove(VISIBLE);
  }

  play(): void {}
  pause(): void {}
}

/** Muted, looping, silent clip. Reveals a paused first frame; plays on commit. */
export class VideoChannel implements MediaChannel {
  readonly type = 'video';
  readonly el: HTMLVideoElement;

  constructor() {
    this.el = document.createElement('video');
    this.el.muted = true;
    this.el.loop = true;
    this.el.playsInline = true;
    this.el.preload = 'auto';
    const markLoaded = () => this.el.classList.add(LOADED);
    // Setting src resets readyState, so `canplay` re-marks it — even for cached clips.
    this.el.addEventListener('canplay', markLoaded);
    this.el.addEventListener('error', markLoaded);
  }

  load(src: string): void {
    if (this.el.src === src) return;
    this.el.classList.remove(LOADED);
    this.el.src = src;
  }

  activate(): void {
    this.el.classList.add(VISIBLE);
  }

  deactivate(): void {
    this.el.classList.remove(VISIBLE);
  }

  play(): Promise<void> {
    return this.el.play();
  }

  pause(): void {
    if (!this.el.paused) this.el.pause();
  }
}

/** Looping album audio. No visual — the wrapper's `data-kind` vinyl is the imagery. */
export class AudioChannel implements MediaChannel {
  readonly type = 'audio';
  readonly el: HTMLAudioElement;

  constructor() {
    this.el = document.createElement('audio');
    this.el.loop = true;
    this.el.preload = 'auto';
  }

  load(src: string): void {
    if (this.el.src === src) return;
    this.el.src = src;
  }

  activate(): void {}
  deactivate(): void {}

  play(): Promise<void> {
    return this.el.play();
  }

  pause(): void {
    if (!this.el.paused) this.el.pause();
  }
}

export type MediaChannels = Record<MediaType, MediaChannel>;

/** Builds one channel per media type, ready to append into the bubble wrapper. */
export function createMediaChannels(): MediaChannels {
  return {
    image: new ImageChannel(),
    video: new VideoChannel(),
    audio: new AudioChannel(),
  };
}
