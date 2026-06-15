import { css, html, LitElement, PropertyValues } from "lit";
import { customElement, property, query } from "lit/decorators.js";
import { adoptTailwind } from "../_helpers/styleLoader.ts";
import { animator } from "../_helpers/animationManager.ts";
import { CommandType, TerminalCore } from "../_helpers/terminal/core.ts";
import type { ParsedCommand } from "../_helpers/terminal/parser.ts";
import {
  buildTree,
  fetchSiteIndex,
  findNode,
  renderRootListing,
  renderSubtree,
  resolveOpen,
  sanitizeNavQuery,
} from "../_helpers/terminal/site-index.ts";
import { TerminalSession } from "../_helpers/terminal/session.ts";

/**
 * Site-wide summonable terminal overlay (the "cheat console").
 * A shadow-DOM drop-down panel built on the shared terminal core. Mounted and
 * toggled by the summoner via the reflected `open` attribute.
 */
@customElement("terminal-overlay")
export class TerminalOverlay extends LitElement {

  @property({ type: Boolean, reflect: true }) open = false;

  // Critical layout lives here (synchronous) because the overlay mounts already
  // open on first summon, before the async shadow-Tailwind fetch resolves.
  static styles = css`
    :host { display: contents; }

    /* Rendered in the top layer via the Popover API so it paints above the
       page regardless of ancestor stacking contexts (body has will-change).
       These also override the UA popover defaults (centering, border, padding). */
    #overlay-panel {
      position: fixed;
      inset: 0 0 auto 0;
      margin: 0;
      width: auto;
      max-width: none;
      height: 45vh;
      max-height: 45vh;
      padding: 0;
      border: 0;
      border-bottom: 1px solid var(--term-border);
      display: block;
      transform: translateY(-100%);
      color: var(--term-text);
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.45);
      font-family: var(--font-mono, ui-monospace, "IBM Plex Mono", monospace);
    }

    /* A real painted fill rather than a CSS background on the popover element:
       a top-layer popover only reliably paints its background where there is
       content, leaving empty areas transparent. This div always paints. */
    #overlay-bg {
      position: absolute;
      inset: 0;
      z-index: 0;
      background: var(--term-bg);
    }

    #overlay-inner {
      position: relative;
      z-index: 1;
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    @media (max-width: 768px) {
      #overlay-panel { height: 60vh; max-height: 60vh; }
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

    .terminal-msg.error[data-badge]::before {
      background: var(--term-err-bg);
      color: var(--term-badge-text);
    }

    .terminal-msg.status[data-badge]::before {
      background: var(--term-ok-bg);
      color: var(--term-badge-text);
    }

    .terminal-msg.command::before {
      content: "$";
      flex: none;
      color: var(--term-prompt);
      font-weight: 600;
    }

    #overlay-form {
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

    /* Segmented vim-style status bar. */
    #overlay-status {
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

  @query("#overlay-panel") private _panel!: HTMLElement;
  @query("#overlay-log") private _log!: HTMLElement;
  @query("#overlay-input") private _input!: HTMLTextAreaElement;
  @query("#overlay-form") private _form!: HTMLFormElement;

  private _restoreFocusTo: Element | null = null;
  private _skipAnimations =
    window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;

  /** Session-scoped continuity store (survives full-page navigations). */
  private _session = new TerminalSession();
  /** True while replaying restored scrollback, to suppress re-persisting it. */
  private _restoring = false;
  /** When set, the next open settles in place instead of sliding (restore). */
  private _skipSlideOnce = false;
  /** Resolves once any session restore on mount has finished (test hook). */
  private _restoreComplete: Promise<void> | null = null;

  /** Awaitable that settles after a mount-time session restore completes. */
  get restoreComplete(): Promise<void> | null {
    return this._restoreComplete;
  }

  private _core = new TerminalCore({
    commands: {
      help: async (ctx: ParsedCommand) => {
        await this._core.append(ctx.raw, 0.2, CommandType.command);
        await this._core.append(
          "help - list commands\nls [folder] - browse the site tree (blog, books, …)\nopen <slug> - go to a page",
          0.3,
          CommandType.logdata
        );
      },

      ls: async (ctx: ParsedCommand) => this._listContent(ctx),
      list: async (ctx: ParsedCommand) => this._listContent(ctx),

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
    onLineWritten: (line) => {
      this._scrollToBottom();
      // Mirror live output into the session; restore replay is already stored.
      if (!this._restoring) this._session.appendLine(line.text, line.kind);
    },
  });

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
      for (const line of renderRootListing(root)) {
        await this._core.append(line, 0.02, CommandType.log);
      }
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
    // Kick off restore synchronously (before the async style load) so the
    // replay isn't gated on Tailwind and `restoreComplete` is set immediately.
    this._restoreComplete = this._maybeRestore();
    try {
      await adoptTailwind(this.renderRoot as ShadowRoot, "terminal-overlay-shadow.css");
    } catch (e) {
      console.error("[TerminalOverlay] Failed to load styles", e);
    }
  }

  /**
   * Restores a continued session on mount: if the stored snapshot was left
   * open, replays its scrollback instantly, rehydrates history, reopens without
   * sliding, and prints a `cd ~<path>` arrival line for the new page.
   *
   * @returns A promise that settles once restore (if any) has finished.
   */
  private async _maybeRestore(): Promise<void> {
    const snap = this._session.read();
    if (!snap || !snap.open) return;

    this._restoring = true;
    for (const line of snap.log) {
      await this._core.append(line.t, 0, line.k);
    }
    this._restoring = false;

    this._core.history.load(snap.history);

    this._skipSlideOnce = true;
    this.open = true;
    await this.updateComplete;

    const path = window.location.pathname.replace(/\/+$/, "");
    await this._core.append(`cd ~${path}`, 0, CommandType.status);
  }

  protected updated(changed: PropertyValues): void {
    if (changed.has("open")) {
      if (this.open) {
        this._onOpened();
        this._session.setOpen(true);
      } else {
        const wasOpen = changed.get("open") as boolean | undefined;
        this._onClosed(wasOpen);
        // Only a real close ends the session; the initial render (wasOpen
        // undefined) must not wipe a session we're about to restore.
        if (wasOpen) this._session.clear();
      }
    }
  }

  /**
   * Focuses the input and slides the panel in when the overlay opens.
   *
   * @returns `void`.
   */
  private _onOpened(): void {
    this._showPopover();
    this._restoreFocusTo = document.activeElement;
    this._input?.focus();

    // A continuity restore appears already-open: settle in place, no slide.
    if (this._skipSlideOnce) {
      this._skipSlideOnce = false;
      if (this._panel) this._panel.style.transform = "translateY(0)";
      return;
    }

    void this._slide(true);
  }

  /**
   * Slides the panel out and restores focus when the overlay closes.
   *
   * @param wasOpen - Whether the overlay was previously open (skips work on first render).
   * @returns `void`.
   */
  private _onClosed(wasOpen: boolean | undefined): void {
    if (!wasOpen) return;

    const restore = this._restoreFocusTo;
    this._restoreFocusTo = null;

    // Slide out, then leave the top layer; restore focus immediately.
    void this._slide(false).then(() => this._hidePopover());

    if (restore instanceof HTMLElement) {
      restore.focus();
    }
  }

  /** Promotes the panel into the top layer (no-op where unsupported). */
  private _showPopover(): void {
    try {
      (this._panel as unknown as { showPopover?: () => void })?.showPopover?.();
    } catch {
      // already shown or popover unsupported — safe to ignore
    }
  }

  /** Removes the panel from the top layer (no-op where unsupported). */
  private _hidePopover(): void {
    try {
      (this._panel as unknown as { hidePopover?: () => void })?.hidePopover?.();
    } catch {
      // already hidden or popover unsupported — safe to ignore
    }
  }

  /**
   * Animates the panel drop-down; reduced motion is handled by the animator.
   *
   * @param show - Whether the panel is sliding into view.
   * @returns `void`.
   */
  private _slide(show: boolean): Promise<void> {
    if (!this._panel) return Promise.resolve();
    animator.cancel(this._panel);
    const keyframes = show
      ? [{ transform: "translateY(-100%)" }, { transform: "translateY(0)" }]
      : [{ transform: "translateY(0)" }, { transform: "translateY(-100%)" }];
    return animator.animate(this._panel, keyframes, {
      duration: 320,
      easing: "cubic-bezier(.37,.79,.14,.93)",
      fill: "both",
    });
  }

  /**
   * Handles panel-level keys: Escape closes; Enter (without Shift) submits.
   *
   * @param e - The keydown event from the panel or its input.
   * @returns `void`.
   */
  private _onKeydown(e: KeyboardEvent): void {
    if (e.key === "Escape") {
      e.preventDefault();
      this.open = false;
      return;
    }

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
   * Runs the submitted command line through the terminal core.
   *
   * @param e - The form submit event.
   * @returns A promise that settles when the command finishes.
   */
  private async _onSubmit(e: Event): Promise<void> {
    e.preventDefault();
    const raw = this._input?.value ?? "";
    this._input.value = "";
    await this._core.run(raw);
    this._session.setHistory(this._core.history.snapshot());
  }

  /** Keeps the log scrolled to the latest line. */
  private _scrollToBottom(): void {
    if (this._log) this._log.scrollTop = this._log.scrollHeight;
  }

  protected render(): unknown {
    return html`
      <section
        id="overlay-panel"
        popover="manual"
        role="dialog"
        aria-label="Terminal"
        @keydown=${this._onKeydown}
      >
        <div id="overlay-bg" aria-hidden="true"></div>
        <div id="overlay-inner">
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
        </div>
      </section>
    `;
  }
}
