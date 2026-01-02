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

  private bookData: Array<{ title: string, author: string }> = [];


  @query('#boot-log') private _bootLog!: HTMLDivElement;
  @query('#terminal-input') private _inputCLI!: HTMLTextAreaElement;
  @query('#results-area') private _resultArea!: HTMLDivElement;
  @query('#terminal-output') private _outputCLI!: HTMLDivElement;
  @query('#terminal-form') private _formCLI!: HTMLFormElement;
  @query('#raw-book-data') private _template!: HTMLDivElement;
  @query('#book-tbody') private _tbody!: HTMLTableSectionElement;
  @query('#ascii-area') private _asciiArea!: HTMLElement;


  @state() private booksDisplayed = 0;
  @state() private readonly batchSize = 3;

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

  private appendToLog(text: string, time: number) {
    const log = this._bootLog;
    if (!log) return;

    const p = document.createElement('p');
    p.className = "terminal-msg";
    p.textContent = "";
    log.appendChild(p);

    const safe = `> ${text}`;

    this._typeText(p, safe, time);
  }

  private _typeText(el: HTMLElement, fullText: string, durationSec = 0.5) {
    const total = fullText.length;
    const state = { i: 0 };

    // gsap timeline driving a number, we render textContent ourselves
    gsap.to(state, {
      i: total,
      duration: durationSec,
      ease: "none",
      onUpdate: () => {
        el.textContent = fullText.slice(0, Math.floor(state.i));
      },
      onComplete: () => {
        el.textContent = fullText;
        this.scrollToBottom();
      }
    });
  }


  private _handleSubmit(e: Event) {
    // Prevent the page from refreshing
    e.preventDefault();

    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    const command = (formData.get('command') as string).toLowerCase().trim();

    // Clear the input field
    form.reset();

    if (command === 'list' || command === 'continue') {
      this.appendToLog(command, 0);
      this.displayNextBatch();
    } else if (command === 'help') {
      this.appendToLog("COMMANDS: LIST, CONTINUE, CLEAR, HELP", 0.5);
      setTimeout(() => {
        this._outputCLI.scrollTop = this._outputCLI.scrollHeight;
      }, 100);
    } else if (command !== "") {
      this.appendToLog(`COMMAND NOT RECOGNIZED: ${command}`, 0);
      setTimeout(() => {
        this._outputCLI.scrollTop = this._outputCLI.scrollHeight;
      }, 100);
    }
    setTimeout(() => {
      this._outputCLI.scrollTop = this._outputCLI.scrollHeight;
    }, 100);
  }

  private _handleAutoResize(e: Event) {
    const el = e.target as HTMLTextAreaElement;
    el.style.height = 'auto'; // Reset height to recalculate
    el.style.height = el.scrollHeight + 'px'; // Expand based on text
  }

  private _handleInputSecurity(e: KeyboardEvent) {
    console.log(e);
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

    // Allow navigation keys (arrows only, per your rules)
    if (
      e.key === 'ArrowLeft' ||
      e.key === 'ArrowRight' ||
      e.key === 'ArrowUp' ||
      e.key === 'ArrowDown'
    ) {
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
    // Most characters come as a single-length key string
    if (e.key.length === 1) {
      return;
    }

    // Default deny (keeps your "only these keys" rule tight)
    e.preventDefault();
  }

  private _preventMouseCaret(e: MouseEvent) {
    // Block click/drag setting selection
    e.preventDefault();

    const el = e.currentTarget as HTMLTextAreaElement;
    el.focus();

    // Optional: always keep caret at end on mouse interaction
    const end = el.value.length;
    el.setSelectionRange(end, end);
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
    this.appendToLog("DETECTED LOCAL DATA SOURCE... EXTRACTING RECORD.", 0.5);

    const existingBook = this.querySelector('.book-template');
    if (existingBook) {
      this.animateBook(existingBook as HTMLElement, 0);
    }
  }

  // private async displayNextBatch() {
  //   this.appendToLog("", 0);
  //   const resultsArea = this._resultArea;

  //   const loader = document.createElement('p');
  //   loader.textContent = "> ACCESSING SECTOR " + (this.booksDisplayed / 10 + 1) + "...";
  //   resultsArea?.appendChild(loader);

  //   await new Promise(resolve => setTimeout(resolve, 2000));
  //   loader.remove();

  //   const allTemplates = this._template.querySelectorAll('.book-template');

  //   if (!resultsArea) return;

  //   const nextBatch = Array.from(allTemplates).slice(
  //     this.booksDisplayed,
  //     this.booksDisplayed + this.batchSize
  //   );

  //   if (nextBatch.length === 0) {
  //     this.appendToLog("DATABASE SCAN COMPLETE. NO FURTHER RECORDS.", 0.5);
  //     return;
  //   }

  //   // 3. Clone and "Animate In" each book
  //   nextBatch.forEach((template, index) => {
  //     const clone = template.cloneNode(true) as HTMLElement;

  //     // Ensure the clone is visible (since the source container is hidden)
  //     clone.style.display = 'block';
  //     resultsArea.appendChild(clone);

  //     // Reuse your working animateBook function!
  //     this.animateBook(clone, index);
  //   });

  //   // 4. Update the counter and scroll
  //   this.booksDisplayed += nextBatch.length;
  //   this.scrollToBottom();
  // }

  private async loadAscii(url: string) {
    const res = await fetch(url, { cache: "force-cache" });
    if (!res.ok) throw new Error("Failed to load ASCII JSON");
    return res.json();
  }


  // private async displayNextBatch() {
  //   const resultsArea = this._resultArea;
  //   const batch = this.bookData.slice(this.booksDisplayed, this.booksDisplayed + this.batchSize);

  //   if (batch.length === 0) {
  //     this.appendToLog("DATABASE SCAN COMPLETE.", 0.5);
  //     return;
  //   }

  //   const data = await this.loadAscii("/assets/asciiart/Book5.json");
  //   const frame = data.frames[data.animation?.currentFrame ?? 0];


  //   for (const book of batch) {
  //     const wrapper = document.createElement('div');
  //     wrapper.className = "book-entry-wrapper";

  //     // Prepare the lines for the ASCII art
  //     const asciiLines = frame.content;
  //     const asciiHtml = asciiLines.map((line: any) => `<div class="ascii-line">${line}</div>`).join('');

  //     wrapper.innerHTML = `
  //           <pre class="ascii-art-container">${asciiHtml}</pre>
  //           <table class="book-details-table">
  //               <tr><td>[RECORD]</td><td class="type-cell" data-text="${book.title}"></td></tr>
  //               <tr><td>[AUTHOR]</td><td class="type-cell" data-text="${book.author}"></td></tr>
  //           </table>
  //       `;
  //     resultsArea.appendChild(wrapper);

  //     // Run the sequence for this specific book
  //     await this._animateEntrySequence(wrapper);
  //     this.booksDisplayed++;
  //     this.scrollToBottom();
  //   }
  // }

  // private async _animateEntrySequence(wrapper: HTMLElement) {
  //   const lines = wrapper.querySelectorAll('.ascii-line');
  //   const cells = wrapper.querySelectorAll('.type-cell');

  //   const tl = gsap.timeline();

  //   // 1. Reveal ASCII lines one by one
  //   tl.from(lines, {
  //     opacity: 0,
  //     x: -5,
  //     duration: 0.05,
  //     stagger: 0.3,
  //     ease: "none"
  //   });

  //   // 2. Type out the table data sequentially
  //   for (const cell of Array.from(cells)) {
  //     const text = cell.getAttribute('data-text') || "";
  //     await this._typeTextPromise(cell as HTMLElement, text, 0.4);
  //   }
  // }

  private async _animateEntrySequence(wrapper: HTMLElement) {
    const lines = Array.from(wrapper.querySelectorAll<HTMLElement>('.ascii-line'));
    const cells = Array.from(wrapper.querySelectorAll<HTMLElement>('.type-cell'));

    // Ensure cells start empty (so typing effect is consistent)
    for (const cell of cells) cell.textContent = "";

    // 1) Reveal ASCII lines
    const tl = gsap.timeline({
      onUpdate: () => this.scrollToBottom?.(),
      onComplete: () => this.scrollToBottom?.(),
    });

    tl.from(lines, {
      opacity: 0,
      duration: 0.03,
      stagger: 0.03, // your 0.3 was very slow; keep if intentional
      ease: "none"
    });

    // Wait for ASCII animation to finish before typing
    //await tl.then?.(); // if your GSAP supports tl.then()
    // If not, use:
    await new Promise<void>(r => tl.eventCallback("onComplete", () => r()));

    // 2) Type each cell sequentially (safe)
    for (const cell of cells) {
      // Prefer dataset over attribute; but either is fine
      const text = cell.dataset.text ?? cell.getAttribute('data-text') ?? "";
      await this._typeTextPromise(cell, text, 0.4);
    }
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

  private _appendBookRows(book: { title: string; author: string }) {
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

    this._tbody.append(r1, r2);

    return [r1, r2]; // return nodes so you can animate just-added content
  }

  private _asciiRendered: number[] = [];

  private async _ensureAsciiBootRendered(id = 5) {
    // if (this._asciiRendered.find(art => art === id)) return;

    const data = await this.loadAscii(`/assets/asciiart/Book${id}.json`);
    const frame = data.frames[data.animation?.currentFrame ?? 0];

    //this._asciiArea.textContent = ""; // safe clear

    // Create per-line nodes if you want stagger
    const lines = frame.content as string[];
    const nodes: HTMLElement[] = [];

    const container = document.createElement("div");
    for (const line of lines) {
      const div = document.createElement("div");
      div.className = "ascii-line";
      div.textContent = line;
      div.style.opacity = "0";
      container.appendChild(div)
      this._asciiArea.appendChild(container);
      nodes.push(div);
    }

    gsap.to(nodes, { opacity: 1, duration: 0, stagger: 0.07, ease: "none" });
    // this._asciiRendered = [id];
  }



  private async displayNextBatch() {
    const batch = this.bookData.slice(this.booksDisplayed, this.booksDisplayed + this.batchSize);

    if (batch.length === 0) {
      this.appendToLog("DATABASE SCAN COMPLETE.", 0.5);
      return;
    }

    // Optional: render ASCII once (or once per batch)
    

    // Add rows and collect the new cells to animate
    const newCells: HTMLElement[] = [];

    for (const book of batch) {
      // await this._ensureAsciiBootRendered();
      const rows = this._appendBookRows(book);
      console.log(book)
      // Collect the .type-cell we just added
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
      this.scrollToBottom();
    }

    this.scrollToBottom();
  }


  private scrollToBottom() {
    window.scrollTo({
      top: document.body.scrollHeight,
      behavior: 'smooth'
    });
  }

  render() {
    return html`
      <div id="terminal-cli">
        <div id="terminal-output">
          <pre id="boot-log"></pre>
        </div>

        <form id="terminal-form" @submit="${this._handleSubmit}">
          <label for="terminal-input" class="prompt">USER@BOOK_OS:~$</label>
          <textarea
            id="terminal-input"
            name="command"
            rows="1"
            @input="${this._handleAutoResize}"
            @keydown="${this._handleInputSecurity}"
            @mousedown="${this._preventMouseCaret}"
            @selection="${this._forceCaretRules}"
            ?disabled="${!this.booted}"
            spellcheck="false"></textarea>
        </form>
      </div>
    `;
  }
}