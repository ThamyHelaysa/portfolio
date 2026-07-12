/**
 * Identity reveal animation: a rAF scramble that resolves into the final
 * identity text, followed by a short WAAPI glitch pass. Presentation only —
 * it knows nothing about how identities are generated or stored (that's
 * `identityManager` behind the `identity.ts` seam); it just animates whatever
 * string it's given into whatever element it's given.
 *
 * Per-element bookkeeping lives in module-scoped WeakMaps so re-triggering a
 * reveal on the same element cancels the previous run, and a disconnected
 * element snaps to its final text instead of leaking frames.
 */

const revealRaf = new WeakMap<HTMLElement, number>();
const glitchAnim = new WeakMap<HTMLElement, Animation>();

/**
 * Cancels any pending reveal frame for an element and snaps its content to the final text.
 *
 * @param element - The element being updated by the reveal animation.
 * @param finalText - The final resolved identity text.
 */
function snapToFinalText(element: HTMLElement, finalText: string): void {
  const prev = revealRaf.get(element);
  if (prev != null) {
    cancelAnimationFrame(prev);
    revealRaf.delete(element);
  }

  element.textContent = finalText;
}

/**
 * Cancels any active glitch animation for an element and clears its temporary inline styles.
 *
 * @param element - The element that may own a glitch animation.
 */
function cancelGlitchAnimation(element: HTMLElement): void {
  const prev = glitchAnim.get(element);
  if (prev) {
    prev.cancel();
    glitchAnim.delete(element);
  }

  element.style.textShadow = "";
  element.style.transform = "";
}

/**
 * Runs the short glitch animation used after the reveal settles.
 * The helper exits early for reduced-motion users and disconnected elements.
 *
 * @param element - The element that should receive the glitch effect.
 */
function triggerGlitchAnimation(element: HTMLElement): void {
  if (!element) return;

  const reduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

  if (reduceMotion) return;

  if (!element.isConnected) {
    cancelGlitchAnimation(element);
    return;
  }

  cancelGlitchAnimation(element);

  const keyframes: Keyframe[] = [
    { textShadow: "2px 0 #ff453a, -2px 0 #00ffff", transform: "translate(2px, 0)" },
    { textShadow: "-2px 0 #ff453a, 2px 0 #00ffff", transform: "translate(-2px, 0)" },
    { textShadow: "1px 0 #ff453a, -1px 0 #00ffff", transform: "translate(1px, 0)" },
    { textShadow: "-1px 0 #ff453a, 1px 0 #00ffff", transform: "translate(-1px, 0)" },
    { textShadow: "none", transform: "translate(0, 0)" },
  ];

  const anim = element.animate(keyframes, {
    duration: 220,
    iterations: 2,
    easing: "steps(2, end)",
    fill: "none",
  });

  glitchAnim.set(element, anim);

  /**
   * Clears the glitch bookkeeping and inline styles once the animation stops.
   */
  const cleanup = () => {
    cancelGlitchAnimation(element);
  };

  anim.addEventListener("finish", cleanup, { once: true });
  anim.addEventListener("cancel", cleanup, { once: true });
}

/**
 * Reveals the final identity text through a scramble animation and then triggers the glitch pass.
 * If the element disconnects, the text is snapped to the final value and stale work is canceled.
 *
 * @param element - The element whose text content should animate.
 * @param finalText - The final identity string to reveal.
 */
export function animateIdentityReveal(element: HTMLElement, finalText: string): void {
  if (!element) return;

  const reduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

  if (reduceMotion) {
    snapToFinalText(element, finalText);
    triggerGlitchAnimation(element);
    return;
  }

  const charset = "abcdefghijklmnopqrstuvwxyz0123456789";
  const durationMs = 800;

  const prev = revealRaf.get(element);
  if (prev != null) cancelAnimationFrame(prev);
  cancelGlitchAnimation(element);

  const finalChars = Array.from(finalText); // handles unicode better than split('')
  const len = finalChars.length;

  const isSpace = finalChars.map(c => c === " ");

  let start = 0;

  /**
   * Advances the scramble animation by one frame until the final text is fully revealed.
   *
   * @param now - The high-resolution RAF timestamp for the current frame.
   */
  const tick = (now: number) => {
    if (!element.isConnected) {
      snapToFinalText(element, finalText);
      cancelGlitchAnimation(element);
      return;
    }

    if (!start) start = now;
    const elapsed = now - start;

    // norm progress 0..1
    const t = Math.min(1, elapsed / durationMs);
    const eased = 1 - Math.pow(1 - t, 3); // easeoutcubic

    const revealCount = Math.floor(len * eased);

    // creates one string per frame
    let out = "";
    for (let i = 0; i < len; i++) {
      if (i < revealCount) out += finalChars[i];
      else if (isSpace[i]) out += " ";
      else out += charset[(Math.random() * charset.length) | 0];
    }

    element.textContent = out;

    if (t < 1) {
      const id = requestAnimationFrame(tick);
      revealRaf.set(element, id);
    } else {
      snapToFinalText(element, finalText);
      triggerGlitchAnimation(element);
    }
  };

  const id = requestAnimationFrame(tick);
  revealRaf.set(element, id);
}
