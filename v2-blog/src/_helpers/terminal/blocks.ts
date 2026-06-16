/**
 * Structured terminal output (issue: richer log control). A small descriptor
 * model the core renders to DOM, so commands can emit columns, sections, and
 * tone-coloured cells instead of only flat text. Kept dependency-free (no gsap)
 * so data-layer modules like `site-index.ts` can build blocks without pulling
 * in the rendering engine.
 */

import type { CommandType } from "./core.ts";

/**
 * Semantic colour roles mapped to the `--term-*` theme tokens (so output stays
 * themeable across pinky/dark and free of hard-coded colours).
 */
export type Tone = "default" | "muted" | "accent" | "ok" | "err" | "surface" | "warn";

/** One cell in a columns block. */
export interface Cell {
  text: string;
  tone?: Tone;
  /** Horizontal placement within its grid column (default: start). */
  align?: "start" | "end";
}

/**
 * A renderable unit. `text` is the familiar flat line; `columns` is a grid with
 * aligned cells; `section` groups a titled, optionally tinted body (one level of
 * nesting — enough for "a section containing a columns listing").
 */
export type Block =
  | { type: "text"; text: string; kind?: CommandType }
  | { type: "columns"; rows: Cell[][] }
  | { type: "section"; title?: string; tone?: Tone; body: Block[] };

/**
 * Flattens a block to its plain text (for scroll bookkeeping / accessibility).
 *
 * @param block - The block to flatten.
 * @returns The concatenated text content.
 */
export function flattenBlock(block: Block): string {
  switch (block.type) {
    case "text":
      return block.text;
    case "columns":
      return block.rows.map((row) => row.map((c) => c.text).join(" ")).join("\n");
    case "section":
      return [block.title ?? "", ...block.body.map(flattenBlock)].filter(Boolean).join("\n");
  }
}
