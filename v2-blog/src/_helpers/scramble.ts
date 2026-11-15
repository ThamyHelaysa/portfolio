/**
 * Scramble-in effect for `[data-scramble]` elements (#207).
 *
 * The real text never changes: it stays in flow (made transparent via CSS on
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

/**
 * Runs the scramble-in once on `el`. No-op under reduced motion, for elements
 * the guard rejects, and while a run is already in flight on `el`.
 */
export function scrambleIn(el: HTMLElement): void {
  if (prefersReducedMotion() || el.dataset.scramble === "running" || !isScrambleable(el)) return;

  const finalText = el.textContent ?? "";
  const finalChars = Array.from(finalText);
  const layer = document.createElement("span");
  layer.className = "scramble-layer";
  layer.setAttribute("aria-hidden", "true");
  // Filled before append so the title never blanks for a frame.
  layer.textContent = finalText;
  // The host goes transparent while running; the layer keeps the real colour.
  layer.style.color = getComputedStyle(el).color;

  const previous = el.dataset.scramble ?? "";
  el.dataset.scramble = "running";
  el.append(layer);

  /** Removes the layer and restores the host's original attribute value. */
  const finish = () => {
    layer.remove();
    el.dataset.scramble = previous;
  };

  let start: number | undefined;
  /** Writes one scrambled frame into the layer. */
  const tick = (now: number) => {
    if (!el.isConnected) return finish();
    start ??= now;
    const t = Math.min(1, (now - start) / DURATION_MS);
    layer.textContent = scrambleFrame(finalChars, t);

    if (t < 1) requestAnimationFrame(tick);
    else finish();
  };

  requestAnimationFrame(tick);
}
