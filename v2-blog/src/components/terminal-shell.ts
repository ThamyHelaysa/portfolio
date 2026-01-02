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


  @query('#boot-log') private _bootLog!: HTMLDivElement;
  @query('#terminal-input') private _inputCLI!: HTMLTextAreaElement;
  @query('#results-area') private _resultArea!: HTMLDivElement;
  @query('#terminal-output') private _outputCLI!: HTMLDivElement;
  @query('#terminal-form') private _formCLI!: HTMLFormElement;
  @query('#raw-book-data') private _template!: HTMLDivElement;

  @state() private booksDisplayed = 0;
  @state() private readonly batchSize = 10;

  protected firstUpdated(_changedProperties: PropertyValues): void {
    console.log(_changedProperties);
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

  // private appendToLog(text: string) {
  //   const log = this.querySelector('#boot-log');
  //   if (log) {
  //     const p = document.createElement('p');
  //     p.className = "terminal-msg";
  //     log.appendChild(p);
  //     // Use GSAP to type out the help/error message
  //     gsap.to(p, { duration: 0.5, text: `> ${text}`, ease: "none" });
  //   }
  // }

  private appendToLog(text: string) {
    const log = this.querySelector('#boot-log');
    if (!log) return;

    const p = document.createElement('p');
    p.className = "terminal-msg";
    p.textContent = "";
    log.appendChild(p);

    const safe = `> ${text}`;

    this._typeText(p, safe, 0.5);
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
      // this.appendToLog("Commands: LIST, CONTINUE, CLEAR, HELP");
      this.displayNextBatch();
    } else if (command === 'help') {
      this.appendToLog("COMMANDS: LIST, CONTINUE, CLEAR, HELP");
      setTimeout(() => {
        this._outputCLI.scrollTop = this._outputCLI.scrollHeight;
      }, 100);
    } else if (command !== "") {
      this.appendToLog(`COMMAND NOT RECOGNIZED: ${command}`);
      this._outputCLI.scrollTop = this._outputCLI.scrollHeight;
    }

    this._outputCLI.scrollTop = this._outputCLI.scrollHeight;
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
    const path = el.querySelector('.border-path');
    const titlePlaceholder = el.querySelector('.title-placeholder');
    const fullTitle = el.getAttribute('data-title') || "";

    const tl = gsap.timeline({ delay: index * 0.15 });

    // 1. Draw the SVG line
    if (path) {
      tl.set(path, { strokeDasharray: 1, strokeDashoffset: 1 }); // Force initial state
      tl.to(path, {
        strokeDashoffset: 0,
        duration: 1,
        ease: "power2.inOut"
      });
    }

    // 2. Type the text
    if (titlePlaceholder) {
      tl.to(titlePlaceholder, {
        duration: 0.6,
        text: fullTitle,
        ease: "none"
      }, "-=0.5"); // Start typing halfway through the line drawing
    }
  }

  private handleDirectAccessReveal() {
    console.log('handleDirectAccessReveal')
    // Add a "system message" acknowledging the specific page
    this.appendToLog("DETECTED LOCAL DATA SOURCE... EXTRACTING RECORD.");

    // Since the content is already in the Light DOM, we just animate it
    const existingBook = this.querySelector('.book-template');
    if (existingBook) {
      // Re-use your animation logic to draw the lines for this specific book
      this.animateBook(existingBook as HTMLElement, 0);
    }
  }

  private async displayNextBatch() {
    const resultsArea = this._resultArea;

    // 1. Temporary loading text
    const loader = document.createElement('p');
    loader.textContent = "> ACCESSING SECTOR " + (this.booksDisplayed / 10 + 1) + "...";
    resultsArea?.appendChild(loader);

    // 2. Short pause for 'realism'
    await new Promise(resolve => setTimeout(resolve, 2000));
    loader.remove();
    // 1. Find your 'database' and your 'screen'
    const allTemplates = this._template.querySelectorAll('.book-template');

    if (!resultsArea) return;

    // 2. Grab the next 10 books
    const nextBatch = Array.from(allTemplates).slice(
      this.booksDisplayed,
      this.booksDisplayed + this.batchSize
    );

    if (nextBatch.length === 0) {
      this.appendToLog("DATABASE SCAN COMPLETE. NO FURTHER RECORDS.");
      return;
    }

    // 3. Clone and "Animate In" each book
    nextBatch.forEach((template, index) => {
      const clone = template.cloneNode(true) as HTMLElement;

      // Ensure the clone is visible (since the source container is hidden)
      clone.style.display = 'block';
      resultsArea.appendChild(clone);

      // Reuse your working animateBook function!
      this.animateBook(clone, index);
    });

    // 4. Update the counter and scroll
    this.booksDisplayed += nextBatch.length;
    this.scrollToBottom();
  }

  private scrollToBottom() {
    // Essential for mobile so the user sees the new content
    window.scrollTo({
      top: document.body.scrollHeight,
      behavior: 'smooth'
    });
  }

  render() {
    return html`
      <div id="terminal-cli">
        <div id="terminal-output">
          <div id="boot-log"></div>
          <div id="results-area">
          </div>
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