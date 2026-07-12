import { css, html, LitElement, PropertyValues } from "lit";
import { customElement, property, query } from "lit/decorators.js";
import { adoptTailwind } from "../_helpers/styleLoader.ts";
import { CommandType, TerminalCore } from "../_helpers/terminal/core.ts";
import type { ParsedCommand } from "../_helpers/terminal/parser.ts";
import {
  buildTree,
  fetchSiteIndex,
  findNode,
  rootListingBlock,
  renderSubtree,
  resolveOpen,
  sanitizeNavQuery,
} from "../_helpers/terminal/site-index.ts";
import { takeFirstBootOfSession, TerminalSession } from "../_helpers/terminal/session.ts";
import { playFirstSummonChime } from "../_helpers/terminal/chime.ts";
import { createSharedCommands } from "../_helpers/terminal/commands.ts";

/**
 * Site-wide summonable terminal — an accessible modal window (issue #93).
 *
 * A shadow-DOM `<dialog>` opened with `showModal()`: focus is trapped, the
 * background is inert, Escape and a backdrop click close it, and focus is
 * restored on close by the platform. Desktop shows a centered terminal window
 * with chrome; mobile goes fullscreen. Summoned deliberately (combo or button)
 * — it never auto-opens after a navigation. Only command history persists
 * across navigations, so arrow-up recalls earlier commands.
 */
@customElement("terminal-overlay")
export class TerminalOverlay extends LitElement {

  @property({ type: Boolean, reflect: true }) open = false;

  static styles = css`
    :host { display: contents; }

    /* The terminal window. Centered by the UA in the top layer when shown via
       showModal(); we override the UA dialog defaults (margin/padding/border). */
    #overlay-dialog {
      position: fixed;
      margin: auto;
      padding: 0;
      width: min(720px, 92vw);
      height: min(70vh, 560px);
      max-width: 92vw;
      max-height: 80vh;
      border: 1px solid var(--term-border);
      overflow: hidden;
      background: var(--term-bg);
      color: var(--term-text);
      box-shadow: 0 24px 60px rgba(0, 0, 0, 0.5);
      font-family: var(--font-mono, ui-monospace, "IBM Plex Mono", monospace);
    }

    #overlay-dialog:not([open]) { display: none; }
    #overlay-dialog[open] { display: flex; flex-direction: column; }

    /* The theme swap runs a view transition (see _helpers/theme.ts); its
       ::view-transition overlay paints above the top layer, and top-layer
       content is NOT part of the root snapshot — an unnamed open dialog gets
       covered by the page sweep. Naming dialog + backdrop promotes them into
       their own snapshot groups, which paint above the root group. Scoped to
       [open] so a closed dialog never claims a name during page-nav
       transitions. */
    #overlay-dialog[open] {
      view-transition-name: terminal-overlay;
    }

    #overlay-dialog::backdrop {
      background: rgba(0, 0, 0, 0.55);
    }

    #overlay-dialog[open]::backdrop {
      view-transition-name: terminal-overlay-backdrop;
    }

    @media (prefers-reduced-motion: no-preference) {
      #overlay-dialog[open] { animation: term-window-in 180ms ease both; }
      #overlay-dialog[open]::backdrop { animation: term-backdrop-in 180ms ease both; }
    }

    @keyframes term-window-in {
      from { opacity: 0; transform: translateY(-8px) scale(0.985); }
      to { opacity: 1; transform: none; }
    }

    @keyframes term-backdrop-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    /* Title bar: tab label + close. */
    #overlay-titlebar {
      flex: none;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.45rem 0.5rem 0.45rem 0.9rem;
      border-bottom: 1px solid var(--term-border);
      background: var(--term-surface);
    }

    #overlay-tab {
      display: inline-flex;
      align-items: center;
      gap: 0.55ch;
      font-size: 0.78rem;
      font-weight: 600;
      letter-spacing: 0.04em;
      color: var(--term-muted);
    }

    #overlay-tab::before {
      content: "";
      width: 0.6em;
      height: 0.6em;
      border-radius: 50%;
      background: var(--term-accent);
    }

    #overlay-close {
      flex: none;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 2rem;
      height: 2rem;
      border: 0;
      border-radius: 6px;
      background: transparent;
      color: var(--term-muted);
      font: inherit;
      font-size: 1rem;
      line-height: 1;
      cursor: pointer;
      transition: background 0.15s, color 0.15s;
    }

    #overlay-close:hover,
    #overlay-close:focus-visible {
      background: var(--term-accent);
      color: var(--term-on-accent);
      outline: none;
    }

    #overlay-log {
      margin: 0;
      flex: 1 1 auto;
      overflow: auto;
      padding: 1rem 1.25rem;
      white-space: pre-wrap;
      font-size: 0.85rem;
      line-height: 1.5;
    }

    /* Linear-stream lines: badge pills from the core's data-badge attribute. */
    .terminal-msg {
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      gap: 0 0.6ch;
      margin-block-end: 0.6ch;
    }

    .terminal-msg[data-badge]::before {
      content: attr(data-badge);
      flex: none;
      align-self: flex-start;
      padding: 0 0.6ch;
      font-weight: 600;
      font-size: 0.82em;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      background: var(--term-accent);
      color: var(--term-on-accent);
    }

    .terminal-msg.log {
      margin-block-start: 0;
      margin-block-end: 0;
    }

    /* Glyphs live in CSS content so aria text and persisted scrollback stay
       clean — keep the set in sync with books-terminal-deferred.css (ADR-0002). */
    .terminal-msg.info[data-badge]::before {
      content: "▸ " attr(data-badge);
      background: transparent;
      border: 1px solid var(--term-border);
      color: var(--term-text);
    }

    .terminal-msg.title[data-badge]::before {
      content: "▮ " attr(data-badge);
    }

    .terminal-msg.error[data-badge]::before {
      content: "✗ " attr(data-badge);
      background: var(--term-err-bg);
      color: var(--term-badge-text);
    }

    .terminal-msg.status[data-badge]::before {
      content: "✓ " attr(data-badge);
      background: var(--term-ok-bg);
      border: 1px solid var(--term-ok-bg);
      color: var(--term-badge-text);
    }

    .terminal-msg.command::before {
      content: "$";
      flex: none;
      color: var(--term-prompt);
      font-weight: 600;
    }

    #overlay-form {
      flex: none;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      border-top: 1px solid var(--term-border);
      padding: 0.6rem 1.25rem;
    }

    #overlay-form::before {
      content: "$";
      color: var(--term-prompt);
      font-weight: 600;
    }

    /* Segmented vim-style status bar (window footer; hidden on mobile). */
    #overlay-status {
      flex: none;
      display: flex;
      align-items: stretch;
      font-size: 0.72rem;
      font-weight: 600;
      letter-spacing: 0.04em;
    }

    #overlay-status > span {
      padding: 0.2rem 0.8rem;
      display: flex;
      align-items: center;
    }

    .status-mode {
      background: var(--term-accent);
      color: var(--term-on-accent);
      text-transform: uppercase;
    }

    .status-path {
      flex: 1;
      color: var(--term-muted);
    }

    .status-id {
      background: var(--term-surface);
      color: var(--term-muted);
    }

    #overlay-input {
      flex: 1 1 auto;
      background: transparent;
      border: 0;
      color: inherit;
      font: inherit;
      resize: none;
      outline: none;
    }

    /* Fullscreen on mobile; drop the footer status bar to save space. */
    @media (max-width: 768px) {
      #overlay-dialog {
        width: 100dvw;
        height: 100dvh;
        max-width: none;
        max-height: none;
        border: 0;
        border-radius: 0;
      }
      #overlay-status { display: none; }
    }

    /* Structured blocks: columns grid, tone chips, and sections. */
    .terminal-cols {
      display: grid;
      gap: 0.1rem 1.5ch;
      margin: 0.15rem 0;
    }

    .terminal-cell {
      white-space: pre;
    }

    .terminal-cell[data-align="end"] {
      justify-self: end;
      text-align: right;
    }

    a.terminal-cell {
      color: var(--term-text);
      font-weight: 700;
      text-decoration: underline;
      text-underline-offset: 3px;
    }

    a.terminal-cell:hover,
    a.terminal-cell:focus-visible {
      color: var(--term-accent);
    }

    /* "Ring · Koji Suzuki" — decorative separator after a linked cell. */
    a.terminal-cell + .terminal-cell::before {
      content: "· ";
      color: var(--term-muted);
    }

    [data-tone="muted"] {
      color: var(--term-muted);
    }
    [data-tone="accent"] {
      background: var(--term-accent);
      color: var(--term-on-accent);
    }
    [data-tone="ok"] {
      background: var(--term-ok-bg);
      color: var(--term-badge-text);
    }
    [data-tone="err"] {
      background: var(--term-err-bg);
      color: var(--term-badge-text);
    }
    [data-tone="warn"] {
      background: var(--term-warn-bg);
      color: var(--term-badge-text);
    }
    [data-tone="surface"] {
      background: var(--term-surface);
    }

    /* Toned cells read as chips; muted/default stay text-only. */
    .terminal-cell[data-tone="accent"],
    .terminal-cell[data-tone="ok"],
    .terminal-cell[data-tone="err"],
    .terminal-cell[data-tone="warn"] {
      padding: 0 0.6ch;
      border-radius: 3px;
    }

    .terminal-section {
      margin: 0.35rem 0;
      padding: 0.6rem 0.8rem;
      border-radius: 6px;
    }

    .terminal-section-title {
      font-size: 0.78em;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--term-muted);
      margin-bottom: 0.35rem;
    }

    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }
  `;

  @query("#overlay-dialog") private _dialog!: HTMLDialogElement;
  @query("#overlay-log") private _log!: HTMLElement;
  @query("#overlay-input") private _input!: HTMLTextAreaElement;
  @query("#overlay-form") private _form!: HTMLFormElement;

  private _skipAnimations =
    window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;

  /** Per-tab command-history store (survives full-page navigations). */
  private _session = new TerminalSession();

  private _core: TerminalCore = new TerminalCore({
    commands: {
      help: async (ctx: ParsedCommand) => {
        await this._core.append(ctx.raw, 0.2, CommandType.command);
        await this._core.append(
          "help - list commands\nls [folder] - browse the site tree (blog, books, …)\nopen <slug> - go to a page\ntheme [dark|pinky] - switch the theme\nwhoami - who are you, really\nexit / q - close the terminal",
          0.3,
          CommandType.logdata
        );
        await this._core.append("psst — this is a cheat console. the classics still work.", 0.2, CommandType.info);
      },

      ls: async (ctx: ParsedCommand) => this._listContent(ctx),
      list: async (ctx: ParsedCommand) => this._listContent(ctx),

      exit: async (ctx: ParsedCommand) => this._exit(ctx),
      q: async (ctx: ParsedCommand) => this._exit(ctx),

      // Shared Commands (theme, whoami) — semantics owned by the factory so
      // this surface and the books shell can never diverge.
      ...createSharedCommands({
        append: (text, duration, kind) => this._core.append(text, duration, kind),
      }),

      rosebud: async (ctx: ParsedCommand) => {
        await this._core.append(ctx.raw, 0.2, CommandType.command);
        await this._core.append("you bought one more book, your TBR thanks you", 0.2, CommandType.status);
      },
      motherlode: async (ctx: ParsedCommand) => {
        await this._core.append(ctx.raw, 0.2, CommandType.command);
        await this._core.append("all the books in the world and not enough time to read them", 0.2, CommandType.status);
      },

      open: async (ctx: ParsedCommand) => {
        await this._core.append(ctx.raw, 0.2, CommandType.command);
        const query = sanitizeNavQuery(ctx.positionals.join(" "));
        if (!query) {
          await this._core.append("usage: open <slug-or-path>", 0.2, CommandType.error);
          return;
        }

        const entries = await fetchSiteIndex();
        const result = resolveOpen(buildTree(entries), entries, query);

        switch (result.kind) {
          case "navigate":
            await this._core.append(`opening ${result.title}...`, 0.2, CommandType.status);
            window.location.href = result.url;
            break;
          case "ambiguous":
            await this._core.append(`"${query}" is ambiguous — did you mean:`, 0.2, CommandType.error);
            await this._core.append(
              result.entries.map((e) => `  ${e.title}`).join("\n"),
              0.2,
              CommandType.logdata
            );
            break;
          case "not-a-page":
            await this._core.append(`${query} is a folder, not a page — try: ls ${query}`, 0.2, CommandType.error);
            break;
          default:
            await this._core.append(`no match for "${query}"`, 0.2, CommandType.error);
        }
      },
    },
    logEl: () => this._log,
    skipAnimations: () => this._skipAnimations,
    onLineWritten: () => this._scrollToBottom(),
  });

  /**
   * Closes the terminal in response to the `exit` / `q` command.
   *
   * @param ctx - The parsed command (echoed before closing).
   * @returns A promise that settles once the echo is written.
   */
  private async _exit(ctx: ParsedCommand): Promise<void> {
    await this._core.append(ctx.raw, 0.2, CommandType.command);
    this.open = false;
  }

  /**
   * Shows the per-session boot flavour: a couple of cheat-console lines with
   * the Sims "reticulating splines" homage, pointing at `help`.
   *
   * @returns A promise that settles once the boot lines are written.
   */
  private async _boot(): Promise<void> {
    await this._core.append("book_os v1.0 — cheat console", 0.2, CommandType.log);
    await this._core.append("reticulating splines... ok", 0.2, CommandType.status);
    await this._core.append("type `help` for commands", 0.2, CommandType.logdata);
  }

  /**
   * Reward + flavour on summon: the per-session boot lines (first summon of the
   * session) and the once-ever chime. Both gate themselves; calling on every
   * open is safe.
   *
   * @returns `void`.
   */
  private _onOpened(): void {
    if (takeFirstBootOfSession()) void this._boot();
    playFirstSummonChime();
  }

  /**
   * Handles `ls [target]` against the site tree:
   * - no arg → the top level (folders with counts, then leaf pages);
   * - a folder → its `tree`-style subtree;
   * - a leaf → its title and description.
   *
   * @param ctx - The parsed command (first positional is an optional target).
   * @returns A promise that settles once the output is written.
   */
  private async _listContent(ctx: ParsedCommand): Promise<void> {
    await this._core.append(ctx.raw, 0.2, CommandType.command);

    const root = buildTree(await fetchSiteIndex());
    const target = sanitizeNavQuery(ctx.positionals[0] ?? "");

    if (!target) {
      // Structured: a tinted section with an aligned two-column grid.
      await this._core.render(rootListingBlock(root));
      return;
    }

    const node = findNode(root, target);
    if (!node) {
      await this._core.append(`ls: ${target}: no such page`, 0.2, CommandType.error);
      return;
    }

    if (node.children.length > 0) {
      for (const line of renderSubtree(node)) {
        await this._core.append(line, 0.02, CommandType.log);
      }
      return;
    }

    // Leaf page: show its title and description (uniform).
    await this._core.append(node.title ?? node.name, 0.2, CommandType.title);
    await this._core.append(node.description ?? "(no description)", 0.2, CommandType.logdata);
  }

  async firstUpdated() {
    // Rehydrate arrow-up history from earlier in the tab (the panel itself
    // opens fresh — no scrollback is restored, see #93).
    this._core.history.load(this._session.readHistory());
    try {
      await adoptTailwind(this.renderRoot as ShadowRoot, "terminal-overlay-shadow.css");
    } catch (e) {
      console.error("[TerminalOverlay] Failed to load styles", e);
    }
  }

  protected updated(changed: PropertyValues): void {
    if (changed.has("open")) {
      if (this.open) {
        this._showModal();
        this._onOpened();
      } else if (changed.get("open")) {
        this._closeModal();
      }
    }
  }

  /** Opens the dialog modally and focuses the prompt. */
  private _showModal(): void {
    if (typeof this._dialog?.showModal === "function") {
      try {
        this._dialog.showModal();
      } catch {
        // already open — ensure it is at least shown
        this._dialog.setAttribute("open", "");
      }
    } else {
      // <dialog>.showModal unsupported (older engines / jsdom): degrade to a
      // plain open dialog so the terminal is still usable.
      this._dialog?.setAttribute("open", "");
    }
    this._input?.focus();
  }

  /** Closes the dialog (the platform restores focus to the opener). */
  private _closeModal(): void {
    try {
      this._dialog?.close?.();
    } catch {
      this._dialog?.removeAttribute("open");
    }
  }

  /**
   * Syncs `open` when the dialog is dismissed by the platform (Escape) or by
   * `close()`, so the component state always tracks the dialog.
   */
  private _onDialogClose(): void {
    if (this.open) this.open = false;
  }

  /** Closes the terminal when the dimmed backdrop (outside the window) is clicked. */
  private _onDialogClick(e: MouseEvent): void {
    if (e.target === this._dialog) this.open = false;
  }

  /**
   * Handles prompt keys: Enter (without Shift) submits; Arrow Up/Down recall
   * history. Escape is handled natively by the dialog.
   *
   * @param e - The keydown event from the dialog or its input.
   * @returns `void`.
   */
  private _onKeydown(e: KeyboardEvent): void {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      this._form?.requestSubmit();
      return;
    }

    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      this._recallHistory(e.key);
    }
  }

  /**
   * Steps through command history and writes the recalled line into the input.
   *
   * @param key - ArrowUp steps back, ArrowDown steps forward.
   * @returns `void`.
   */
  private _recallHistory(key: "ArrowUp" | "ArrowDown"): void {
    const value = key === "ArrowUp" ? this._core.history.prev() : this._core.history.next();
    if (value === undefined || !this._input) return;
    this._input.value = value;
  }

  /**
   * Runs the submitted command line through the terminal core and persists the
   * updated history for arrow-up recall after a navigation.
   *
   * @param e - The form submit event.
   * @returns A promise that settles when the command finishes.
   */
  private async _onSubmit(e: Event): Promise<void> {
    e.preventDefault();
    const raw = this._input?.value ?? "";
    this._input.value = "";
    await this._core.run(raw);
    this._session.writeHistory(this._core.history.snapshot());
  }

  /** Keeps the log scrolled to the latest line. */
  private _scrollToBottom(): void {
    if (this._log) this._log.scrollTop = this._log.scrollHeight;
  }

  protected render(): unknown {
    return html`
      <dialog
        id="overlay-dialog"
        aria-label="Terminal"
        @keydown=${this._onKeydown}
        @close=${this._onDialogClose}
        @click=${this._onDialogClick}
      >
        <header id="overlay-titlebar">
          <span id="overlay-tab">book_os</span>
          <button
            id="overlay-close"
            type="button"
            aria-label="Close terminal"
            @click=${() => (this.open = false)}
          >✕</button>
        </header>
        <pre id="overlay-log"></pre>
        <form id="overlay-form" @submit=${this._onSubmit}>
          <label class="sr-only" for="overlay-input">Terminal command</label>
          <textarea
            id="overlay-input"
            name="command"
            rows="1"
            spellcheck="false"
            autocomplete="off"
          ></textarea>
        </form>
        <div id="overlay-status" aria-hidden="true">
          <span class="status-mode">cheat</span>
          <span class="status-path">~/book_os</span>
          <span class="status-id">◍ reader</span>
        </div>
      </dialog>
    `;
  }
}
