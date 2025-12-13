import { adoptTailwind } from "./style-loader.js";

class NoteModal extends HTMLElement {

  static get observedAttributes() {
    return ['node-tmpl']
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  async connectedCallback() {
    this.shadowRoot.innerHTML = this.render();
    
    await adoptTailwind(this.shadowRoot);

    this._dialog = this.shadowRoot.querySelector('dialog');
    this.btn = this.shadowRoot.querySelector('button');
    this.btn.addEventListener('click', this.close.bind(this));
    // Close when clicking the backdrop
    this._dialog.addEventListener('click', (e) => {
      if (e.target === this._dialog) this.close();
    });
  }

  open() {
    if (this._dialog && !this._dialog.open) {
      this._dialog.showModal();
    }
  }

  close() {
    if (this._dialog && this._dialog.open) {
      this._dialog.close();
    }
    this.innerHTML = '';
    this.removeAttribute('node-tmpl');
  }

  render() {
    return `
      <dialog class="sw:will-change-transform sw:will-change-[opacity] sw:bg-transparent sw:top-1/2 sw:left-1/2 sw:translate-[-50%] sw:overflow-visible">
        <div class="sw:bg-paper sw:animate-scale-in sw:relative sw:w-full sw:max-w-md sw:aspect-square sw:md:aspect-[4/3] sw:p-8 sw:md:p-12 sw:flex sw:flex-col sw:rotate-[-1deg] sw:hover:rotate-0 sw:transition-transform sw:duration-500">
          <div class="sw:absolute sw:-top-6 sw:left-1/2 sw:-translate-x-1/2 sw:w-32 sw:h-12 sw:bg-accent-red/20 sw:opacity-80 sw:rotate-[-1deg] sw:shadow-sm sw:backdrop-blur-sm"></div>

          <header class="sw:flex sw:justify-between sw:items-start mb-8">
            <slot name="title" class="tw-warm-bg"></slot>
            <slot name="date"></slot>
          </header>

          <div class="content-area">
             <slot name="content"></slot>
          </div>

          <footer class="sw:mt-8 sw:text-center">
             <button class="sw:text-paper-text/40 sw:hover:text-accent-red sw:cursor-pointer text-xs font-sans text-paper-text/40 hover:text-accent-red uppercase tracking-widest transition-colors">Close Note</button>
          </footer>
        </div>
      </dialog>
    `;
  }

  /**
   * Called when an observed attribute has been
   * added, removed, updated, or replaced.
   * @param {String} name Attribute name
   * @param {Any} oldValue Previous value
   * @param {any} newValue Current value
   */
  attributeChangedCallback(name, oldValue, newValue) {
    if (name == "node-tmpl" && newValue) {
      const template = document.getElementById(newValue);

      if (template) {
        // 1. Clone the template content
        const content = template.content.cloneNode(true);

        // 2. Clear previous content in Light DOM
        this.innerHTML = '';

        // 3. Append new content to Light DOM
        // The Shadow DOM <slot>s defined in render() will automatically 
        // suck this content into the right places.
        this.appendChild(content);

        // 4. Auto-open the dialog when template changes
        this.open();
      } else {
        console.warn(`Template with ID "${newValue}" not found.`);
      }
      // this.templateContent = document.getElementById(newValue);
      // this.shadowRoot.appendChild(document.importNode(this.templateContent, true));
      // this.newSortingTemplate = this.renderProducts(sorting);
      // this.shadowRoot.children[0].children[0].innerHTML = this.newSortingTemplate;

    }
  }
}

customElements.define('note-modal', NoteModal);