/**
 * Shared theme state (issue #81). The single source of truth for the site's
 * `pinky` / `dark` themes, used by both `<theme-toggle>` and the terminal's
 * `theme` command so the two never diverge. Switching dispatches a
 * `theme-change` event other surfaces listen for to update their own UI.
 */

/** The two site themes; the value doubles as the stored string and class. */
export type Theme = "pinky" | "dark";

/** localStorage key holding the chosen theme (shared with the legacy toggle). */
export const THEME_STORAGE_KEY = "theme";

/** Window event dispatched on every theme change, with `{ theme }` detail. */
export const THEME_CHANGE_EVENT = "theme-change";

/** Whether a value is a valid theme. */
function isTheme(value: unknown): value is Theme {
  return value === "pinky" || value === "dark";
}

/**
 * The stored theme, or null when absent/invalid.
 *
 * @returns The saved theme or null.
 */
export function getStoredTheme(): Theme | null {
  let saved: string | null = null;
  try {
    saved = localStorage.getItem(THEME_STORAGE_KEY);
  } catch {
    return null;
  }
  return isTheme(saved) ? saved : null;
}

/**
 * The effective theme: the saved choice, else the system colour-scheme.
 *
 * @returns The theme to render.
 */
export function getTheme(): Theme {
  const saved = getStoredTheme();
  if (saved) return saved;
  return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ? "dark" : "pinky";
}

/**
 * Applies a theme to the document (no persistence, no event).
 *
 * @param theme - The theme to apply.
 */
export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.classList.toggle("dark", theme === "dark");
}

/**
 * Runs `applyTheme` inside a top-down clip-path view transition when the
 * browser supports the View Transitions API and the user hasn't asked for
 * reduced motion. Otherwise applies the theme instantly (current behaviour).
 *
 * @param theme - The theme to switch to.
 */
function applyThemeAnimated(theme: Theme): void {
  const root = document.documentElement;

  // Theme already applied or mid-swap — this is an echo (e.g. a second
  // <theme-toggle> re-broadcasting through setTheme after the theme-change
  // event). Starting another view transition would skip the running one and
  // yank the .theme-vt class off mid-sweep, so bail before animating.
  // The pending flag lives on the DOM (not in a module variable) because
  // esbuild bundles this helper separately into every component — the
  // terminal-overlay and theme-toggle copies don't share module state, and a
  // module-level guard lets the cross-bundle echo start a second transition
  // that skips the first and strips .theme-vt mid-capture (the overlay
  // z-index bug). A dataset flag is the same for every copy. It's also
  // needed at all because applyTheme runs inside the async view transition
  // callback, so dataset.theme is still stale when echoes arrive.
  if (root.dataset.theme === theme || root.dataset.themePending === theme) return;

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (!document.startViewTransition || prefersReducedMotion) {
    applyTheme(theme);
    return;
  }

  root.dataset.themePending = theme;
  root.classList.add("theme-vt");

  const transition = document.startViewTransition(() => applyTheme(theme));
  transition.finished.finally(() => {
    // Only clean up if a newer swap hasn't taken over (rapid re-toggle skips
    // this transition, and its own finally must not undo the newer one).
    if (root.dataset.themePending === theme) {
      delete root.dataset.themePending;
      root.classList.remove("theme-vt");
    }
  });
  transition.ready
    .then(() => {
      root.animate(
        { clipPath: ["inset(0 0 100% 0)", "inset(0)"] },
        { pseudoElement: "::view-transition-new(root)", duration: 600, easing: "ease" }
      );
    })
    .catch(() => {
      // Transition skipped (e.g. another swap interrupted it) — theme already applied.
    });
}

/**
 * Sets the theme everywhere: persists it, applies it to the document, and
 * notifies listeners via {@link THEME_CHANGE_EVENT}.
 *
 * @param theme - The theme to switch to.
 */
export function setTheme(theme: Theme): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // storage unavailable — still apply for this page view
  }
  applyThemeAnimated(theme);
  window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, { detail: { theme } }));
}
