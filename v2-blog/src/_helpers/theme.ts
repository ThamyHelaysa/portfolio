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
  applyTheme(theme);
  window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, { detail: { theme } }));
}
