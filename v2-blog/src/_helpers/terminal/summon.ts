/**
 * Tests whether a keyboard event is the terminal summon combo (Ctrl/Cmd + Shift + C).
 *
 * Matches on `event.code` ("KeyC") rather than `event.key` so the combo is
 * independent of keyboard layout and the OS-dependent casing of the produced
 * character. Callers must NOT preventDefault on a match: on Windows/Linux the
 * browser opens DevTools alongside the terminal, which is intended.
 *
 * @param event - The keydown event to test.
 * @returns `true` when the event is the summon combo.
 */
export function matchesSummonCombo(event: KeyboardEvent): boolean {
  return (event.ctrlKey || event.metaKey) && event.shiftKey && event.code === "KeyC";
}

/** Custom element tag for the lazily-loaded overlay. */
const OVERLAY_TAG = "terminal-overlay";
/** Built URL of the overlay bundle, lazy-loaded on first summon. */
const OVERLAY_SRC = "/components/terminal-overlay.js";

/**
 * Installs the site-wide terminal summoner on a window.
 *
 * Listens (capture phase) for the summon combo and, on the first match,
 * lazy-loads the overlay bundle and mounts a single `<terminal-overlay>`.
 * Never calls preventDefault: on Windows/Linux DevTools opens alongside the
 * terminal, which is intended.
 *
 * @param target - The window to attach the listener to (defaults to `window`).
 * @returns A disposer that removes the listener.
 */
export function createSummoner(target: Window = window): () => void {
  const doc = target.document;
  let overlayEl: HTMLElement | null = null;
  let scriptInjected = false;

  /** Lazily loads the overlay bundle and mounts the element once. */
  const ensureOverlay = (): HTMLElement => {
    if (!scriptInjected) {
      scriptInjected = true;
      const script = doc.createElement("script");
      script.type = "module";
      script.src = OVERLAY_SRC;
      doc.head.appendChild(script);
    }

    if (!overlayEl) {
      overlayEl = doc.createElement(OVERLAY_TAG);
      doc.body.appendChild(overlayEl);
    }

    return overlayEl;
  };

  /** Opens the overlay on a matching combo without suppressing the event. */
  const onKeydown = (event: KeyboardEvent): void => {
    if (!matchesSummonCombo(event)) return;
    ensureOverlay().setAttribute("open", "");
  };

  target.addEventListener("keydown", onKeydown, true);

  return () => target.removeEventListener("keydown", onKeydown, true);
}
