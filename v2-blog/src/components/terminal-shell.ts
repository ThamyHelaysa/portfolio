import { LitElement, PropertyValues, css, html, nothing } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { gsap } from 'gsap';
import { TextPlugin } from 'gsap/TextPlugin';
import { IdentityManager, IDMode } from '../_helpers/identityManager.ts';

type ParsedCommand = {
  raw: string;                 // original command
  cmd: string;                 // "list", "book",
  flags: Record<string, string | boolean>;
  positionals: string[];       // ["5"] or ["id","5"]
};


gsap.registerPlugin(TextPlugin);

@customElement('terminal-shell')
export class TerminalShell extends LitElement {

  protected createRenderRoot() {
    return this;
  }

  @property({ type: Boolean }) booted = false;
  @property({ type: Boolean }) sidebarOpen = false;
  @property({ type: Boolean }) isMobile = window.innerWidth <= 768;
  @property({ type: Boolean }) quickActionsExecute = false;
  @property({ type: String, reflect: true })
  userID: string = "";

  // @property({ type: String, reflect: true })
  // private commandCLI: String = "";

  private bookData: Array<{ title: string, author: string, id: string }> = [];
  private _asciiCache = new Map<string, string[]>();
  private identity = IdentityManager.getInstance();
  private hasUserName = this.identity.getCachedName();

  @query('#boot-log') private _bootLog!: HTMLDivElement;
  @query('#terminal-input') private _inputCLI!: HTMLTextAreaElement;
  @query('#terminal-output') private _outputCLI!: HTMLDivElement;
  @query('#terminal-form') private _formCLI!: HTMLFormElement;
  @query('#raw-book-data') private _template!: HTMLDivElement;
  @query('#ascii-area') private _asciiArea!: HTMLElement;
  @query('#user-label') private _userLabel!: HTMLLabelElement;
  // @query('#terminal-text') private _textAreaCLI!: HTMLDivElement;


  @state() private booksDisplayed = 0;
  @state() private readonly batchSize = 3;
  @state() private history: string[] = [];
  @state() private histIndex = 0;
  @state() private commandCLI = "";
  @state() private focused = false;
  @state() private labelVar = '--label-width';
  @state() private _skipAnimations =
    window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;

  private readonly COMMANDS: Record<
    string,
    (ctx: ParsedCommand) => Promise<void> | void
  > = {
      help: async (ctx) => {
        await this.appendToLog(`${ctx.raw}`, 0.2, "command");

        if (this.isMobile) {
          this._inputCLI?.blur();
          this.sidebarOpen = true;
        } else {
          await this.appendToLog("commands", 0.2, "title");
          await this.appendToLog(
            "help/h - list command options\nlist [--all] - list the books by batch, if you want list all by flag --all",
            0.5,
            "logdata"
          )
        }
      },

      h: async (ctx) => this.COMMANDS.help(ctx),

      list: async (ctx) => {
        // boolean flag: --all
        if (ctx.flags.all === true) {
          await this.appendToLog("LISTING ALL RECORDS...", 0.05, "log");
          // Todo: await this.displayAllBooks();
          return;
        }

        // const art = typeof ctx.flags.art === "string" ? this._sanitizeArtId(ctx.flags.art) : undefined;
        if (this.isMobile) { this._inputCLI?.blur(); this.sidebarOpen = false };
        this.appendToLog(`${ctx.raw}`, 0, "command");

        await this.displayNextBatch();
      },

      continue: async (ctx) => this.COMMANDS.list(ctx),

      book: async (ctx) => {
        // supports: "book 5" or "book id 5"
        const idToken =
          ctx.positionals[0] === "id" ? ctx.positionals[1] : ctx.positionals[0];

        const id = Number(idToken);
        if (!Number.isFinite(id)) {
          await this.appendToLog("USAGE: BOOK <id>  (example: BOOK 5)", 0.05, "log");
          return;
        }

        await this.appendToLog(`OPENING BOOK ${id}...`, 0.05, "log");
        // Todo: this.openBookById(id);
      },

      skip: async (ctx) => {
        if (this.isMobile) {
          this._inputCLI?.blur();
          this.sidebarOpen = false;
        }
        if (ctx.positionals[0] === "animations") {
          await this.appendToLog(`${ctx.raw} ${ctx.positionals[0]}`, 0.2, "command");
          await this.appendToLog(`  animations turned ${this._skipAnimations ? "on" : "off"}`, 0.2, "log");
          this._toggleSkipAnim();
        } else {
          await this.appendToLog(ctx.raw, 0.2, "command");
        }
      },

      whoami: async (ctx) => {
        await this.appendToLog(`${ctx.raw}`, 0.2, "command");
        await this.appendToLog("life scan complete.", 0.2, "log");
        await this.appendToLog(`[RECORD - ]\n   `, 0.15, "logdata");
        await this.appendToLog(`[AUTHOR]\n   `, 0.15, "logdata");
      },

      // list portfolio branchs/commits and more
      // just like git but without the write permission
      git: async (ctx) => {
        await this.appendToLog(`${ctx.raw}`, 0.2, "command");

      },

      // list terminal archives
      ls: async (ctx) => {
        await this.appendToLog(`${ctx.raw}`, 0.2, "command");

      },

      // search posts, files 
      grep: async (ctx) => {
        await this.appendToLog(`${ctx.raw}`, 0.2, "command");

      },

      // display contents only no flags 
      cat: async (ctx) => {
        await this.appendToLog(`${ctx.raw}`, 0.2, "command");

      },

      clear: async (ctx) => {
        await this.appendToLog(`${ctx.raw}`, 0.2, "command");
        // Todo: improve clear
        // this._clearOutput();
        // await this.appendToLog("SCREEN CLEARED.", 0.05, "log");
      },
    };


  protected firstUpdated(_changedProperties: PropertyValues): void {
    // Get data
    if (this._template) {
      const items = this._template.querySelectorAll('.book-template');
      this.bookData = Array.from(items).map(el => ({
        title: el.getAttribute('data-title') || "Unknown",
        author: el.getAttribute('data-author') || "Unknown",
        id: el.getAttribute('data-id') || "Unknown"
      }));
      // Remove container
      this._template.remove();

      if (this.hasUserName) {
        this.userID = this.hasUserName;

      } else {
        this.userID = this.identity.getFullIdentity(IDMode.default);
      }
      requestAnimationFrame(() => {
        document.documentElement.style.setProperty(this.labelVar, `${this._userLabel.clientWidth}px`);

      })

      // this.labelWidth = this._userLabel.clientWidth;
    }

    this.startBootSequence();
  }

  protected updated(changed: Map<string, unknown>) {
    if (changed.has("isMobile") && !this.isMobile) {
      this.sidebarOpen = false;
    }
  }

  connectedCallback() {
    super.connectedCallback();
    // this.startBootSequence();
  }

  async startBootSequence() {
    const bootLog = this._bootLog;
    if (!bootLog) return;

    // Todo: skip on reduced motion or mobile flag
    // Todo: press Enter to skip boot

    // bootLog.textContent = "";

    await this.appendToLog(
      `Welcome to book_os`,
      0,
      "title"
    );
    await this.appendToLog("Its raining outside, and you find shelter inside my library, make yourself at home and explore around.", 3, "log");

    await this.appendToLog("...", 2, "log");

    const isDirectBook = !!this.querySelector(".book-template");

    if (isDirectBook) {
      await this.handleDirectAccessReveal();
    } else {
      await this.appendToLog("TYPE 'HELP' FOR COMMANDS.", 0, "log");
    }

    this.booted = true;
    this.focused = true;
    requestAnimationFrame(() => {
      this._inputCLI?.focus();
    });
  }

  private async appendToLog(text: string, duration = 0.2, kind: "log" | "logdata" | "command" | "title") {
    const log = this.querySelector("#boot-log");
    if (!log) return;

    // Normalize newlines and split
    const lines = String(text).replace(/\r\n/g, "\n").split("\n");

    for (const line of lines) {
      const p = document.createElement("p");
      p.className = `terminal-msg ${kind}`;
      p.textContent = "";
      log.appendChild(p);

      const full = `${line}`;

      if (this._skipAnimations) {
        p.textContent = full;
      } else {
        await this._typeTextPromise(p, full, duration);
      }

      this._scrollToBottom(this._outputCLI);
    }
  }

  private _handleInput(e: Event) {
    const el = e.target as HTMLTextAreaElement;
    var val = el.value;
    // this._textCLI.textContent = val;
    this.commandCLI = val

    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  }

  private _setTextareaValue(next: string, opts?: { focus?: boolean; placeCaretAtEnd?: boolean }) {
    const el = this._inputCLI as HTMLTextAreaElement | null;
    if (!el) return;

    el.value = next;
    this.commandCLI = next;

    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";

    if (opts?.placeCaretAtEnd) {
      requestAnimationFrame(() => {
        console.log("placeCaretAtEnd");
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

    e.preventDefault();
  }

  private _handleHistory(type: "ArrowUp" | "ArrowDown") {
    var histLen = this.history.length

    if (type === "ArrowUp") {
      if (!histLen) return;
      this.histIndex = this.histIndex === 0
        ? 0
        : this.histIndex - 1;

      this._inputCLI.value = this.history[this.histIndex];
      this.commandCLI = this._inputCLI.value;
      return;
    } else {
      if (!histLen) return;
      this.histIndex = this.histIndex === histLen
        ? this.histIndex
        : this.histIndex + 1;

      this._inputCLI.value = this.history[this.histIndex] || "";
      this.commandCLI = this._inputCLI.value;
      return;
    }
  }

  private animateBook(el: HTMLElement, index: number) {
    // Find the path inside THIS specific book element
    const titlePlaceholder = el.querySelector('.title-placeholder');
    const fullTitle = el.getAttribute('data-title') || "";

    const tl = gsap.timeline({ delay: index * 0.15 });

    // Type the text
    if (titlePlaceholder) {
      tl.to(titlePlaceholder, {
        duration: 2,
        text: fullTitle,
        ease: "none"
      }, "-=0.5");
    }
  }

  private async handleDirectAccessReveal() {
    await this.appendToLog(
      "DETECTED LOCAL DATA SOURCE... EXTRACTING RECORD.",
      1,
      "log"
    );

    const existingBook = this.querySelector(".book-template") as HTMLElement | null;
    if (!existingBook) return;

    await this.animateBook(existingBook, 0);
  }

  private async loadAscii(url: string) {
    const res = await fetch(url, { cache: "force-cache" });
    if (!res.ok) throw new Error("Failed to load ASCII JSON");
    return res.json();
  }

  private _typeTextPromise(el: HTMLElement, fullText: string, durationSec = 0.5): Promise<void> {
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
        }
      });
    });
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

  private async displayNextBatch() {
    const batch = this.bookData.slice(this.booksDisplayed, this.booksDisplayed + this.batchSize);

    if (batch.length === 0) {
      await this.appendToLog("Bookshelf scan complete.", 0.2, "log");
      this._scrollToBottom(this._outputCLI);
      return;
    }

    for (const book of batch) {
      if (!this._skipAnimations) {
        await this._renderAsciiForBook(this.booksDisplayed + 1);
      } else {
        await this._renderAsciiForBookInstant(this.booksDisplayed + 1);
      }

      await this.appendToLog(`[RECORD - ${book.id}]\n   ${book.title}`, 0.15, "logdata");
      await this.appendToLog(`[AUTHOR]\n   ${book.author}`, 0.15, "logdata");

      this.booksDisplayed++;
      this._scrollToBottom(this._outputCLI);
    }

    if (this.bookData.length - this.booksDisplayed) {
      await this.appendToLog(`books remaining: ${this.bookData.length - this.booksDisplayed}`, 0, "command");
    } else {
      await this.appendToLog("bookshelf scan complete.", 0.2, "log");
    }
  }

  private async _handleSubmit(e: Event) {
    e.preventDefault();

    const form = e.target as HTMLFormElement;
    const raw = String(new FormData(form).get("command") ?? "");

    form.reset();
    this.commandCLI = "";
    this._scrollToBottom(this._outputCLI);

    await this._executeCommand(raw);
  }

  private async _executeCommand(input: string) {
    // const normalized = raw.trim().replace(/\s+/g, " ");
    // const lower = normalized.toLowerCase();

    const parsed = this._parseCommand(input);
    // Ignore empty command
    if (!parsed.raw) {
      this._scrollToBottom(this._outputCLI);
      return;
    }

    // Push history (avoid duplicates)
    if (this.history.length === 0 || this.history[this.history.length - 1] !== parsed.raw) {
      this.history.push(parsed.raw);
    }
    this.histIndex = this.history.length;

    const handler = this.COMMANDS[parsed.cmd];

    if (!handler) {
      this.appendToLog(`COMMAND NOT RECOGNIZED: ${parsed.raw}`, 0, "command");
      this._scrollToBottom(this._outputCLI);
      return;
    }

    await handler(parsed);

    // Parse command + args

    // switch (cmd) {
    //   case "list":
    //   case "continue": {
    //     if (this.isMobile) { this._inputCLI?.blur(); this.sidebarOpen = false };
    //     this.appendToLog(`${raw}`, 0, "command");
    //     await this.displayNextBatch();
    //     break;
    //   }

    //   case "help":
    //   case "h": {
    //     await this.appendToLog(cmd, 0.2, "command");

    //     if (this.isMobile) {
    //       this._inputCLI?.blur();
    //       this.sidebarOpen = true;
    //     } else {
    //       await this.appendToLog("commands", 0.2, "title");
    //     }
    //     break;
    //   }

    //   case "skip":
    //     if (this.isMobile) {
    //       this._inputCLI?.blur();
    //       this.sidebarOpen = false;
    //     }
    //     if (positionals[0] === "animations") {
    //       await this.appendToLog(`${cmd} ${positionals[0]}`, 0.2, "command");
    //       await this.appendToLog(`  animations turned ${this._skipAnimations ? "on" : "off"}`, 0.2, "log");
    //       this._toggleSkipAnim();
    //     } else {
    //       await this.appendToLog(cmd, 0.2, "command");
    //     }
    //     break;

    //   // case "clear": {
    //   //   this.appendToLog(`${normalized}`, 0, "command");
    //   //   break;
    //   // }

    //   default: {
    //     this.appendToLog(`COMMAND NOT RECOGNIZED: ${raw}`, 0, "command");
    //     break;
    //   }
    // }

    this._scrollToBottom(this._outputCLI);
  }

  private _insertCommand(cmd: string, mode: "replace" | "append" = "replace") {
    const current = (this.commandCLI ?? "").trim();

    const next =
      mode === "append" && current.length > 0
        ? `${current} ${cmd}`.replace(/\s+/g, " ")
        : cmd;

    this._setTextareaValue(next, { focus: true, placeCaretAtEnd: true });
  }

  private async _runCommand(cmd: string) {
    this._setTextareaValue(cmd, { focus: false, placeCaretAtEnd: true });

    this.commandCLI = "";
    const el = this._inputCLI as HTMLTextAreaElement | null;
    if (el) {
      el.value = "";
      el.style.height = "auto";
      el.style.height = el.scrollHeight + "px";
    }

    await this._executeCommand(cmd);
  }

  private _onQuickAction(cmd: string) {
    if (this.sidebarOpen) { this.sidebarOpen = false }
    if (cmd === "help") return this._runCommand("help");
    if (this.quickActionsExecute) return this._runCommand(cmd);
    this._insertCommand(cmd, "replace");
  }

  private _parseCommand(input: string): ParsedCommand {
    const raw = input.trim().replace(/\s+/g, " ");
    const tokens = raw.length ? raw.split(" ") : [];

    const cmd = (tokens.shift() ?? "").toLowerCase();

    const flags: Record<string, string | boolean> = {};
    const positionals: string[] = [];

    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i];

      if (t.startsWith("--")) {
        const name = t.slice(2).toLowerCase();

        // --flag value (if next token exists and isn't another flag)
        if (tokens[i + 1] && !tokens[i + 1].startsWith("--")) {
          flags[name] = tokens[i + 1];
          i++;
        } else {
          // --flag (boolean)
          flags[name] = true;
        }
      } else {
        positionals.push(t);
      }
    }

    console.log({ raw, cmd, flags, positionals })

    return { raw, cmd, flags, positionals };
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

    if (!this.booted) return;

    const el = this._inputCLI; //e.currentTarget as HTMLTextAreaElement;
    el.focus();
    this.focused = true;

    const end = el.value.length;
    el.setSelectionRange(end, end);

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
    this.focused = false;
  }

  private _toggleSkipAnim() {
    console.log('toggle', this._skipAnimations);
    this._skipAnimations = !this._skipAnimations
  }

  protected render(): unknown {
    const anim = this._skipAnimations;

    return html`
      ${this.isMobile ? html`
        <details
          id="terminal-sidebar"
          class="${!this._skipAnimations ? "transition" : ""}"
          ?open=${this.sidebarOpen}
          @toggle=${(e: any) => { this.sidebarOpen = e.currentTarget.open; }}
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
              <button type="button" class="btn mobile" @click=${() => this._onQuickAction("random")}>random book</button>
              <span> - get a random book to be analized</span>
            </p>
          </div>
          <button @click="${() => (this.sidebarOpen = false)}" type="button" class="btn mobile">close options</button>
        </details>`
        :
        nothing
      }
      <div id="terminal-cli">
        <div class="helpers ${this.isMobile ? "hidden" : ""}">
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

        <form id="terminal-form" @submit="${this._handleSubmit}">
          <label id="user-label" for="terminal-input" class="prompt">${this.userID}@BOOK_OS:~$</label>
          <textarea
            id="terminal-input"
            name="command"
            rows="1"
            @blur="${this._handleBlur}"
            @input="${this._handleInput}"
            @keydown="${this._handleInputKeys}"
            @mousedown="${this._preventMouseCaret}"
            @selection="${this._forceCaretRules}"
            ?disabled="${!this.booted}"
            spellcheck="false"></textarea>
            <div class="${!this.focused ? "invisible" : ""} ${this.isMobile ? "hidden" : ""}" id="terminal-text">${this.commandCLI}</div>
            
        </form>
      </div>
    `;
  }
}