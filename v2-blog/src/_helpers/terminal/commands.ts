/**
 * Shared Commands (see CONTEXT.md): the Commands whose semantics are
 * site-wide and must behave identically on every Terminal surface. Each
 * surface spreads the factory's registry into its own and may wrap
 * presentation (whoami flavor) but never semantics — the books shell and the
 * summoned overlay both get their `theme` / `whoami` / `ls` / `grep` / `cat`
 * from here, so the two can never diverge again.
 */

import { getTheme, setTheme, type Theme } from "../theme.ts";
import { getIdentity } from "../identity.ts";
import { CommandType, type CommandHandler } from "./core.ts";
import type { ParsedCommand } from "./parser.ts";
import type { Block } from "./blocks.ts";
import {
  buildTree,
  collectPages,
  fetchSiteIndex,
  findNode,
  renderSubtree,
  rootListingBlock,
  sanitizeNavQuery,
  searchEntries,
  type TreeNode,
} from "./site-index.ts";

/**
 * The narrow io a shared Command needs from its surface: the surface's own
 * ways of writing output (bound to its TerminalCore).
 */
export type CommandIo = {
  /** Writes a log line; same contract as `TerminalCore.append`. */
  append: (text: string, duration?: number, kind?: CommandType) => Promise<void>;
  /** Renders a structured block; same contract as `TerminalCore.render`. */
  render: (block: Block) => Promise<void>;
  /** Navigates to a site-internal URL (the surface owns how). */
  navigate: (url: string) => void;
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

    // `ls [target]` — browse the site tree: bare → the root listing block,
    // a folder → its `tree`-style subtree, a leaf → its title + description.
    ls: async (ctx: ParsedCommand): Promise<void> => {
      await io.append(ctx.raw, 0.2, CommandType.command);

      const root = buildTree(await fetchSiteIndex());
      const target = sanitizeNavQuery(ctx.positionals[0] ?? "");

      if (!target) {
        await io.render(rootListingBlock(root));
        return;
      }

      const node = findNode(root, target);
      if (!node) {
        await io.append(`ls: ${target}: no such page`, 0.2, CommandType.error);
        return;
      }

      if (node.children.length > 0) {
        for (const line of renderSubtree(node)) {
          await io.append(line, 0.02, CommandType.log);
        }
        return;
      }

      await printLeaf(io, node);
    },

    // `grep <term>` — search page titles and descriptions across the site
    // index; matches render as a linked listing.
    grep: async (ctx: ParsedCommand): Promise<void> => {
      await io.append(ctx.raw, 0.2, CommandType.command);

      const term = ctx.positionals.join(" ").trim().toLowerCase().slice(0, 64);
      if (!term) {
        await io.append("usage: grep <term>", 0.2, CommandType.info);
        return;
      }

      const matches = searchEntries(await fetchSiteIndex(), term);
      if (matches.length === 0) {
        await io.append(`grep: no matches for "${term}"`, 0.2, CommandType.error);
        return;
      }

      await io.render({
        type: "section",
        title: `grep "${term}" — ${matches.length} match${matches.length === 1 ? "" : "es"}`,
        tone: "surface",
        body: [
          {
            type: "columns",
            rows: matches.map((entry) => [
              { text: entry.title, href: entry.url },
              { text: entry.section, tone: "muted", align: "end" },
            ]),
          },
        ],
      });
    },

    // `random [folder]` — rolls a random page (site-wide, or scoped to a
    // folder: `random books`, `random blog`) and navigates to it.
    random: async (ctx: ParsedCommand): Promise<void> => {
      await io.append(ctx.raw, 0.2, CommandType.command);

      const root = buildTree(await fetchSiteIndex());
      const target = sanitizeNavQuery(ctx.positionals[0] ?? "");

      let scope: TreeNode | undefined = root;
      if (target) {
        scope = findNode(root, target);
        if (!scope) {
          await io.append(`random: ${target}: no such folder`, 0.2, CommandType.error);
          return;
        }
      }

      const pages = collectPages(scope);
      if (pages.length === 0) {
        await io.append(`random: nothing to roll in ${target || "~"}`, 0.2, CommandType.error);
        return;
      }

      const pick = pages[Math.floor(Math.random() * pages.length)];
      await io.append(`rolling the dice... ${pick.title ?? pick.name}`, 0.2, CommandType.status);
      io.navigate(pick.url!);
    },

    // `cat <page>` — print a page's title and description; folders belong to `ls`.
    cat: async (ctx: ParsedCommand): Promise<void> => {
      await io.append(ctx.raw, 0.2, CommandType.command);

      const target = sanitizeNavQuery(ctx.positionals[0] ?? "");
      if (!target) {
        await io.append("usage: cat <page>", 0.2, CommandType.info);
        return;
      }

      const node = findNode(buildTree(await fetchSiteIndex()), target);
      if (!node) {
        await io.append(`cat: ${target}: no such page`, 0.2, CommandType.error);
        return;
      }

      if (node.children.length > 0) {
        await io.append(`cat: ${target}: is a folder — try: ls ${target}`, 0.2, CommandType.error);
        return;
      }

      await printLeaf(io, node);
    },
  };
}

/** Prints a leaf page uniformly: its title line, then its description. */
async function printLeaf(io: CommandIo, node: TreeNode): Promise<void> {
  await io.append(node.title ?? node.name, 0.2, CommandType.title);
  await io.append(node.description ?? "(no description)", 0.2, CommandType.logdata);
}
