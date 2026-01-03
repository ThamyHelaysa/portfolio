import { LitElement, PropertyValues, html } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { gsap } from 'gsap';
import { TextPlugin } from 'gsap/TextPlugin';



gsap.registerPlugin(TextPlugin);

@customElement('terminal-shell')
export class TerminalShell extends LitElement {

  protected createRenderRoot() {
    return this;
  }

  // We can use a property to track the "Boot State"
  @property({ type: Boolean }) booted = false;
  // @property({ type: String, reflect: true })
  // private commandCLI: String = "";

  private bookData: Array<{ title: string, author: string }> = [];


  @query('#boot-log') private _bootLog!: HTMLDivElement;
  @query('#terminal-input') private _inputCLI!: HTMLTextAreaElement;
  // @query('#terminal-text') private _textCLI!: HTMLDivElement;
  @query('#terminal-output') private _outputCLI!: HTMLDivElement;
  // @query('#terminal-cli') private _terminalCLI!: HTMLDivElement;
  @query('#terminal-form') private _formCLI!: HTMLFormElement;
  @query('#raw-book-data') private _template!: HTMLDivElement;
  @query('#book-details-table') private _tableBooks!: HTMLTableElement;
  // @query('#book-tbody') private _tbody!: HTMLTableSectionElement;
  @query('#ascii-area') private _asciiArea!: HTMLElement;


  @state() private booksDisplayed = 0;
  @state() private readonly batchSize = 3;
  @state() private history: string[] = [];
  @state() private histIndex = 0;
  @state() private commandCLI = "";

  protected firstUpdated(_changedProperties: PropertyValues): void {
    // 1. Scrape data before the div "rots"
    if (this._template) {
      const items = this._template.querySelectorAll('.book-template');
      this.bookData = Array.from(items).map(el => ({
        title: el.getAttribute('data-title') || "Unknown",
        author: el.getAttribute('data-author') || "Unknown"
      }));
      // 2. Destroy the hidden container to free memory
      this._template.remove();
    }
    this.startBootSequence();
  }

  connectedCallback() {
    super.connectedCallback();
    // this.startBootSequence();
  }

  async startBootSequence() {
    console.log("Boot sequence started..."); // Debug check

    const bootLog = this._bootLog;

    // console.log(bootLog);
    if (!bootLog) {
      console.error("Could not find #boot-log");
      return;
    }

    const tl = gsap.timeline();

    // Test animation: Blink the container to prove GSAP is working
    // tl.to(this, { backgroundColor: "rgba(0, 255, 0, 0.1)", duration: 0.2, yoyo: true, repeat: 1 });

    // The typing animation
    tl.to(bootLog, {
      duration: 1.5,
      text: "> INITIALIZING KERNEL...<br>> LOADING BOOK_OS v1.0...",
      ease: "none"
    });

    tl.add(() => {
      console.log("Boot complete.");
      this.booted = true;

      // In Light DOM, just check if the element exists as a child
      const existingBook = this.querySelector('.book-template');

      if (existingBook) {
        this.handleDirectAccessReveal();
      }

      setTimeout(() => { this._inputCLI.focus(); }, 100);
    });
  }

  private appendToLog(text: string, time: number, type: "command" | "log") {
    const log = this._bootLog;
    if (!log) return;

    const p = document.createElement('p');
    p.className = type === "command" ? "command" : "log";
    p.textContent = "";
    log.appendChild(p);

    const safe = `${text}`;

    this._typeTextPromise(p, safe, time);
  }

  private _handleSubmit(e: Event) {
    // Prevent the page from refreshing
    e.preventDefault();

    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    const command = (formData.get('command') as string).toLowerCase().trim();

    // Clear the input field
    form.reset();
    this.commandCLI = ""
    this.history.push(command);
    this.histIndex = this.history.length;

    if (command === 'list' || command === 'continue') {
      this.appendToLog(command, 0, "command");
      this.displayNextBatch();
    } else if (command === 'help') {
      this.appendToLog("COMMANDS: LIST, CONTINUE, CLEAR, HELP", 0.5, "log");
    } else if (command !== "") {
      this.appendToLog(`COMMAND NOT RECOGNIZED: ${command}`, 0, "command");
    }

    setTimeout(() => {
      this._outputCLI.scrollTop = this._outputCLI.scrollHeight;
    }, 100);
  }

  private _handleInput(e: Event) {
    const el = e.target as HTMLTextAreaElement;
    var val = el.value;
    // this._textCLI.textContent = val;
    this.commandCLI = val
    console.log(val);

    el.style.height = 'auto'; // Reset height to recalculate
    el.style.height = el.scrollHeight + 'px'; // Expand based on text
  }

  private _handleInputKeys(e: KeyboardEvent) {
    // Submit
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this._formCLI.requestSubmit();
      return;
    }

    // Block ANY modifier combos (prevents Cmd+A/C/V/X/Z etc)
    // If you want SHIFT+Arrow selection to work, keep shiftKey allowed.
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

  private _preventMouseCaret(e: MouseEvent) {
    // Block click/drag setting selection
    e.preventDefault();

    const el = this._inputCLI; //e.currentTarget as HTMLTextAreaElement;
    el.focus();

    // Optional: always keep caret at end on mouse interaction
    const end = el.value.length;
    el.setSelectionRange(end, end);

    this._scrollToBottom(this._outputCLI);
  }

  private _forceCaretRules(e: Event) {
    // If you want to allow selection ONLY through keyboard,
    // you can still enforce "no selection" here.
    const el = e.currentTarget as HTMLTextAreaElement;

    // Strict mode: never allow selection range (only caret)
    if (el.selectionStart !== el.selectionEnd) {
      const end = el.selectionEnd ?? el.value.length;
      el.setSelectionRange(end, end);
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

  private handleDirectAccessReveal() {
    console.log('handleDirectAccessReveal')
    this.appendToLog("DETECTED LOCAL DATA SOURCE... EXTRACTING RECORD.", 0.5, "log");

    const existingBook = this.querySelector('.book-template');
    if (existingBook) {
      this.animateBook(existingBook as HTMLElement, 0);
    }
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

  private _logBooks(book: { title: string; author: string }) {
    const makeRow = (label: string, value: string) => {
      const tr = document.createElement("tr");

      const td1 = document.createElement("td");
      td1.textContent = label;

      const td2 = document.createElement("td");
      td2.className = "type-cell";
      td2.dataset.text = value ?? "";   // used for typing
      td2.textContent = "";             // start empty

      tr.append(td1, td2);
      return tr;
    };

    const r1 = makeRow("[RECORD]", book.title);
    const r2 = makeRow("[AUTHOR]", book.author);

    // this._tbody.append(r1, r2);
    this.appendToLog(`[RECORD] ${book.title}`, 0.5, "log");
    this.appendToLog(`    [AUTHOR] ${book.author}`, 0.5, "log");

    return [r1, r2]; // return nodes so you can animate just-added content
  }

  private async _ensureAsciiBootRendered(id = 5) {
    // if (this._asciiRendered.find(art => art === id)) return;

    const data = await this.loadAscii(`/assets/asciiart/Book${id}.json`);
    const frame = data.frames[data.animation?.currentFrame ?? 0];

    //this._asciiArea.textContent = ""; // safe clear

    // Create per-line nodes if you want stagger
    const lines = frame.content as string[];
    const nodes: HTMLElement[] = [];

    const container = document.createElement("div");
    container.className = "ascii-wrapper";
    for (const line of lines) {
      const div = document.createElement("div");
      div.className = "ascii-line";
      div.textContent = line;
      div.style.opacity = "0";
      container.appendChild(div);
      this._asciiArea.appendChild(container);
      nodes.push(div);
    }

    gsap.to(nodes, { opacity: 1, duration: 0, stagger: 0.07, ease: "none" });
    // this._asciiRendered = [id];
  }

  private async displayNextBatch() {
    const batch = this.bookData.slice(this.booksDisplayed, this.booksDisplayed + this.batchSize);

    if (batch.length === 0) {
      this.appendToLog("Bookshelf scan complete.", 0.5, "log");
      return;
    }

    this.appendToLog("Bookshelf scan complete.", 0.5, "log");

    // Add rows and collect the new cells to animate
    const newCells: HTMLElement[] = [];

    for (const book of batch) {
      const rows = this._logBooks(book);
      // console.log(book)
      rows.forEach((r: HTMLElement) => {
        const cell = r.querySelector<HTMLElement>(".type-cell");
        if (cell) newCells.push(cell);
      });

      await this._ensureAsciiBootRendered(this.booksDisplayed + 1);
      this.booksDisplayed++;
    }

    // Animate only the newly added cells (typing)
    for (const cell of newCells) {
      const text = cell.dataset.text ?? "";
      await this._typeTextPromise(cell, text, 0.25);
      // this._tableBooks.scrollTop = this._tableBooks.scrollHeight;
      // this.scrollToBottom();
    }

    this._scrollToBottom(this._tableBooks);
    // this.scrollToBottom();
  }

  private _scrollToBottom(el?: HTMLElement) {
    if (!el) { return; }
    el.scrollTop = el.scrollHeight;
  }

  render() {
    return html`
      <div id="terminal-cli" @mousedown="${this._preventMouseCaret}">
        <div id="terminal-output">
          <pre id="boot-log"></pre>
        </div>

        <form id="terminal-form" @submit="${this._handleSubmit}">
          <label for="terminal-input" class="prompt">USER@BOOK_OS:~$</label>
          <textarea
            id="terminal-input"
            name="command"
            rows="1"
            @input="${this._handleInput}"
            @keydown="${this._handleInputKeys}"
            @mousedown="${this._preventMouseCaret}"
            @selection="${this._forceCaretRules}"
            ?disabled="${!this.booted}"
            spellcheck="false"></textarea>
            <div id="terminal-text">${this.commandCLI}</div>
        </form>
      </div>
    `;
  }
}