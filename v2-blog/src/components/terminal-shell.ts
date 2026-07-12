import { LitElement, PropertyValues, html, nothing } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { gsap } from 'gsap';
import { getIdentity, getStoredIdentity, setIdentity } from '../_helpers/identity.ts';
import { CommandType, TerminalCore } from '../_helpers/terminal/core.ts';
import type { ParsedCommand } from '../_helpers/terminal/parser.ts';
import {
  createInitialShellState,
  shellReducer,
  type ShellAction,
  type ShellState,
} from '../_helpers/terminal/shell-state.ts';
import { markUnlocked } from '../_helpers/terminal/unlock.ts';
import { createSharedCommands } from '../_helpers/terminal/commands.ts';

@customElement('terminal-shell')
export class TerminalShell extends LitElement {

  protected createRenderRoot() {
    return this;
  }

  @property({ type: Boolean }) quickActionsExecute = false;
  @property({ type: String, reflect: true })
  userID: string = "";

  // @property({ type: String, reflect: true })
  // private commandCLI: String = "";

  private bookData: Array<{ title: string, author: string, id: string, url?: string }> = [];
  private _asciiCache = new Map<string, string[]>();
  private hasUserName = getStoredIdentity();
  private _resizeObs?: ResizeObserver;
  private _typingTimer?: number;
  private _staggerTimer?: number;
  private _startupRafOne?: number;
  private _startupRafTwo?: number;
  private _asciiRenderRaf?: number;
  private _asciiRenderQueue: Promise<void> = Promise.resolve();
  private readonly _fallbackUserId = "reader";

  @query('#boot-log') private _bootLog!: HTMLDivElement;
  @query('#terminal-input') private _inputCLI!: HTMLTextAreaElement;
  @query('#terminal-output') private _outputCLI!: HTMLDivElement;
  @query('#terminal-form') private _formCLI!: HTMLFormElement;
  @query('#raw-book-data') private _dataScript!: HTMLScriptElement;
  @query('#ascii-area') private _asciiArea!: HTMLElement;
  @query('#user-label') private _userLabel!: HTMLLabelElement;
  @query("#terminal-text") private _mirrorCLI!: HTMLDivElement;
  @query("#caret-anchor") private _anchorCLI!: HTMLSpanElement;
  @query("#fake-caret") private _caretCLI!: HTMLSpanElement;
  // @query('#terminal-text') private _textAreaCLI!: HTMLDivElement;


  private readonly batchSize = 3;
  private readonly labelVar = '--label-width';

  @state() private shell: ShellState = createInitialShellState({
    isMobile: window.innerWidth <= 768,
    skipAnimations: window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false,
  });

  /**
   * Applies a state transition through the pure shell reducer.
   *
   * @param action - The transition to apply.
   * @returns `void`.
   */
  private dispatch(action: ShellAction): void {
    this.shell = shellReducer(this.shell, action);
  }

  private readonly COMMANDS: Record<
    string,
    (ctx: ParsedCommand) => Promise<void> | void
  > = {
      help: async (ctx) => {
        await this.appendToLog(`${ctx.raw}`, 0.2, CommandType.command);

        if (this.shell.isMobile) {
          this._inputCLI?.blur();
          this.dispatch({ type: "SIDEBAR_SET", open: true });
        } else {
          await this.appendToLog(
            "help · list · open <id> · random · ls · grep <term> · cat <page> · theme · whoami · clear υ.υ",
            0.5,
            CommandType.info
          )
        }
      },

      h: async (ctx) => this.COMMANDS.help(ctx),

      list: async (ctx) => {
        // boolean flag: --all
        if (ctx.flags.all === true) {
          await this.appendToLog("LISTING ALL RECORDS...", 0.05, CommandType.log);
          // Todo: await this.displayAllBooks();
          return;
        }

        // const art = typeof ctx.flags.art === "string" ? this._sanitizeArtId(ctx.flags.art) : undefined;
        if (this.shell.isMobile) { this._inputCLI?.blur(); this.dispatch({ type: "SIDEBAR_SET", open: false }); };
        this.appendToLog(`${ctx.raw}`, 0, CommandType.command);

        await this.displayNextBatch();
      },

      continue: async (ctx) => this.COMMANDS.list(ctx),

      open: async (ctx) => {
        await this.appendToLog(`${ctx.raw}`, 0, CommandType.command);

        // supports: "open 5" or "open id 5"
        const idToken =
          ctx.positionals[0] === "id" ? ctx.positionals[1] : ctx.positionals[0];

        const id = Number(idToken);
        if (!Number.isFinite(id)) {
          await this.appendToLog("usage: open <id>  (example: open 12)", 0.05, CommandType.info);
          return;
        }

        this._ensureBookDataLoaded();
        const book = this.bookData.find((b) => Number(b.id) === id);

        if (!book || !book.url) {
          await this.appendToLog(`no book #${idToken} >.<`, 0.05, CommandType.error);
          return;
        }

        await this.appendToLog(`opening [${book.id}] ${book.title}...`, 0.05, CommandType.status);
        this._navigateTo(book.url);
      },

      book: async (ctx) => this.COMMANDS.open(ctx),

      // Shared Commands (theme, whoami, ls, grep, cat, random) — semantics
      // owned by the factory so this surface and the summoned overlay can
      // never diverge. Only the whoami flavor line is books-specific.
      ...createSharedCommands(
        {
          append: (text, duration, kind) => this.appendToLog(text, duration ?? 0.2, kind ?? CommandType.log),
          render: (block) => this._core.render(block),
          navigate: (url) => this._navigateTo(url),
        },
        { whoamiFlavor: (id) => `you are ${id} — guest of book_os υ.υ` }
      ),

      skip: async (ctx) => {
        if (this.shell.isMobile) {
          this._inputCLI?.blur();
          this.dispatch({ type: "SIDEBAR_SET", open: false });
        }
        if (ctx.positionals[0] === "animations") {
          await this.appendToLog(`${ctx.raw} ${ctx.positionals[0]}`, 0.2, CommandType.command);
          await this.appendToLog(`  animations turned ${this.shell.skipAnimations ? "on" : "off"}`, 0.2, CommandType.log);
          this._toggleSkipAnim();
        } else {
          await this.appendToLog(ctx.raw, 0.2, CommandType.command);
        }
      },

      clear: async (ctx) => {
        await this.appendToLog(`${ctx.raw}`, 0.2, CommandType.command);
        this._clearOutput();
      },

      cls: async (ctx) => this.COMMANDS.clear(ctx),
      c: async (ctx) => this.COMMANDS.clear(ctx),

      l: async (ctx) => this.COMMANDS.list(ctx),
    };

  // Declared after COMMANDS so the initializer can hand it to the core.
  private _core = new TerminalCore({
    commands: this.COMMANDS,
    logEl: () => this.querySelector("#boot-log"),
    skipAnimations: () => this.shell.skipAnimations,
    onLineWritten: () => this._scrollToBottom(this._outputCLI),
  });


  protected firstUpdated(_changedProperties: PropertyValues): void {
    this._runRequiredOnLoadStartup();
    this._schedulePostPaintStartup();
  }

  protected updated(changed: Map<string, unknown>) {
    if (!changed.has("shell")) return;
    // Reposition the fake caret when the inputs that affect its position change.
    // (The "close sidebar on desktop" rule now lives in the reducer.)
    const prev = changed.get("shell") as ShellState | undefined;
    if (
      !prev ||
      prev.command !== this.shell.command ||
      prev.focused !== this.shell.focused ||
      prev.isMobile !== this.shell.isMobile
    ) {
      requestAnimationFrame(() => this._updateFakeCaretPosition());
    }
  }

  connectedCallback() {
    super.connectedCallback();
    // Reaching the books terminal unlocks the site-wide cheat console (#80).
    markUnlocked();
    // this.startBootSequence();
  }

  /**
   * Clears observers and queued async work when the terminal disconnects.
   *
   * @returns `void`.
   */
  disconnectedCallback() {
    super.disconnectedCallback();
    this._resizeObs?.disconnect();
    this._resizeObs = undefined;

    if (this._typingTimer != null) {
      clearTimeout(this._typingTimer);
      this._typingTimer = undefined;
    }

    if (this._staggerTimer != null) {
      clearTimeout(this._staggerTimer);
      this._staggerTimer = undefined;
    }

    if (this._startupRafOne != null) {
      cancelAnimationFrame(this._startupRafOne);
      this._startupRafOne = undefined;
    }

    if (this._startupRafTwo != null) {
      cancelAnimationFrame(this._startupRafTwo);
      this._startupRafTwo = undefined;
    }

    if (this._asciiRenderRaf != null) {
      cancelAnimationFrame(this._asciiRenderRaf);
      this._asciiRenderRaf = undefined;
    }
  }

  /**
   * Initializes only the state needed for the first readable render.
   *
   * @returns `void`.
   */
  private _runRequiredOnLoadStartup() {
    this.dispatch({ type: "INITIALIZED", routeMode: this._dataScript ? "listing" : "detail" });
    this.userID = this.hasUserName || this._fallbackUserId;
    this._syncPromptWidth();
  }

  /**
   * Defers the boot sequence until after the initial paint.
   *
   * @returns `void`.
   */
  private _schedulePostPaintStartup() {
    if (this.shell.bootStarted) return;

    this._startupRafOne = requestAnimationFrame(() => {
      this._startupRafOne = undefined;
      this._startupRafTwo = requestAnimationFrame(() => {
        this._startupRafTwo = undefined;
        void this._runPostPaintStartup();
      });
    });
  }

  /**
   * Starts the post-paint boot path once the element is still connected.
   *
   * @returns A promise that settles when boot initialization is done.
   */
  private async _runPostPaintStartup() {
    if (!this.isConnected || this.shell.bootStarted) return;

    this.dispatch({ type: "BOOT_STARTED" });
    await this.startBootSequence();
  }

  /**
   * Lazily enables interaction-only behaviors on the first user input path.
   *
   * @returns `void`.
   */
  private _ensureInteractionStartup() {
    if (this.shell.interactionReady) return;

    this.dispatch({ type: "INTERACTION_READY" });
    this._ensureIdentityReady();
    this._ensureCaretObserver();
  }

  /**
   * Replaces the fallback prompt label with the real identity when needed.
   *
   * @returns `void`.
   */
  private _ensureIdentityReady() {
    if (this.hasUserName || this.userID !== this._fallbackUserId) return;

    this.userID = getIdentity();
    setIdentity(this.userID);
    this.hasUserName = this.userID;
    this._syncPromptWidth();
  }

  /**
   * Starts the caret observer only after terminal interaction is needed.
   *
   * @returns `void`.
   */
  private _ensureCaretObserver() {
    if (this._resizeObs || !this._mirrorCLI || typeof ResizeObserver === "undefined") return;

    this._resizeObs = new ResizeObserver(() => {
      requestAnimationFrame(() => this._updateFakeCaretPosition());
    });
    this._resizeObs.observe(this._mirrorCLI);
  }

  /**
   * Extracts hidden listing data only when a books command needs it.
   *
   * @returns `void`.
   */
  private _ensureBookDataLoaded() {
    if (this.shell.bookDataLoaded || !this._dataScript) return;

    this.bookData = this._parseBookDataPayload(this._dataScript.textContent);
    this._dataScript.remove();
    this.dispatch({ type: "BOOK_DATA_LOADED" });
  }

  /**
   * Parses the compact listing payload embedded in the books page.
   *
   * @param payload - The serialized books payload from the non-executable script tag.
   * @returns The normalized book data used by the terminal listing flow.
   */
  private _parseBookDataPayload(payload: string | null) {
    if (!payload) return [];

    try {
      const parsed = JSON.parse(payload) as Array<Partial<{ title: string; author: string; id: string; url: string }>>;

      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed.map((item) => ({
        title: item.title || "Unknown",
        author: item.author || "Unknown",
        id: item.id || "Unknown",
        ...(item.url ? { url: item.url } : {}),
      }));
    } catch {
      return [];
    }
  }

  /**
   * Syncs the prompt label width to the CSS custom property used by the fake caret.
   *
   * @returns `void`.
   */
  private _syncPromptWidth() {
    requestAnimationFrame(() => {
      if (!this._userLabel) return;
      document.documentElement.style.setProperty(this.labelVar, `${this._userLabel.clientWidth}px`);
    });
  }

  /**
   * Waits until the next paint before running a non-critical terminal task.
   *
   * @returns A promise resolved on the next animation frame.
   */
  private _deferNonCriticalTask(): Promise<void> {
    if (!this.isConnected) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      this._asciiRenderRaf = requestAnimationFrame(() => {
        this._asciiRenderRaf = undefined;
        resolve();
      });
    });
  }

  /**
   * Queues ASCII rendering after the current interaction completes so the command text can show first.
   *
   * @param id - The book art identifier to render.
   * @returns `void`.
   */
  private _queueAsciiRenderForBook(id = 5) {
    this._asciiRenderQueue = this._asciiRenderQueue
      .catch(() => undefined)
      .then(async () => {
        await this._deferNonCriticalTask();
        if (!this.isConnected || !this._asciiArea) return;

        if (this.shell.skipAnimations) {
          await this._renderAsciiForBookInstant(id);
          return;
        }

        await this._renderAsciiForBook(id);
      });
  }

  /**
   * Runs the minimal post-paint boot flow without holding route content behind long copy animations.
   *
   * @returns A promise that settles once the terminal is focusable.
   */
  async startBootSequence() {
    const bootLog = this._bootLog;
    if (!bootLog) return;

    await this.appendToLog(
      `Welcome to book_os`,
      0,
      CommandType.title
    );
    await this.appendToLog(
      "Its raining outside, and you find shelter inside my library, make yourself at home and explore around.",
      0,
      CommandType.log
    );

    if (this.shell.routeMode === "detail") {
      await this.handleDirectAccessReveal();
    } else {
      await this.appendToLog("TYPE 'HELP' FOR COMMANDS.", 0, CommandType.log);
    }

    this.dispatch({ type: "BOOTED" });
    requestAnimationFrame(() => {
      this._inputCLI?.focus();
    });
  }

  /**
   * Writes a message to the boot log through the terminal core.
   *
   * @param text - The message; newlines become separate log lines.
   * @param duration - Per-line typing animation duration in seconds.
   * @param kind - The visual kind controlling the line's CSS class.
   * @returns A promise that settles when all lines are written.
   */
  private async appendToLog(text: string, duration = 0.2, kind: CommandType) {
    await this._core.append(text, duration, kind);
  }

  private _handleInput(e: Event) {
    this._ensureInteractionStartup();
    const el = e.target as HTMLTextAreaElement;
    var val = el.value;
    // this._textCLI.textContent = val;
    this.dispatch({ type: "INPUT_CHANGED", value: val });

    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
    this._onTyping();
    requestAnimationFrame(() => this._updateFakeCaretPosition());
  }

  private _setTextareaValue(next: string, opts?: { focus?: boolean; placeCaretAtEnd?: boolean }) {
    const el = this._inputCLI as HTMLTextAreaElement | null;
    if (!el) return;

    el.value = next;
    this.dispatch({ type: "INPUT_CHANGED", value: next });

    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
    // fix mirror text height
    this._mirrorCLI.style.height = el.scrollHeight + "px";

    if (opts?.placeCaretAtEnd) {
      requestAnimationFrame(() => {
        const end = next.length;
        el.setSelectionRange(end, end);
      })
    }

    if (opts?.focus) {
      requestAnimationFrame(() => el.focus());
    }
  }

  private _handleInputKeys(e: KeyboardEvent) {
    // Submit
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this._formCLI.requestSubmit();
      return;
    }

    // Block ANY modifier combos (prevents Cmd+A/C/V/X/Z etc)
    if (e.ctrlKey || e.metaKey || e.altKey) {
      e.preventDefault();
      return;
    }

    // Allow navigation ArrowUp
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      this._handleHistory('ArrowUp');
      return;
    }

    // Allow navigation ArrowDown
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      this._handleHistory('ArrowDown');
      return;
    }

    // Allow edit keys
    if (e.key === 'Backspace' || e.key === 'Delete') {
      return;
    }

    // Block jump/navigation + misc
    const blocked = new Set(['Home', 'End', 'PageUp', 'PageDown', 'Tab', 'Escape']);
    if (blocked.has(e.key)) {
      e.preventDefault();
      return;
    }

    // Allow printable characters (normal typing)
    if (e.key.length === 1) {
      return;
    }
    this.dispatch({ type: "TYPING_SET", typing: true });
    e.preventDefault();
  }

  /**
   * Applies ArrowUp/ArrowDown history navigation to the input field.
   *
   * @param type - Which direction the user is stepping through history.
   * @returns `void`.
   */
  private _handleHistory(type: "ArrowUp" | "ArrowDown") {
    const value = type === "ArrowUp"
      ? this._core.history.prev()
      : this._core.history.next();

    if (value === undefined) return;

    this._inputCLI.value = value;
    this.dispatch({ type: "INPUT_CHANGED", value });
  }

  /**
   * Finalizes the direct-book route without waiting on title animation work.
   *
   * @returns A promise that settles once the visible title content is ready.
   */
  private async handleDirectAccessReveal() {
    await this.appendToLog(
      "DETECTED LOCAL DATA SOURCE... EXTRACTING RECORD.",
      0,
      CommandType.log
    );

    const existingBook = this.querySelector(".book-template") as HTMLElement | null;
    if (!existingBook) return;
    const titlePlaceholder = existingBook.querySelector('.title-placeholder');
    const fullTitle = existingBook.getAttribute('data-title') || "";

    if (titlePlaceholder) {
      titlePlaceholder.textContent = fullTitle;
    }
  }

  private async loadAscii(url: string) {
    const res = await fetch(url, { cache: "force-cache" });
    if (!res.ok) throw new Error("Failed to load ASCII JSON");
    return res.json();
  }

  private async _getAsciiLines(url: string) {
    const cached = this._asciiCache.get(url);
    if (cached) return cached;

    const data = await this.loadAscii(url);
    const frame = data.frames[data.animation?.currentFrame ?? 0];
    const lines = frame.content as string[];

    this._asciiCache.set(url, lines);
    return lines;
  }

  private async _renderAsciiForBook(id = 5) {
    const lines = await this._getAsciiLines(`/assets/asciiart/Book${id}.json`);

    const container = document.createElement("div");
    container.className = "ascii-wrapper";
    container.setAttribute("aria-label", "Art for one book");
    container.setAttribute("role", "img");

    const nodes: HTMLElement[] = [];

    for (const line of lines) {
      const div = document.createElement("div");
      div.className = "ascii-line";
      div.setAttribute("aria-hidden", "true");
      div.textContent = line;
      div.style.opacity = "0";
      container.appendChild(div);
      nodes.push(div);
    }

    this._asciiArea.appendChild(container);

    return new Promise<void>((resolve) => {
      gsap.to(nodes, {
        opacity: 1,
        duration: 0.08,
        stagger: 0.03,
        ease: "none",
        onUpdate: () => this._scrollToBottom(this._outputCLI),
        onComplete: () => resolve()
      });
    });
  }

  private async _renderAsciiForBookInstant(id = 5) {
    const data = await this.loadAscii(`/assets/asciiart/Book${id}.json`);
    const frame = data.frames[data.animation?.currentFrame ?? 0];
    const lines = frame.content as string[];

    const container = document.createElement("div");
    container.className = "ascii-wrapper";
    container.setAttribute("role", "img");

    container.style.whiteSpace = "pre";
    container.textContent = lines.join("\n");

    this._asciiArea.appendChild(container);
  }

  /**
   * Logs the next batch of books immediately and pushes ASCII art rendering into the background queue.
   *
   * @returns A promise that settles once the textual batch output is written.
   */
  private async displayNextBatch() {
    this._ensureBookDataLoaded();
    const batch = this.bookData.slice(this.shell.booksDisplayed, this.shell.booksDisplayed + this.batchSize);

    if (batch.length === 0) {
      await this.appendToLog("bookshelf scan complete.", 0.2, CommandType.status);
      this._scrollToBottom(this._outputCLI);
      return;
    }

    if (this.shell.booksDisplayed === 0) {
      const total = this.bookData.length;
      await this.appendToLog(`Bookshelf — ${total} ${total === 1 ? "record" : "records"}`, 0, CommandType.title);
    }

    for (const book of batch) {
      const artId = this.shell.booksDisplayed + 1;
      this._queueAsciiRenderForBook(artId);

      await this._core.render({
        type: "columns",
        rows: [[
          { text: `[${book.id}]`, tone: "muted" },
          book.url ? { text: book.title, href: book.url } : { text: book.title },
          { text: book.author },
        ]],
      });

      this.dispatch({ type: "BOOKS_ADVANCED", count: 1 });
      this._scrollToBottom(this._outputCLI);
      await this._staggerRowReveal();
    }

    const remaining = this.bookData.length - this.shell.booksDisplayed;
    if (remaining) {
      await this.appendToLog(`books remaining: ${remaining} — type list to continue`, 0, CommandType.status);
    } else {
      await this.appendToLog("type 'open <id>' to read a card :)))", 0, CommandType.status);
    }
  }

  /**
   * Leaves the terminal for a book page (seam for tests: jsdom can't navigate).
   *
   * @param url - The destination book URL.
   * @returns `void`.
   */
  private _navigateTo(url: string) {
    window.location.assign(url);
  }

  /**
   * Paces listing rows so batches reveal row-by-row instead of dumping at once.
   *
   * @returns A promise resolved after the stagger delay (or at once when animations are skipped).
   */
  private _staggerRowReveal(): Promise<void> {
    if (this.shell.skipAnimations) return Promise.resolve();
    return new Promise((resolve) => {
      this._staggerTimer = window.setTimeout(resolve, 90);
    });
  }

  private async _handleSubmit(e: Event) {
    e.preventDefault();
    this._ensureInteractionStartup();

    const form = e.target as HTMLFormElement;
    const raw = String(new FormData(form).get("command") ?? "");

    form.reset();
    this.dispatch({ type: "INPUT_CHANGED", value: "" });
    this._scrollToBottom(this._outputCLI);

    await this._executeCommand(raw);
  }

  /**
   * Runs one submitted input line through the terminal core.
   *
   * @param input - The raw text submitted to the terminal.
   * @returns A promise that settles when the command finishes.
   */
  private async _executeCommand(input: string) {
    await this._core.run(input);
    this._scrollToBottom(this._outputCLI);
  }

  private _insertCommand(cmd: string, mode: "replace" | "append" = "replace") {
    const current = (this.shell.command ?? "").trim();

    const next =
      mode === "append" && current.length > 0
        ? `${current} ${cmd}`.replace(/\s+/g, " ")
        : cmd;

    this._setTextareaValue(next, { focus: true, placeCaretAtEnd: true });
  }

  private async _runCommand(cmd: string) {
    this._setTextareaValue(cmd, { focus: false, placeCaretAtEnd: true });

    this.dispatch({ type: "INPUT_CHANGED", value: "" });
    const el = this._inputCLI as HTMLTextAreaElement | null;
    if (el) {
      el.value = "";
      el.style.height = "auto";
      el.style.height = el.scrollHeight + "px";
    }

    await this._executeCommand(cmd);
  }

  private _onQuickAction(cmd: string) {
    if (this.shell.sidebarOpen) { this.dispatch({ type: "SIDEBAR_SET", open: false }); }
    if (cmd === "help") return this._runCommand("help");
    if (this.quickActionsExecute) return this._runCommand(cmd);
    this._insertCommand(cmd, "replace");
  }

  // Todo: decide if id can be predetermined
  private _sanitizeArtId(id: string) {
    // Prevent path traversal / weird characters
    // Allows: Book5, book_5, book-5
    return id.replace(/[^a-z0-9_-]/gi, "");
  }

  private _clearOutput() {
    if (!this._outputCLI) return;
    var logHeight = this._bootLog.scrollHeight;
    var outputHeight = this._outputCLI.offsetHeight;
    this._bootLog.style.height = `${logHeight + outputHeight}px`;
    requestAnimationFrame(() => {
      this._scrollToBottom(this._outputCLI);
    })
  }

  private _scrollToBottom(el?: HTMLElement) {
    if (!el) { return; }
    setTimeout(() => {
      el.scrollTop = el.scrollHeight;
    }, 100);
  }

  private _preventMouseCaret(e: MouseEvent) {
    e.preventDefault();

    if (!this.shell.booted) return;

    this._ensureInteractionStartup();
    const el = this._inputCLI; //e.currentTarget as HTMLTextAreaElement;
    el.focus();
    this.dispatch({ type: "FOCUS_SET", focused: true });

    const end = el.value.length;
    el.setSelectionRange(end, end);

    requestAnimationFrame(() => this._updateFakeCaretPosition());
    this._scrollToBottom(this._outputCLI);
  }

  private _forceCaretRules(e: Event) {
    const el = e.currentTarget as HTMLTextAreaElement;

    // Strict mode: never allow selection range (only caret)
    if (el.selectionStart !== el.selectionEnd) {
      const end = el.selectionEnd ?? el.value.length;
      el.setSelectionRange(end, end);
    }
  }

  private _handleBlur() {
    this.dispatch({ type: "FOCUS_SET", focused: false });
    requestAnimationFrame(() => this._updateFakeCaretPosition());
  }

  private _toggleSkipAnim() {
    this.dispatch({ type: "ANIMATIONS_TOGGLED" });
  }

  private _updateFakeCaretPosition() {
    const mirror = this._mirrorCLI;
    const anchor = this._anchorCLI;
    const caret = this._caretCLI;

    if (!mirror || !anchor || !caret) return;

    const mirrorRect = mirror.getBoundingClientRect();
    const anchorRect = anchor.getBoundingClientRect();

    const x = anchorRect.left - mirrorRect.left;
    const y = anchorRect.top - mirrorRect.top;

    caret.style.transform = `translate(${x}px, ${y}px)`;
    caret.style.height = `${anchorRect.height || mirrorRect.height}px`;
  }

  private _onTyping() {
    if (!this.shell.isTyping) {
      this.dispatch({ type: "TYPING_SET", typing: true });
    }

    // reset debounce
    clearTimeout(this._typingTimer);
    this._typingTimer = window.setTimeout(() => {
      this.dispatch({ type: "TYPING_SET", typing: false });
    }, 500);
  }


  protected render(): unknown {
    const anim = this.shell.skipAnimations;

    return html`
      ${this.shell.isMobile ? html`
        <details
          id="terminal-sidebar"
          class="${!this.shell.skipAnimations ? "transition" : ""}"
          ?open=${this.shell.sidebarOpen}
          @toggle=${(e: any) => this.dispatch({ type: "SIDEBAR_SET", open: e.currentTarget.open })}
          >
          <summary aria-label="Commands Options">
            <span aria-hidden="true" class="ico"></span>
            <span>Commands Options</span>
          </summary>
          <p class="info">You can insert the commands into the console or if feeling lazy
           you can use the quick actions bellow, just type the same command as 
           provided:
          </p>

          
          <div id="mobile-actions">
            <p class="info item">
              <button type="button" class="btn">accessibility</button>
              <span> - set the buttons to auto execute command</span>
            </p>
            <p class="info item">
              <button
                id="skip" 
                type="button" 
                class="btn" 
                @click="${this._toggleSkipAnim}">
                  ${anim ? "unskip" : "skip"} animations
              </button>
              <span> - turn on/off animations and transitions</span>
            </p>
            <p class="info item">
              <button type="button" class="btn mobile" @click=${() => this._onQuickAction("list")}><span>list/l</span></button>
              <span> - list the available books</span>
            </p>
            <p class="info item">
              <button type="button" class="btn mobile" @click=${() => this._onQuickAction("clear")}>clear/c</button>
              <span> - clear the console</span>
            </p>
            <p class="info item">
              <button type="button" class="btn mobile" @click=${() => this._onQuickAction("random books")}>random book</button>
              <span> - get a random book to be analized</span>
            </p>
          </div>
          <button @click="${() => this.dispatch({ type: "SIDEBAR_SET", open: false })}" type="button" class="btn mobile">close options</button>
        </details>`
        :
        nothing
      }
      <div id="terminal-cli">
        <div class="helpers ${this.shell.isMobile ? "hidden" : ""}">
          <button
            id="skip" 
            type="button" 
            class="btn" 
            @click="${this._toggleSkipAnim}">
              ${anim ? "unskip" : "skip"} animations
          </button>
        </div>
        <div id="terminal-output" @mousedown="${this._preventMouseCaret}">
          <pre id="boot-log"></pre>
        </div>

        <form id="terminal-form" @submit=${this._handleSubmit}>
          <label id="user-label" for="terminal-input" class="prompt">${!this.shell.isMobile ? this.userID + "@BOOK_OS:~$" : ">"}</label>
          <div id="input-wrap">
            <textarea
              id="terminal-input"
              name="command"
              rows="1"
              @blur=${this._handleBlur}
              @input=${this._handleInput}
              @keydown=${this._handleInputKeys}
              @mousedown=${this._preventMouseCaret}
              @selection=${this._forceCaretRules}
              ?disabled="${!this.shell.booted}"
              spellcheck="false"></textarea>
            <div
              class="${!this.shell.isTyping ? "blink" : ""} ${!this.shell.focused ? "invisible" : ""} ${this.shell.isMobile ? "hidden" : ""}"
              id="terminal-text"><span id="terminal-mirror">${this.shell.command}</span><span id="caret-anchor">&#8203;</span><span id="fake-caret" aria-hidden="true"></span></div>
          </div>
        </form>
        <footer id="terminal-status" aria-hidden="true">
          <span class="status-mode">${this.shell.routeMode === "detail" ? "read" : "browse"}</span>
          <span class="status-path">~/book_os</span>
          <span class="status-id">◍ ${this.userID || "reader"}</span>
        </footer>
      </div>
    `;
  }
}
