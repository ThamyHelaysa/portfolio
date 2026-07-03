/**
 * Input history for a terminal prompt with ArrowUp/ArrowDown semantics.
 * The index sits one past the newest entry after a submit, mirroring a shell.
 */
export class CommandHistory {
  private entries: string[] = [];
  private index = 0;

  /**
   * Records a submitted command and resets the cursor past the newest entry.
   *
   * @param cmd - The normalized command line that was executed.
   */
  push(cmd: string): void {
    if (this.entries[this.entries.length - 1] !== cmd) {
      this.entries.push(cmd);
    }
    this.index = this.entries.length;
  }

  /**
   * Replaces the buffer with a saved set of entries (e.g. restored from
   * sessionStorage) and parks the cursor past the newest, so the next ArrowUp
   * recalls the most recent command. Non-array input is treated as empty,
   * guarding against tampered or malformed storage.
   *
   * @param entries - The command lines to rehydrate, oldest first.
   */
  load(entries: string[]): void {
    this.entries = Array.isArray(entries) ? [...entries] : [];
    this.index = this.entries.length;
  }

  /**
   * Returns the recorded commands oldest-first, for persistence across a page
   * navigation. A defensive copy, so callers can't mutate the buffer.
   *
   * @returns The command lines, oldest first.
   */
  snapshot(): string[] {
    return [...this.entries];
  }

  /**
   * Steps back in history (ArrowUp).
   *
   * @returns The previous command, or `undefined` when history is empty.
   */
  prev(): string | undefined {
    if (!this.entries.length) return undefined;

    this.index = this.index === 0 ? 0 : this.index - 1;
    return this.entries[this.index];
  }

  /**
   * Steps forward in history (ArrowDown).
   *
   * @returns The next command, an empty string past the newest entry,
   *          or `undefined` when history is empty.
   */
  next(): string | undefined {
    if (!this.entries.length) return undefined;

    this.index = this.index === this.entries.length ? this.index : this.index + 1;
    return this.entries[this.index] || "";
  }
}
