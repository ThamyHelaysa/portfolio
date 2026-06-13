import { gsap } from "gsap";

import { parseCommand, ParsedCommand } from "./parser.ts";
import { CommandHistory } from "./history.ts";

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
}

export type CommandHandler = (ctx: ParsedCommand) => Promise<void> | void;

type TerminalCoreOptions = {
  /** Command registry; consumers register their own command sets. */
  commands: Record<string, CommandHandler>;
  /** Element receiving log lines; resolved lazily so render roots can swap. */
  logEl: () => HTMLElement | null;
  /** Whether typing animations are currently skipped. */
  skipAnimations: () => boolean;
  /** Per-line typing animation; defaults to the gsap-based typewriter. */
  typeText?: (el: HTMLElement, text: string, durationSec: number) => Promise<void>;
  /** Invoked after each written line, e.g. to keep the log scrolled to bottom. */
  onLineWritten?: () => void;
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
      await this.append(`COMMAND NOT RECOGNIZED: ${parsed.raw}`, 0, CommandType.error);
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

    for (const line of lines) {
      const p = document.createElement("p");
      p.className = `terminal-msg ${CommandType[kind]}`;
      p.textContent = "";
      log.appendChild(p);

      if (this.opts.skipAnimations()) {
        p.textContent = line;
      } else {
        await (this.opts.typeText ?? typeTextWithGsap)(p, line, duration);
      }

      this.opts.onLineWritten?.();
    }
  }
}
