import { gsap } from "gsap";

import { parseCommand, ParsedCommand } from "./parser.ts";
import { CommandHistory } from "./history.ts";
import { type Block, type Cell, flattenBlock } from "./blocks.ts";

/**
 * Visual kinds for terminal log lines; the name doubles as the CSS class.
 */
export enum CommandType {
  "log" = 0,
  "logdata" = 1,
  "command" = 2,
  "title" = 3,
  "error" = 4,
  "status" = 5,
  /** System speaking to the user (help, identity); appended so persisted scrollback kinds stay valid. */
  "info" = 6,
}

export type CommandHandler = (ctx: ParsedCommand) => Promise<void> | void;

/**
 * Maps a log line's kind to its short uppercase badge label.
 * Shared by every terminal surface so badges stay consistent (see ADR-0002).
 *
 * @param type - The line kind.
 * @returns The badge label, or `undefined` for kinds shown without a badge.
 */
export function commandBadge(type: CommandType): string | undefined {
  switch (type) {
    case CommandType.title:
      return "TITLE";
    case CommandType.error:
      return "ERR";
    case CommandType.status:
      return "OK";
    case CommandType.info:
      return "INFO";
    default:
      return undefined;
  }
}

/**
 * Maps a badged line's kind to its decorative glyph. The single source of the
 * glyph vocabulary (ADR-0002): every surface renders it from the `data-glyph`
 * attribute via one generic CSS rule, so it stays out of aria text and
 * persisted scrollback and the surfaces can't drift.
 *
 * @param type - The line kind.
 * @returns The glyph character, or `undefined` for kinds without a badge.
 */
export function commandGlyph(type: CommandType): string | undefined {
  switch (type) {
    case CommandType.title:
      return "▮";
    case CommandType.error:
      return "✗";
    case CommandType.status:
      return "✓";
    case CommandType.info:
      return "▸";
    default:
      return undefined;
  }
}

type TerminalCoreOptions = {
  /** Command registry; consumers register their own command sets. */
  commands: Record<string, CommandHandler>;
  /** Element receiving log lines; resolved lazily so render roots can swap. */
  logEl: () => HTMLElement | null;
  /** Whether typing animations are currently skipped. */
  skipAnimations: () => boolean;
  /** Per-line typing animation; defaults to the gsap-based typewriter. */
  typeText?: (el: HTMLElement, text: string, durationSec: number) => Promise<void>;
  /**
   * Invoked after each written line, e.g. to keep the log scrolled to bottom
   * or to persist the line. Receives the line's text and kind so consumers can
   * mirror the scrollback into storage (see the overlay's session continuity).
   */
  onLineWritten?: (line: { text: string; kind: CommandType }) => void;
};

/**
 * Default typewriter animation used when the consumer doesn't inject one.
 *
 * @param el - The element receiving the typed text.
 * @param fullText - The complete line of text to type.
 * @param durationSec - The animation duration in seconds.
 * @returns A promise resolved when the line is fully typed.
 */
function typeTextWithGsap(el: HTMLElement, fullText: string, durationSec: number): Promise<void> {
  return new Promise((resolve) => {
    const state = { i: 0 };
    gsap.to(state, {
      i: fullText.length,
      duration: durationSec,
      ease: "none",
      onUpdate: () => {
        el.textContent = fullText.slice(0, Math.floor(state.i));
      },
      onComplete: () => {
        el.textContent = fullText;
        resolve();
      },
    });
  });
}

/**
 * Render-root-agnostic terminal engine: parses input, tracks history,
 * dispatches to registered commands, and writes log lines.
 */
export class TerminalCore {
  readonly history = new CommandHistory();

  private opts: TerminalCoreOptions;

  /**
   * Creates a terminal core bound to a consumer's elements and commands.
   *
   * @param opts - Registry, element accessors, and animation policy.
   */
  constructor(opts: TerminalCoreOptions) {
    this.opts = opts;
  }

  /**
   * Executes one input line through parse → history → dispatch.
   *
   * @param input - The raw text submitted to the terminal.
   * @returns A promise that settles when the command finishes.
   */
  async run(input: string): Promise<void> {
    const parsed = parseCommand(input);

    // Ignore empty input
    if (!parsed.raw) return;

    this.history.push(parsed.raw);

    const handler = this.opts.commands[parsed.cmd];

    if (!handler) {
      await this.append(`command not recognized: ${parsed.raw} >.<`, 0, CommandType.error);
      return;
    }

    await handler(parsed);
  }

  /**
   * Writes a (possibly multi-line) message to the terminal log.
   *
   * @param text - The message; newlines split into separate log lines.
   * @param duration - Per-line typing animation duration in seconds.
   * @param kind - The visual kind controlling the line's CSS class.
   * @returns A promise that settles when all lines are written.
   */
  async append(text: string, duration = 0.2, kind: CommandType = CommandType.log): Promise<void> {
    const log = this.opts.logEl();
    if (!log) return;

    const lines = String(text).replace(/\r\n/g, "\n").split("\n");

    const badge = commandBadge(kind);
    const glyph = commandGlyph(kind);

    for (const line of lines) {
      const p = document.createElement("p");
      p.className = `terminal-msg ${CommandType[kind]}`;
      if (badge) p.dataset.badge = badge;
      if (glyph) p.dataset.glyph = glyph;
      p.textContent = "";
      log.appendChild(p);

      if (this.opts.skipAnimations()) {
        p.textContent = line;
      } else {
        await (this.opts.typeText ?? typeTextWithGsap)(p, line, duration);
      }

      this.opts.onLineWritten?.({ text: line, kind });
    }
  }

  /**
   * Renders a structured block (text / columns / section) to the log. Unlike
   * {@link append}, structured output appears instantly (no per-char typing),
   * which suits grids and grouped layouts.
   *
   * @param block - The block descriptor to render.
   * @returns A promise that settles once the block is in the DOM.
   */
  async render(block: Block): Promise<void> {
    const log = this.opts.logEl();
    if (!log) return;

    log.appendChild(this.buildBlock(block));
    this.opts.onLineWritten?.({ text: flattenBlock(block), kind: CommandType.log });
  }

  /**
   * Builds the DOM for a block (recursing into section bodies).
   *
   * @param block - The block descriptor.
   * @returns The rendered element.
   */
  private buildBlock(block: Block): HTMLElement {
    switch (block.type) {
      case "text":
        return this.buildText(block.text, block.kind ?? CommandType.log);
      case "columns":
        return this.buildColumns(block.rows);
      case "section":
        return this.buildSection(block);
    }
  }

  /** Builds a flat text line (same shape as {@link append}, rendered instantly). */
  private buildText(text: string, kind: CommandType): HTMLElement {
    const p = document.createElement("p");
    p.className = `terminal-msg ${CommandType[kind]}`;
    const badge = commandBadge(kind);
    if (badge) p.dataset.badge = badge;
    const glyph = commandGlyph(kind);
    if (glyph) p.dataset.glyph = glyph;
    p.textContent = text;
    return p;
  }

  /** Builds a grid of tone/aligned cells; short rows are padded so columns line up. */
  private buildColumns(rows: Cell[][]): HTMLElement {
    const cols = rows.reduce((max, row) => Math.max(max, row.length), 0);
    const grid = document.createElement("div");
    grid.className = "terminal-cols";
    grid.style.gridTemplateColumns = `repeat(${cols}, max-content)`;

    for (const row of rows) {
      for (let i = 0; i < cols; i++) {
        const cell = row[i] ?? { text: "" };
        const el = cell.href
          ? Object.assign(document.createElement("a"), { href: cell.href })
          : document.createElement("span");
        el.className = "terminal-cell";
        if (cell.tone) el.dataset.tone = cell.tone;
        if (cell.align) el.dataset.align = cell.align;
        el.textContent = cell.text;
        grid.appendChild(el);
      }
    }
    return grid;
  }

  /** Builds a titled, optionally tinted group wrapping its nested body blocks. */
  private buildSection(block: Extract<Block, { type: "section" }>): HTMLElement {
    const section = document.createElement("section");
    section.className = "terminal-section";
    if (block.tone) section.dataset.tone = block.tone;

    if (block.title) {
      const title = document.createElement("div");
      title.className = "terminal-section-title";
      title.textContent = block.title;
      section.appendChild(title);
    }

    for (const child of block.body) section.appendChild(this.buildBlock(child));
    return section;
  }
}
