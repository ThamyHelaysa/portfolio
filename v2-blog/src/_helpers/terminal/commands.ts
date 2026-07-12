/**
 * Shared Commands (see CONTEXT.md): the Commands whose semantics are
 * site-wide and must behave identically on every Terminal surface. Each
 * surface spreads the factory's registry into its own and may wrap
 * presentation (whoami flavor) but never semantics — the books shell and the
 * summoned overlay both get their `theme` / `whoami` from here, so the two
 * can never diverge again.
 */

import { getTheme, setTheme, type Theme } from "../theme.ts";
import { getIdentity } from "../identity.ts";
import { CommandType, type CommandHandler } from "./core.ts";
import type { ParsedCommand } from "./parser.ts";

/**
 * The narrow io a shared Command needs from its surface: the surface's own
 * way of writing log lines (bound to its TerminalCore).
 */
export type CommandIo = {
  /** Writes a log line; same contract as `TerminalCore.append`. */
  append: (text: string, duration?: number, kind?: CommandType) => Promise<void>;
};

export type SharedCommandOptions = {
  /**
   * Wraps the identity string for this surface's `whoami` output (e.g. the
   * books shell's "you are … — guest of book_os" line). Defaults to the
   * identity unwrapped.
   */
  whoamiFlavor?: (identity: string) => string;
};

/**
 * Builds the shared Command registry bound to one surface's io.
 *
 * @param io - The surface's log-writing functions.
 * @param opts - Per-surface presentation options.
 * @returns The registry to spread into the surface's own Commands.
 */
export function createSharedCommands(
  io: CommandIo,
  opts: SharedCommandOptions = {}
): Record<string, CommandHandler> {
  const whoamiFlavor = opts.whoamiFlavor ?? ((identity: string) => identity);

  return {
    // `theme [dark|pinky|light]` — no arg toggles; an explicit value sets it
    // (`light` is a forgiving alias for pinky). Routes through the shared
    // theme helper so the toggle component stays in sync.
    theme: async (ctx: ParsedCommand): Promise<void> => {
      await io.append(ctx.raw, 0.2, CommandType.command);

      const arg = (ctx.positionals[0] ?? "").toLowerCase();

      let next: Theme;
      if (!arg) {
        next = getTheme() === "dark" ? "pinky" : "dark";
      } else if (arg === "dark") {
        next = "dark";
      } else if (arg === "pinky" || arg === "light") {
        next = "pinky";
      } else {
        await io.append(`theme: unknown "${arg}" — try: dark, pinky`, 0.2, CommandType.error);
        return;
      }

      setTheme(next);
      await io.append(`theme → ${next}`, 0.2, CommandType.status);
    },

    whoami: async (ctx: ParsedCommand): Promise<void> => {
      await io.append(ctx.raw, 0.2, CommandType.command);
      // Read fresh each run so it reflects a name chosen on another surface.
      await io.append(whoamiFlavor(getIdentity()), 0.2, CommandType.info);
    },
  };
}
