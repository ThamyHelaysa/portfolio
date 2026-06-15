/**
 * The cheat-console unlock flag (issue #80). Visiting the books page — the
 * terminal's native habitat — sets this persistent `localStorage` flag, which
 * reveals the site-wide `>_` summon button on every page thereafter.
 *
 * Persistent (localStorage, not session): the discovery is meant to stick
 * across visits. Kept dependency-free so the eager summoner and the books shell
 * can both import it without pulling in heavier terminal code. The pre-paint
 * boot script (`inline-terminal-unlock.js`) hardcodes the same key by necessity
 * (it is inlined raw, not bundled) — keep them in sync.
 */

/** localStorage key holding the unlock flag. */
export const UNLOCK_KEY = "book_os:unlocked";

/**
 * Records that the cheat console has been discovered. Best-effort: storage
 * failures (private mode, blocked cookies) are swallowed.
 *
 * @param storage - Backing store (defaults to `localStorage`).
 */
export function markUnlocked(storage: Storage = localStorage): void {
  try {
    storage.setItem(UNLOCK_KEY, "1");
  } catch {
    // storage unavailable — the keyboard combo still works everywhere
  }
}

/**
 * Whether the cheat console has been unlocked.
 *
 * @param storage - Backing store (defaults to `localStorage`).
 * @returns `true` once the books page has been visited.
 */
export function isUnlocked(storage: Storage = localStorage): boolean {
  try {
    return storage.getItem(UNLOCK_KEY) !== null;
  } catch {
    return false;
  }
}
