/**
 * The summon chime (issue #81): a short, synthesized ascending arpeggio that
 * plays once per browser session on the first summon, evoking a 2000s game
 * console without sampling any audio. No asset, no network request — built at
 * runtime with the Web Audio API. Skipped under `prefers-reduced-motion`.
 *
 * Per-session (sessionStorage), not once-ever: a returning visitor gets the
 * little reward again on their next visit, but it stays quiet within a session.
 */

/** sessionStorage flag marking that the chime has played this session. */
export const CHIME_KEY = "book_os:chimed";

/** Ascending major triad: C5 → E5 → G5 (Hz). */
const NOTES = [523.25, 659.25, 783.99];
/** Seconds between note onsets. */
const STEP = 0.12;
/** Peak gain — deliberately gentle (a blip, not a startle). */
const PEAK = 0.15;

interface ChimeDeps {
  storage?: Storage;
  prefersReducedMotion?: () => boolean;
  createAudioContext?: () => AudioContext | null;
}

/** Whether the user prefers reduced motion (defaults to the media query). */
function defaultReducedMotion(): boolean {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
}

/** Creates an AudioContext, or null where Web Audio is unavailable. */
function defaultAudioContext(): AudioContext | null {
  const Ctor =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  return Ctor ? new Ctor() : null;
}

/**
 * Plays the celebratory chime if this is the first summon of the session and
 * motion is allowed. Marks the session flag only on a real play, so a
 * reduced-motion or Web-Audio-less visit doesn't burn the moment.
 *
 * @param deps - Injectable storage / motion / audio factory (for testing).
 * @returns `true` if the chime actually played.
 */
export function playFirstSummonChime(deps: ChimeDeps = {}): boolean {
  const storage = deps.storage ?? sessionStorage;
  const prefersReducedMotion = deps.prefersReducedMotion ?? defaultReducedMotion;

  if (prefersReducedMotion()) return false;
  if (hasChimed(storage)) return false;

  const ctx = (deps.createAudioContext ?? defaultAudioContext)();
  if (!ctx) return false;

  synthesize(ctx);
  markChimed(storage);
  return true;
}

/** Whether the chime has already played this session. */
function hasChimed(storage: Storage): boolean {
  try {
    return storage.getItem(CHIME_KEY) !== null;
  } catch {
    return false;
  }
}

/** Records that the chime has played. */
function markChimed(storage: Storage): void {
  try {
    storage.setItem(CHIME_KEY, "1");
  } catch {
    // storage unavailable — worst case the chime can play again; harmless
  }
}

/**
 * Schedules the three-note arpeggio: a triangle oscillator per note through a
 * gain envelope (fast attack, exponential release) so it reads as a warm blip.
 *
 * @param ctx - The audio context to play into.
 */
function synthesize(ctx: AudioContext): void {
  if (ctx.state === "suspended") void ctx.resume?.();
  const t0 = ctx.currentTime;

  NOTES.forEach((freq, i) => {
    const start = t0 + i * STEP;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, start);

    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(PEAK, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.22);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + 0.24);
  });
}
