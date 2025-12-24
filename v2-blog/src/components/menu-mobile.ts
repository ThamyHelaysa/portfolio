import { css, CSSResultGroup, html, LitElement } from "lit";
import { customElement, property, queryAssignedElements } from "lit/decorators.js";
import { adoptTailwind } from "../_helpers/styleLoader.ts";

@customElement("menu-mobile")
export class MenuMobile extends LitElement {

  @property({ type: Boolean, reflect: true })
  isOpen: boolean = false;

  @queryAssignedElements({ slot: 'trigger' })
  private _triggers!: HTMLElement[];

  static styles = css`
    button {
      background-color: transparent;
      border: none;
      box-shadow: none;
    }
  `;

  private _handleOpen() {
    this.isOpen = !this.isOpen;
    this._lockBody(this.isOpen);
  }

  private _handleClickLink(e: Event){
    // e.preventDefault();
    console.log(e)
    if (this.isOpen){
      setTimeout(() => {this._handleOpen()}, 300);
    }
  }

  async firstUpdated() {
    try {
      await adoptTailwind(this.renderRoot as ShadowRoot, "menu-mobile-shadow.css");
    } catch (e) {
      console.error('[ThemeToggle] Failed to load styles', e);
    }
  }

  _lockBody(lock = true) {
    if (!document.body) return;
    document.body.style.overflow = lock ? 'hidden' : 'initial'
  }

  render() {
    const open = this.isOpen;
    return html`
      <button
        class="btn sw:md:hidden sw:text-accent-red sw:font-sans sw:text-sm sw:font-bold sw:uppercase sw:tracking-widest sw:px-2 sw:py-1 sw:hover:opacity-70 sw:transition-opacity"
        aria-expanded="${String(open)}"
        aria-controls="mobile-menu"
        @click=${this._handleOpen}>
          Menu
      </button>
      <div
        id="mobile-menu"
        class="sw:fixed sw:inset-0 sw:z-100 sw:bg-warm-bg sw:transition-all sw:duration-500 sw:ease-in-out sw:md:hidden sw:flex sw:flex-col ${open ? 'sw:opacity-100 sw:translate-y-0' : 'sw:opacity-0 sw:-translate-y-full sw:pointer-events-none'}"
        role="dialog"
        aria-modal="true"
        aria-label="Navigation Menu"
      >
        <div class="sw:px-6 sw:py-6 sw:flex sw:justify-between sw:items-center sw:border-b sw:border-accent-red/5">
          <span class="sw:text-accent-red sw:font-serif sw:text-xl sw:tracking-tight">Menu</span>
          <button
            @click="${this._handleOpen}"
            class="btn sw:text-accent-red sw:font-sans sw:text-sm sw:font-bold sw:uppercase sw:tracking-widest sw:p-2"
            aria-label="Close menu"
          >
            Close
          </button>
        </div>

        <nav 
          class="sw:overflow-hidden sw:pb-6 sw:grow sw:flex sw:flex-col sw:justify-center" 
          @click="${this._handleClickLink}">
          <slot name="content"></slot>
          <div class="sw:pt-12 sw:px-8 sw:gap-8 sw:border-t sw:border-accent-red/5 sw:transition-all sw:duration-500 sw:delay-600 ${
            open ? 'sw:opacity-100 sw:translate-x-0' : 'sw:opacity-0 sw:-translate-x-4'
          }">
            <div class="sw:flex sw:flex-col sw:gap-3">
              <a
                href="https://www.linkedin.com/in/thamy-helaysa"
                target="_blank"
                rel="noreferrer"
                class="sw:py-3 sw:text-lg sw:font-serif sw:italic sw:text-accent-red/80 sw:hover:text-accent-red"
              >
                LinkedIn &rarr;
              </a>
              <slot name="linkedin"></slot>
              <div class="sw:py-3 sw:flex sw:items-center sw:gap-4 sw:text-accent-red">
                 <span class="sw:text-sm sw:uppercase sw:tracking-widest sw:opacity-50 ">Theme</span>
                 <theme-toggle class="hidden md:flex" data-template-id="mobile-theme-toggle-tmpl"></theme-toggle>
              </div>
            </div>
          </div>
        </nav>
      </div>
    `
  }

}
