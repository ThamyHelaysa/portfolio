import { LitElement, PropertyValues, html } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
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
    console.log(bootLog);
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
    });
  }

  private appendToLog(text: string) {
    const log = this.querySelector('#boot-log');
    if (log) {
      const p = document.createElement('p');
      p.className = "terminal-msg";
      log.appendChild(p);
      // Use GSAP to type out the help/error message
      gsap.to(p, { duration: 0.5, text: `> ${text}`, ease: "none" });
    }
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
      // this.displayNextBatch();
    } else if (command === 'help') {
      this.appendToLog("COMMANDS: LIST, CONTINUE, CLEAR, HELP");
    } else if (command !== "") {
      this.appendToLog(`COMMAND NOT RECOGNIZED: ${command}`);
    }
  }

  render() {
    return html`
      <div class="terminal-shell">
        <div id="terminal-output">
          <div id="boot-log"></div>
          <div id="results-area">
            <slot></slot>
          </div>
        </div>

        <form @submit="${this._handleSubmit}" class="input-wrapper">
          <label for="terminal-input" class="prompt">USER@BOOK_OS:~$</label>
          <input 
            type="text" 
            id="terminal-input" 
            name="command"
            ?disabled="${!this.booted}"
            autofocus 
            autocomplete="off"
            spellcheck="false">
        </form>
      </div>
    `;
  }
}