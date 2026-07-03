/**
 * Session-scoped persistence of the terminal's command history (issue #93).
 *
 * Scope deliberately narrowed from the original continuity store (#79): the
 * modal terminal no longer auto-reopens after navigation, so the open flag and
 * the scrollback are gone. Only the command history survives a full-page
 * navigation, so arrow-up recalls earlier commands when the modal is summoned
 * again. Stored in `sessionStorage` (per-tab; no ghost terminal for returning
 * visitors).
 *
 * Dependency-free so `summon.ts` and the overlay can both import it without
 * pulling in heavier terminal code.
 */

/** sessionStorage key holding the serialized history snapshot. */
export const SESSION_KEY = "book_os:session";

/**
 * Schema version. Bumped to 2 when the store was narrowed to history-only;
 * legacy v1 continuity blobs are ignored on read.
 */
export const SESSION_VERSION = 2;

/** sessionStorage flag marking that the boot sequence has shown this session. */
export const BOOT_KEY = "book_os:booted";

/** Persisted command-history snapshot. */
interface HistorySnapshot {
  v: number;
  history: string[];
}

/**
 * Whether the terminal's boot flavour should show: true on the first summon of
 * the browser session, false thereafter (it records the flag on the first call).
 *
 * @param storage - Backing store (defaults to `sessionStorage`).
 * @returns `true` exactly once per session.
 */
export function takeFirstBootOfSession(storage: Storage = sessionStorage): boolean {
  try {
    if (storage.getItem(BOOT_KEY) !== null) return false;
    storage.setItem(BOOT_KEY, "1");
    return true;
  } catch {
    return false;
  }
}

/**
 * Validates an untrusted parsed payload into a history array. sessionStorage is
 * user-tamperable (and may hold a legacy #79 blob), so any shape deviation —
 * wrong version, non-array history, or a non-string entry — yields [].
 *
 * @param raw - The `JSON.parse`d storage payload.
 * @returns The history entries, or [] when anything is off.
 */
function validate(raw: unknown): string[] {
  if (!raw || typeof raw !== "object") return [];
  const o = raw as Record<string, unknown>;
  if (o.v !== SESSION_VERSION) return [];
  if (!Array.isArray(o.history) || !o.history.every((h) => typeof h === "string")) return [];
  return o.history as string[];
}

/**
 * A thin, defensive wrapper over a `Storage` holding the command history.
 */
export class TerminalSession {
  private storage: Storage;
  private key: string;

  /**
   * @param storage - Backing store (defaults to `sessionStorage`).
   * @param key - Storage key (defaults to {@link SESSION_KEY}).
   */
  constructor(storage: Storage = sessionStorage, key: string = SESSION_KEY) {
    this.storage = storage;
    this.key = key;
  }

  /**
   * Reads the persisted command history.
   *
   * @returns The history (oldest first), or [] when absent/malformed/legacy.
   */
  readHistory(): string[] {
    let raw: string | null = null;
    try {
      raw = this.storage.getItem(this.key);
    } catch {
      return [];
    }
    if (raw === null) return [];

    try {
      return validate(JSON.parse(raw));
    } catch {
      return [];
    }
  }

  /**
   * Persists the command history, replacing any prior snapshot.
   *
   * @param history - The command lines, oldest first.
   */
  writeHistory(history: string[]): void {
    const snap: HistorySnapshot = {
      v: SESSION_VERSION,
      history: Array.isArray(history) ? [...history] : [],
    };
    try {
      this.storage.setItem(this.key, JSON.stringify(snap));
    } catch {
      // storage full or unavailable — history recall is best-effort
    }
  }
}
