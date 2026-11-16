/**
 * Scramble-in effect for `[data-scramble]` elements: titles on load (#207),
 * nav links on hover/focus via `[data-scramble="hover"]` (#208).
 *
 * The real text never changes: it stays in flow (text fill made transparent via CSS on
 * `[data-scramble="running"]`) so it keeps reserving its box and stays the
 * accessible text. An `aria-hidden` absolute layer on top scrambles into the
 * final string and is removed when done. Writes only `textContent`.
 */
import { prefersReducedMotion } from "./motion.ts";

const GLYPHS = "abcdefghijklmnopqrstuvwxyz0123456789";
const DURATION_MS = 700;

/**
 * One scramble frame at progress `t` (0..1): resolves left to right with an
 * ease-out cubic, whitespace kept, unresolved chars random. Shared with
 * `identityReveal.ts`.
 */
export function scrambleFrame(chars: string[], t: number): string {
  const revealed = Math.floor(chars.length * (1 - Math.pow(1 - t, 3)));
  return chars
    .map((char, i) =>
      i < revealed || /\s/.test(char) ? char : GLYPHS[(Math.random() * GLYPHS.length) | 0],
    )
    .join("");
}

/** Plain-text elements only (no element children). Any character is fine: frames are written via `textContent`. */
export function isScrambleable(el: Element): boolean {
  return el.childElementCount === 0 && (el.textContent ?? "").trim() !== "";
}

/** Cancels the in-flight run per element, so a re-trigger restarts cleanly. */
const running = new WeakMap<HTMLElement, () => void>();

/**
 * Runs the scramble-in once on `el`. Re-triggering while a run is in flight
 * restarts it. No-op under reduced motion and for elements the guard rejects.
 */
export function scrambleIn(el: HTMLElement): void {
  running.get(el)?.();
  if (prefersReducedMotion() || !isScrambleable(el)) return;

  const finalText = el.textContent ?? "";
  const finalChars = Array.from(finalText);
  const layer = document.createElement("span");
  layer.className = "scramble-layer";
  layer.setAttribute("aria-hidden", "true");
  // Filled before append so the title never blanks for a frame.
  layer.textContent = finalText;

  const previous = el.dataset.scramble ?? "";
  el.dataset.scramble = "running";
  el.append(layer);

  let frame = 0;
  /** Stops the loop, removes the layer and restores the host's original attribute value. */
  const finish = () => {
    cancelAnimationFrame(frame);
    layer.remove();
    el.dataset.scramble = previous;
    running.delete(el);
  };
  running.set(el, finish);

  let start: number | undefined;
  /** Writes one scrambled frame into the layer. */
  const tick = (now: number) => {
    if (!el.isConnected) return finish();
    start ??= now;
    const t = Math.min(1, (now - start) / DURATION_MS);
    layer.textContent = scrambleFrame(finalChars, t);

    if (t < 1) frame = requestAnimationFrame(tick);
    else finish();
  };

  frame = requestAnimationFrame(tick);
}

const FINE_POINTER = "(hover: hover) and (pointer: fine)";

/**
 * Scrambles `el` on hover and on keyboard focus (`:focus-visible`), only on
 * fine-pointer devices; touch gets nothing. Used by `[data-scramble="hover"]`.
 */
export function bindHoverScramble(el: HTMLElement): void {
  const run = () => {
    if (window.matchMedia?.(FINE_POINTER)?.matches) scrambleIn(el);
  };
  el.addEventListener("pointerenter", run);
  el.addEventListener("focus", () => {
    if (el.matches(":focus-visible")) run();
  });
}
