/**
 * Session-scoped persistence for the terminal overlay: it survives full-page
 * MPA navigations within a tab so the overlay can reopen mid-session with its
 * scrollback and history intact (issue #79). Stored in `sessionStorage` (not
 * local) on purpose — no ghost terminal for visitors returning days later.
 *
 * Deliberately dependency-free: `summon.ts`, a tiny eager script on every page,
 * imports this to decide whether to auto-restore. Pulling in `core.ts` (and
 * thus gsap) here would bloat that critical-path bundle, so the log-line kind
 * is validated as a bare number range mirroring `CommandType`, not imported.
 */

/** sessionStorage key holding the serialized session snapshot. */
export const SESSION_KEY = "book_os:session";

/** Schema version; a snapshot with any other version is discarded on read. */
export const SESSION_VERSION = 1;

/** Maximum scrollback lines retained; older lines are dropped on append. */
export const LOG_CAP = 100;

/** Valid `CommandType` ordinals (log, logdata, command, title, error, status). */
const VALID_KINDS = new Set([0, 1, 2, 3, 4, 5]);

/** One persisted scrollback line: text plus its `CommandType` ordinal. */
export interface LogLine {
  t: string;
  k: number;
}

/** A full terminal session snapshot persisted across a page navigation. */
export interface SessionSnapshot {
  v: number;
  open: boolean;
  history: string[];
  log: LogLine[];
}

/** An empty, closed snapshot used as the base for the first write. */
function emptySnapshot(): SessionSnapshot {
  return { v: SESSION_VERSION, open: false, history: [], log: [] };
}

/**
 * Validates an untrusted parsed payload into a snapshot. sessionStorage is
 * user-tamperable, so any shape deviation — wrong version, non-array fields,
 * a non-string line/history entry, or an unknown kind — discards the whole
 * blob (returns null) rather than partially trusting it.
 *
 * @param raw - The `JSON.parse`d storage payload.
 * @returns A well-formed snapshot, or null when anything is off.
 */
function validate(raw: unknown): SessionSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;

  if (o.v !== SESSION_VERSION) return null;
  if (typeof o.open !== "boolean") return null;
  if (!Array.isArray(o.history) || !Array.isArray(o.log)) return null;

  if (!o.history.every((h) => typeof h === "string")) return null;

  const log: LogLine[] = [];
  for (const line of o.log) {
    if (!line || typeof line !== "object") return null;
    const l = line as Record<string, unknown>;
    if (typeof l.t !== "string" || typeof l.k !== "number" || !VALID_KINDS.has(l.k)) return null;
    log.push({ t: l.t, k: l.k });
  }

  return { v: SESSION_VERSION, open: o.open, history: o.history as string[], log };
}

/**
 * A thin, defensive wrapper over a `Storage` holding the terminal session.
 * Writes are eager (read-modify-write per change) so a navigation at any
 * instant — terminal-driven or a plain link click — already has current state.
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
   * Reads and validates the stored snapshot.
   *
   * @returns The snapshot, or null when absent, malformed, or tampered.
   */
  read(): SessionSnapshot | null {
    let raw: string | null = null;
    try {
      raw = this.storage.getItem(this.key);
    } catch {
      return null;
    }
    if (raw === null) return null;

    try {
      return validate(JSON.parse(raw));
    } catch {
      return null;
    }
  }

  /** Sets the open flag, preserving history and log. */
  setOpen(open: boolean): void {
    const snap = this.read() ?? emptySnapshot();
    snap.open = open;
    this.write(snap);
  }

  /** Replaces the recall history, preserving the open flag and log. */
  setHistory(history: string[]): void {
    const snap = this.read() ?? emptySnapshot();
    snap.history = Array.isArray(history) ? [...history] : [];
    this.write(snap);
  }

  /** Appends a scrollback line, dropping the oldest beyond {@link LOG_CAP}. */
  appendLine(t: string, k: number): void {
    const snap = this.read() ?? emptySnapshot();
    snap.log.push({ t, k });
    if (snap.log.length > LOG_CAP) snap.log = snap.log.slice(-LOG_CAP);
    this.write(snap);
  }

  /** Removes the stored session (e.g. on close). */
  clear(): void {
    try {
      this.storage.removeItem(this.key);
    } catch {
      // storage unavailable (private mode quota, etc.) — nothing to clear
    }
  }

  /** Serializes a snapshot to storage, swallowing quota/availability errors. */
  private write(snap: SessionSnapshot): void {
    try {
      this.storage.setItem(this.key, JSON.stringify(snap));
    } catch {
      // storage full or unavailable — continuity is best-effort, never fatal
    }
  }
}
