import { css, html, LitElement, PropertyValues } from "lit";
import { customElement, property, query } from "lit/decorators.js";
import { adoptTailwind } from "../_helpers/styleLoader.ts";
import { animator } from "../_helpers/animationManager.ts";
import { CommandType, TerminalCore } from "../_helpers/terminal/core.ts";
import type { ParsedCommand } from "../_helpers/terminal/parser.ts";

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
      border-bottom: 1px solid rgba(255, 255, 255, 0.12);
      display: block;
      transform: translateY(-100%);
      color: #e8e6e3;
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.45);
      font-family: ui-monospace, "IBM Plex Mono", monospace;
    }

    /* A real painted fill rather than a CSS background on the popover element:
       a top-layer popover only reliably paints its background where there is
       content, leaving empty areas transparent. This div always paints. */
    #overlay-bg {
      position: absolute;
      inset: 0;
      z-index: 0;
      background: rgba(20, 18, 24, 0.96);
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

    #overlay-form {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      border-top: 1px solid rgba(255, 255, 255, 0.12);
      padding: 0.6rem 1.25rem;
    }

    #overlay-form::before {
      content: "$";
      opacity: 0.6;
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

  private _core = new TerminalCore({
    commands: {
      help: async (ctx: ParsedCommand) => {
        await this._core.append(ctx.raw, 0.2, CommandType.command);
        await this._core.append(
          "help - list commands\nmore commands coming soon",
          0.3,
          CommandType.logdata
        );
      },
    },
    logEl: () => this._log,
    skipAnimations: () => this._skipAnimations,
    onLineWritten: () => this._scrollToBottom(),
  });

  async firstUpdated() {
    try {
      await adoptTailwind(this.renderRoot as ShadowRoot, "terminal-overlay-shadow.css");
    } catch (e) {
      console.error("[TerminalOverlay] Failed to load styles", e);
    }
  }

  protected updated(changed: PropertyValues): void {
    if (changed.has("open")) {
      if (this.open) {
        this._onOpened();
      } else {
        this._onClosed(changed.get("open") as boolean | undefined);
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
    }
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
        </div>
      </section>
    `;
  }
}
